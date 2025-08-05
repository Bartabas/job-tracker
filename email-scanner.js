const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cron = require('node-cron');
const fs = require('fs');

class EmailScanner {
    constructor(database) {
        this.db = database;
        this.config = this.loadConfig();
        this.parsingRules = this.loadParsingRules();
        this.imap = null;
    }

    loadConfig() {
        try {
            return JSON.parse(fs.readFileSync('./config/email-config.json', 'utf8'));
        } catch (err) {
            console.warn('Email config not found, using defaults');
            return {
                user: '',
                password: '',
                host: '',
                port: 993,
                tls: true,
                enabled: false
            };
        }
    }

    loadParsingRules() {
        try {
            return JSON.parse(fs.readFileSync('./config/parsing-rules.json', 'utf8'));
        } catch (err) {
            console.warn('Parsing rules not found, using defaults');
            return {
                application_confirmation: [
                    "thank you for your application",
                    "we have received your application",
                    "application received"
                ],
                interview_invitation: [
                    "interview invitation",
                    "we would like to invite you",
                    "schedule an interview"
                ],
                job_offer: [
                    "job offer",
                    "offer of employment",
                    "we are pleased to offer",
                    "congratulations"
                ],
                rejection: [
                    "thank you for your interest",
                    "we have decided to move forward",
                    "not moving forward",
                    "position has been filled"
                ]
            };
        }
    }

    start() {
        if (!this.config.enabled) {
            console.log('Email scanning disabled in configuration');
            return;
        }

        // Schedule email scanning every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.scanEmails();
        });

        console.log('Email scanner started');
    }

    async scanEmails() {
        return new Promise((resolve, reject) => {
            this.imap = new Imap(this.config);

            this.imap.once('ready', () => {
                this.imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Search for unread emails from the last 7 days
                    const criteria = ['UNSEEN', ['SINCE', new Date(Date.now() - 7*24*60*60*1000)]];
                    
                    this.imap.search(criteria, (err, results) => {
                        if (err || !results.length) {
                            this.imap.end();
                            resolve([]);
                            return;
                        }

                        const fetch = this.imap.fetch(results, { bodies: '' });
                        const emails = [];

                        fetch.on('message', (msg, seqno) => {
                            msg.on('body', (stream) => {
                                simpleParser(stream, (err, parsed) => {
                                    if (!err) {
                                        this.processNewEmail(parsed);
                                        emails.push(parsed);
                                    }
                                });
                            });
                        });

                        fetch.once('end', () => {
                            this.imap.end();
                            resolve(emails);
                        });
                    });
                });
            });

            this.imap.once('error', reject);
            this.imap.connect();
        });
    }

    processNewEmail(email) {
        const emailType = this.classifyEmail(email.text || '');
        
        // Store email in database
        const sql = `INSERT INTO email_messages 
                    (sender, recipient, subject, body, email_date, message_id, email_type, processed) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        this.db.run(sql, [
            email.from.text,
            email.to?.text || '',
            email.subject,
            email.text,
            email.date,
            email.messageId,
            emailType,
            false
        ]);

        // Auto-process if it's a known type
        if (emailType !== 'other') {
            this.autoProcessEmail(email, emailType);
        }
    }

    classifyEmail(text) {
        const lowerText = text.toLowerCase();
        
        for (const [type, patterns] of Object.entries(this.parsingRules)) {
            for (const pattern of patterns) {
                if (lowerText.includes(pattern.toLowerCase())) {
                    return type;
                }
            }
        }
        
        return 'other';
    }

    autoProcessEmail(email, type) {
        // Extract company name from email domain or content
        const domain = email.from.text.split('@')[1];
        const company = this.extractCompanyName(email.subject, email.text, domain);
        
        if (!company) return;

        // Find existing application or create new one
        this.db.get('SELECT * FROM job_applications WHERE contact_email LIKE ?', 
                   [`%${domain}%`], (err, row) => {
            if (row) {
                // Update existing application
                this.updateApplicationStatus(row.id, type);
            } else {
                // Create new application if it's an application confirmation
                if (type === 'application_confirmation') {
                    this.createApplicationFromEmail(email, company);
                }
            }
        });
    }

    extractCompanyName(subject, body, domain) {
        // Simple heuristics to extract company name
        const domainParts = domain.split('.');
        return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
    }

    updateApplicationStatus(applicationId, emailType) {
        const statusMap = {
            'interview_invitation': 'interview',
            'job_offer': 'offer',
            'rejection': 'not_chosen'
        };

        const newStatus = statusMap[emailType];
        if (newStatus) {
            this.db.run('UPDATE job_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                       [newStatus, applicationId]);
        }
    }

    createApplicationFromEmail(email, company) {
        const position = this.extractPosition(email.subject, email.text);
        
        const sql = `INSERT INTO job_applications 
                    (company, position, status, contact_email, notes, application_date) 
                    VALUES (?, ?, 'applied', ?, 'Auto-created from email', date('now'))`;

        this.db.run(sql, [company, position, email.from.text]);
    }

    extractPosition(subject, body) {
        // Simple position extraction from subject line
        const positionKeywords = ['engineer', 'developer', 'manager', 'analyst', 'designer'];
        const words = subject.toLowerCase().split(' ');
        
        for (let i = 0; i < words.length; i++) {
            if (positionKeywords.some(keyword => words[i].includes(keyword))) {
                return words.slice(Math.max(0, i-2), i+3).join(' ');
            }
        }
        
        return 'Unknown Position';
    }
}

module.exports = EmailScanner;
