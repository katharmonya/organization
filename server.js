require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);

app.use(express.json());

// CORS: only your GitHub Pages site may call this API from a browser
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/', (req, res) => res.send('Katharmonya API is running'));

// Participant submits the form
app.post('/api/attendees', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const contact = String(req.body.contact || '').trim();
  if (!name || name.length > 100) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }
  if (!/^\+?[0-9 ()-]{7,20}$/.test(contact)) {
    return res.status(400).json({ error: 'Please enter a valid contact number.' });
  }
  try {
    await pool.query('INSERT INTO attendees (name, contact) VALUES ($1, $2)', [name, contact]);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Admin page reads the list
app.get('/api/attendees', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, contact, created_at FROM attendees ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load attendees.' });
  }
});

async function start() {
  await pool.query(`CREATE TABLE IF NOT EXISTS attendees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API running on port ${port}`));
}
start().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
