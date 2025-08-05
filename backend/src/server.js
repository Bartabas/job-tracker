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
// These must be placed BEFORE the route definitions.
app.use(cors());
app.use(express.json()); // This is crucial for parsing the body of POST requests

// --- API Routes (Simplified) ---
// We now attach the routes directly to the 'app' object.

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
    const { company, title, url, notes } = req.body;

    if (!company || !title) {
        return res.status(400).json({ error: 'Company and title are required' });
    }

    try {
        const { rows } = await pool.query(
            'INSERT INTO jobs (company, title, url, notes) VALUES ($1, $2, $3, $4) RETURNING *',
            [company, title, url, notes]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating job:', err.stack);
        res.status(500).json({ error: 'Failed to create job' });
    }
});

// Start the server and setup the database
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  setupDatabase();
});
