require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static('../frontend'));

// ─── MySQL Connection Pool ────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ─── Validation Helper ────────────────────────────────────────────────────────
const validate = (fields, body) => {
  for (const field of fields) {
    if (!body[field] || String(body[field]).trim() === '') {
      return `Field "${field}" is required`;
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const error = validate(['username', 'password'], req.body);
    if (error) return res.status(400).json({ message: error });

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPAIR ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/repairs — get all repairs
app.get('/api/repairs', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM repairs ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/repairs/:status — filter by status
app.get('/api/repairs/status/:status', authenticate, async (req, res) => {
  try {
    const { status } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM repairs WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/repairs — create new repair entry
app.post('/api/repairs', authenticate, async (req, res) => {
  try {
    const requiredFields = [
      'customer_name', 'location', 'item_name', 'quantity',
      'item_type', 'problem_description', 'received_by', 'date_received',
    ];
    const error = validate(requiredFields, req.body);
    if (error) return res.status(400).json({ message: error });

    const {
      customer_name, location, item_name, quantity,
      item_type, problem_description, received_by, date_received,
    } = req.body;

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    const [result] = await pool.query(
      `INSERT INTO repairs 
        (customer_name, location, item_name, quantity, item_type, problem_description, received_by, date_received, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [customer_name, location, item_name, quantity, item_type, problem_description, received_by, date_received, now, now]
    );

    res.status(201).json({ message: 'Repair entry created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/repairs/:id/status — update status to Repaired or Unserviceable
app.patch('/api/repairs/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, repaired_by } = req.body;

    if (!['Repaired', 'Unserviceable'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use Repaired or Unserviceable' });
    }
    if (!repaired_by || repaired_by.trim() === '') {
      return res.status(400).json({ message: 'repaired_by is required' });
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    await pool.query(
      'UPDATE repairs SET status = ?, repaired_by = ?, updated_at = ? WHERE id = ?',
      [status, repaired_by, now, id]
    );

    res.json({ message: `Repair status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/repairs/:id/pickup — complete pickup, move to history
app.patch('/api/repairs/:id/pickup', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { picked_up_by, pickup_comment, date_picked_up } = req.body;

    if (!picked_up_by || picked_up_by.trim() === '') {
      return res.status(400).json({ message: 'picked_up_by is required' });
    }

    const pickupDate = date_picked_up || moment().format('YYYY-MM-DD');
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    await pool.query(
      `UPDATE repairs 
       SET picked_up_by = ?, pickup_comment = ?, date_picked_up = ?, status = 'Completed', updated_at = ?
       WHERE id = ? AND status = 'Repaired'`,
      [picked_up_by, pickup_comment || '', pickupDate, now, id]
    );

    res.json({ message: 'Item picked up. Status set to Completed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BORROWED ITEMS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/borrowed — get all borrowed items
app.get('/api/borrowed', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM borrowed_items ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/borrowed/status/:status — filter by status
app.get('/api/borrowed/status/:status', authenticate, async (req, res) => {
  try {
    const { status } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM borrowed_items WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/borrowed — create new borrow entry
app.post('/api/borrowed', authenticate, async (req, res) => {
  try {
    const requiredFields = [
      'borrower_name', 'location', 'item_borrowed',
      'quantity', 'released_by', 'date_borrowed',
    ];
    const error = validate(requiredFields, req.body);
    if (error) return res.status(400).json({ message: error });

    const {
      borrower_name, location, item_borrowed,
      quantity, released_by, date_borrowed,
    } = req.body;

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    const [result] = await pool.query(
      `INSERT INTO borrowed_items 
        (borrower_name, location, item_borrowed, quantity, released_by, date_borrowed, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [borrower_name, location, item_borrowed, quantity, released_by, date_borrowed, now, now]
    );

    res.status(201).json({ message: 'Borrow entry created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/borrowed/:id/return — mark item as returned
app.patch('/api/borrowed/:id/return', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { returned_by, received_by, return_date, comments } = req.body;

    if (!returned_by || returned_by.trim() === '') {
      return res.status(400).json({ message: 'returned_by is required' });
    }
    if (!received_by || received_by.trim() === '') {
      return res.status(400).json({ message: 'received_by is required' });
    }

    const returnDate = return_date || moment().format('YYYY-MM-DD');
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    await pool.query(
      `UPDATE borrowed_items
       SET returned_by = ?, received_by = ?, return_date = ?, comments = ?, status = 'Returned', updated_at = ?
       WHERE id = ? AND status = 'Pending'`,
      [returned_by, received_by, returnDate, comments || '', now, id]
    );

    res.json({ message: 'Item marked as returned.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ IT Office Server running on http://localhost:${PORT}`);
});
