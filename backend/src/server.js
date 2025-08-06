// backend/src/server.js

require('dotenv').config({ path: '/app/.env' });

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- Database Setup ---
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        company VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        url VARCHAR(2048),
        notes TEXT,
        date_applied DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'applied' 
      );
    `);
    console.log('Database table "jobs" is ready.');
  } catch (err) {
    console.error('Error setting up the database:', err.stack);
  } finally {
    client.release();
  }
};

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Crucial for parsing the body of POST requests

// --- API Routes ---

// GET /api/jobs - Fetch all job applications
app.get('/api/jobs', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM jobs ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching jobs:', err.stack);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

// POST /api/jobs - Create a new job application
app.post('/api/jobs', async (req, res) => {
    // --- ADDED: DETAILED LOGGING ---
    console.log('--- Received POST request on /api/jobs ---');
    console.log('Request Body:', req.body); // This will show us if the data is arriving

    const { company, title, url, notes } = req.body;

    if (!company || !title) {
        console.log('Validation failed: Company or title missing.');
        return res.status(400).json({ error: 'Company and title are required' });
    }

    try {
        console.log(`Attempting to insert: ${title} at ${company}`);
        const { rows } = await pool.query(
            'INSERT INTO jobs (company, title, url, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [company, title, url, notes]
        );
        const newJob = rows[0];
        // Defensively add the 'status' property if it doesn't exist.
        // This handles cases where the database schema might be out of sync.
        if (!newJob.status) {
            newJob.status = 'applied';
        }
        console.log('Database insertion successful! Sending back:', newJob);
        res.status(201).json(newJob);
    } catch (err) {
        console.error('Database insertion failed:', err.stack);
        res.status(500).json({ error: 'Failed to create job' });
    }
});

// Start the server and setup the database
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  setupDatabase();
});
