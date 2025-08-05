const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const EmailScanner = require('./email-scanner');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/jobs.db';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database(DB_PATH);

// Initialize email scanner
const emailScanner = new EmailScanner(db);

// API Routes
app.get('/api/applications', (req, res) => {
    db.all('SELECT * FROM job_applications ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/applications', (req, res) => {
    const {
        company, position, location, application_date, status,
        job_url, description, salary_range, contact_person,
        contact_email, notes
    } = req.body;

    const sql = `INSERT INTO job_applications 
                (company, position, location, application_date, status, 
                 job_url, description, salary_range, contact_person, 
                 contact_email, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [company, position, location, application_date, status,
                 job_url, description, salary_range, contact_person,
                 contact_email, notes], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID });
    });
});

app.put('/api/applications/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);

    const sql = `UPDATE job_applications SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, values, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});

app.delete('/api/applications/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM job_applications WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});

app.get('/api/emails', (req, res) => {
    db.all('SELECT * FROM email_messages ORDER BY email_date DESC LIMIT 50', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/emails/process/:id', (req, res) => {
    emailScanner.processEmail(req.params.id)
        .then(result => res.json(result))
        .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Job Tracker server running on port ${PORT}`);
    
    // Start email scanning
    emailScanner.start();
});
