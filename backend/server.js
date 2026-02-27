require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mysql    = require('mysql');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const moment   = require('moment');
const path     = require('path');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const logger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} — ${moment().format()}`);
  next();
};
app.use(logger);

// ─── DB Connection ────────────────────────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'it_office_db',
});

db.connect((err) => {
  if (err) { console.error('MySQL connection failed:', err); return; }
  console.log('MySQL connected!');
  runMigrations();
});

// ─── Auto-run Migrations ──────────────────────────────────────────────────────
// Safely adds contact_number column to both tables if it does not already exist.
function runMigrations() {
  const migrations = [
    {
      check: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME   = 'repairs'
                AND COLUMN_NAME  = 'contact_number'`,
      run:   `ALTER TABLE repairs
              ADD COLUMN contact_number VARCHAR(255) DEFAULT NULL AFTER customer_name`,
      label: 'repairs.contact_number',
    },
    {
      check: `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME   = 'borrowed_items'
                AND COLUMN_NAME  = 'contact_number'`,
      run:   `ALTER TABLE borrowed_items
              ADD COLUMN contact_number VARCHAR(255) DEFAULT NULL AFTER borrower_name`,
      label: 'borrowed_items.contact_number',
    },
  ];

  migrations.forEach(({ check, run, label }) => {
    db.query(check, (err, rows) => {
      if (err) { console.error(`Migration check failed [${label}]:`, err.message); return; }
      if (rows.length === 0) {
        db.query(run, (err2) => {
          if (err2) console.error(`Migration failed [${label}]:`, err2.message);
          else      console.log(`Migration applied: column added — ${label}`);
        });
      } else {
        console.log(`Column already exists: ${label}`);
      }
    });
  });
}

// ─── Promisified query ────────────────────────────────────────────────────────
const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => err ? reject(err) : resolve(results))
  );

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const validate = (fields, body) => {
  for (const f of fields)
    if (!body[f] || String(body[f]).trim() === '') return `"${f}" is required`;
  return null;
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });
  try {
    const rows = await query('SELECT * FROM users WHERE username = ? LIMIT 1', [username]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: rows[0].username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── LOOKUPS ──────────────────────────────────────────────────────────────────

app.get('/api/offices', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM offices ORDER BY name ASC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.get('/api/employees', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM employees WHERE is_active = 1 ORDER BY full_name ASC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

// ─── REPAIRS ──────────────────────────────────────────────────────────────────

app.get('/api/repairs', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM repairs ORDER BY created_at DESC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.post('/api/repairs', auth, async (req, res) => {
  const validErr = validate(
    ['customer_name','office','item_name','quantity','date_received','received_by','problem_description'],
    req.body
  );
  if (validErr) return res.status(400).json({ message: validErr });

  const {
    customer_name, office, item_name, serial_specs,
    quantity, date_received, received_by, problem_description,
    contact_number,
  } = req.body;

  let hashedContact = null;
  const raw = contact_number ? String(contact_number).trim() : '';
  if (raw !== '') {
    hashedContact = await bcrypt.hash(raw, 10);
    console.log('Contact number hashed for repair entry');
  }

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `INSERT INTO repairs
         (customer_name, contact_number, office, item_name, serial_specs,
          quantity, date_received, received_by, problem_description,
          status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [customer_name, hashedContact, office, item_name, serial_specs || null,
       quantity, date_received, received_by, problem_description, now, now]
    );
    res.status(201).json({ message: 'Repair entry created', id: result.insertId });
  } catch (err) {
    console.error('INSERT repairs error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.patch('/api/repairs/:id/status', auth, async (req, res) => {
  const { status, repaired_by, repair_comment } = req.body;
  if (!['Fixed','Unserviceable'].includes(status))
    return res.status(400).json({ message: 'Status must be Fixed or Unserviceable' });
  if (!repaired_by?.trim())
    return res.status(400).json({ message: 'repaired_by is required' });
  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    await query(
      `UPDATE repairs SET status=?, repaired_by=?, repair_comment=?, updated_at=?
       WHERE id=? AND status='Pending'`,
      [status, repaired_by, repair_comment || null, now, req.params.id]
    );
    res.json({ message: `Status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.patch('/api/repairs/:id/release', auth, async (req, res) => {
  const { claimed_by, date_claimed, released_by } = req.body;
  if (!claimed_by?.trim())  return res.status(400).json({ message: 'claimed_by is required' });
  if (!released_by?.trim()) return res.status(400).json({ message: 'released_by is required' });
  const claimDate = date_claimed || moment().format('YYYY-MM-DD');
  const now       = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    await query(
      `UPDATE repairs SET claimed_by=?, date_claimed=?, released_by=?, status='Released', updated_at=?
       WHERE id=? AND status IN ('Fixed','Unserviceable')`,
      [claimed_by, claimDate, released_by, now, req.params.id]
    );
    res.json({ message: 'Item released successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── BORROWED ITEMS ───────────────────────────────────────────────────────────

app.get('/api/borrowed', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM borrowed_items ORDER BY created_at DESC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.post('/api/borrowed', auth, async (req, res) => {
  const validErr = validate(
    ['borrower_name','office','item_borrowed','quantity','released_by','date_borrowed'],
    req.body
  );
  if (validErr) return res.status(400).json({ message: validErr });

  const {
    borrower_name, office, item_borrowed,
    quantity, released_by, date_borrowed,
    contact_number,
  } = req.body;

  let hashedContact = null;
  const raw = contact_number ? String(contact_number).trim() : '';
  if (raw !== '') {
    hashedContact = await bcrypt.hash(raw, 10);
    console.log('Contact number hashed for borrow entry');
  }

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `INSERT INTO borrowed_items
         (borrower_name, contact_number, office, item_borrowed,
          quantity, released_by, date_borrowed,
          status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [borrower_name, hashedContact, office, item_borrowed,
       quantity, released_by, date_borrowed, now, now]
    );
    res.status(201).json({ message: 'Borrow entry created', id: result.insertId });
  } catch (err) {
    console.error('INSERT borrowed_items error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.patch('/api/borrowed/:id/return', auth, async (req, res) => {
  const { returned_by, received_by, return_date, comments } = req.body;
  if (!returned_by?.trim()) return res.status(400).json({ message: 'returned_by is required' });
  if (!received_by?.trim()) return res.status(400).json({ message: 'received_by is required' });
  const returnDate = return_date || moment().format('YYYY-MM-DD');
  const now        = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    await query(
      `UPDATE borrowed_items
       SET returned_by=?, received_by=?, return_date=?, comments=?, status='Returned', updated_at=?
       WHERE id=? AND status='Pending'`,
      [returned_by, received_by, returnDate, comments || '', now, req.params.id]
    );
    res.json({ message: 'Item marked as returned.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`IT Office Server running on http://localhost:${PORT}`));
