const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/jobs.db';
const SCHEMA_PATH = './database/schema.sql';

console.log('Setting up database...');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema, (err) => {
    if (err) {
        console.error('Error executing schema:', err);
        process.exit(1);
    }
    console.log('Database setup completed successfully');
    db.close();
});
