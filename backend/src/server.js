// backend/src/server.js

// This line is crucial for Docker to find the .env file in the root directory
require('dotenv').config({ path: '/app/.env' });

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Create the Express app
const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Connection ---
// The Pool will use the DATABASE_URL environment variable automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing for the frontend
app.use(express.json()); // Enable parsing of JSON in request bodies

// --- API Routes ---

// A simple test route to check database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    res.json({
      message: 'Database connection successful!',
      time: result.rows[0].now,
    });
    client.release();
  } catch (err) {
    console.error('Database connection error', err.stack);
    res.status(500).json({ error: 'Failed to connect to database' });
  }
});

// A simple root route to confirm the server is running
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Job Tracker API!' });
});

// TODO: We will add the /api/jobs routes here later.

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
