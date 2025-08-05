-- Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    location TEXT,
    application_date DATE,
    status TEXT CHECK(status IN ('applied', 'interview', 'offer', 'not_chosen')) DEFAULT 'applied',
    job_url TEXT,
    description TEXT,
    salary_range TEXT,
    contact_person TEXT,
    contact_email TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Email Messages Table
CREATE TABLE IF NOT EXISTS email_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_application_id INTEGER,
    sender TEXT,
    recipient TEXT,
    subject TEXT,
    body TEXT,
    email_date DATETIME,
    message_id TEXT UNIQUE,
    email_type TEXT CHECK(email_type IN ('application_confirmation', 'interview_invitation', 'job_offer', 'rejection', 'other')) DEFAULT 'other',
    processed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_application_id) REFERENCES job_applications (id)
);

-- Email Parsing Rules Table
CREATE TABLE IF NOT EXISTS parsing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name TEXT NOT NULL,
    email_pattern TEXT NOT NULL,
    status_update TEXT,
    priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_date ON job_applications(application_date);
CREATE INDEX IF NOT EXISTS idx_emails_date ON email_messages(email_date);
CREATE INDEX IF NOT EXISTS idx_emails_processed ON email_messages(processed);
