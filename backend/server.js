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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const logger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} — ${moment().format()}`);
  next();
};
app.use(logger);

// ── DB ────────────────────────────────────────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'it_office_db',
});

db.connect((err) => {
  if (err) { console.error('MySQL connection failed:', err); return; }
  console.log('MySQL connected!');
});

const query = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) => err ? reject(err) : resolve(results))
  );

// ── Auth middleware ───────────────────────────────────────────────────────────
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

// ── LOGIN ─────────────────────────────────────────────────────────────────────
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

// ── LOOKUPS ───────────────────────────────────────────────────────────────────
app.get('/api/offices', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM offices ORDER BY name ASC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.get('/api/employees', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM employees WHERE is_active = 1 ORDER BY full_name ASC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

// ── REPAIRS ───────────────────────────────────────────────────────────────────
// status        = 'Pending' | 'Released'      → lifecycle stage
// repair_condition = 'Fixed' | 'Unserviceable' | NULL  → what happened to it

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
    quantity, date_received, received_by, problem_description, contact_number,
  } = req.body;

  const contactValue = contact_number ? String(contact_number).trim() || null : null;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const result = await query(
      `INSERT INTO repairs
         (customer_name, contact_number, office, item_name, serial_specs,
          quantity, date_received, received_by, problem_description,
          repair_condition, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'Pending', ?, ?)`,
      [customer_name, contactValue, office, item_name, serial_specs || null,
       quantity, date_received, received_by, problem_description, now, now]
    );
    res.status(201).json({ message: 'Repair entry created', id: result.insertId });
  } catch (err) {
    console.error('INSERT repairs error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update repair_condition (Fixed or Unserviceable) — does NOT change status
// status stays 'Pending' until item is physically released
app.patch('/api/repairs/:id/condition', auth, async (req, res) => {
  const { repair_condition, repaired_by, repair_comment } = req.body;

  if (!['Fixed', 'Unserviceable'].includes(repair_condition))
    return res.status(400).json({ message: 'repair_condition must be Fixed or Unserviceable' });
  if (!repaired_by?.trim())
    return res.status(400).json({ message: 'repaired_by is required' });

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `UPDATE repairs
       SET repair_condition=?, repaired_by=?, repair_comment=?, updated_at=?
       WHERE id=? AND status='Pending'`,
      [repair_condition, repaired_by, repair_comment || null, now, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Record not found or already released.' });
    res.json({ message: `Condition updated to ${repair_condition}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Release — sets status to 'Released', requires repair_condition to already be set
app.patch('/api/repairs/:id/release', auth, async (req, res) => {
  const { claimed_by, date_claimed, released_by } = req.body;
  if (!claimed_by?.trim())  return res.status(400).json({ message: 'claimed_by is required' });
  if (!released_by?.trim()) return res.status(400).json({ message: 'released_by is required' });

  const claimDate = date_claimed || moment().format('YYYY-MM-DD');
  const now       = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    // Ensure repair_condition is set before releasing
    const rows = await query('SELECT repair_condition FROM repairs WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Record not found.' });
    if (!rows[0].repair_condition)
      return res.status(400).json({ message: 'Cannot release: repair condition (Fixed/Unserviceable) has not been set yet.' });

    await query(
      `UPDATE repairs
       SET claimed_by=?, date_claimed=?, released_by=?, status='Released', updated_at=?
       WHERE id=? AND status='Pending'`,
      [claimed_by, claimDate, released_by, now, req.params.id]
    );
    res.json({ message: 'Item released successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/repairs/:id', auth, async (req, res) => {
  const { admin_password } = req.body;
  if (!admin_password?.trim())
    return res.status(400).json({ message: 'Admin password is required to delete a record.' });
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found.' });
    const match = await bcrypt.compare(admin_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password. Deletion cancelled.' });
    const result = await query('DELETE FROM repairs WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Repair record deleted successfully.' });
  } catch (err) {
    console.error('DELETE repair error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── BORROWED ITEMS ────────────────────────────────────────────────────────────
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
    quantity, released_by, date_borrowed, contact_number,
  } = req.body;

  const contactValue = contact_number ? String(contact_number).trim() || null : null;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const result = await query(
      `INSERT INTO borrowed_items
         (borrower_name, contact_number, office, item_borrowed,
          quantity, released_by, date_borrowed, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [borrower_name, contactValue, office, item_borrowed,
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

app.delete('/api/borrowed/:id', auth, async (req, res) => {
  const { admin_password } = req.body;
  if (!admin_password?.trim())
    return res.status(400).json({ message: 'Admin password is required to delete a record.' });
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found.' });
    const match = await bcrypt.compare(admin_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password. Deletion cancelled.' });
    const result = await query('DELETE FROM borrowed_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Borrow record deleted successfully.' });
  } catch (err) {
    console.error('DELETE borrowed error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── RESERVATIONS ──────────────────────────────────────────────────────────────
app.get('/api/reservations', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM reservations ORDER BY created_at DESC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.post('/api/reservations', auth, async (req, res) => {
  const validErr = validate(
    ['borrower_name','office','item_name','quantity','reservation_date','expected_return_date','released_by'],
    req.body
  );
  if (validErr) return res.status(400).json({ message: validErr });

  const {
    borrower_name, contact_number, office, item_name,
    quantity, reservation_date, expected_return_date, released_by,
  } = req.body;

  if (expected_return_date < reservation_date)
    return res.status(400).json({ message: 'Expected return date must be after reservation date.' });

  const contactValue = contact_number ? String(contact_number).trim() || null : null;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const result = await query(
      `INSERT INTO reservations
         (borrower_name, contact_number, office, item_name, quantity,
          reservation_date, expected_return_date, released_by,
          status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)`,
      [borrower_name, contactValue, office, item_name, quantity,
       reservation_date, expected_return_date, released_by, now, now]
    );
    res.status(201).json({ message: 'Reservation created', id: result.insertId });
  } catch (err) {
    console.error('INSERT reservations error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.patch('/api/reservations/:id/return', auth, async (req, res) => {
  const { returned_by, received_by, actual_return_date, comments } = req.body;
  if (!returned_by?.trim()) return res.status(400).json({ message: 'returned_by is required' });
  if (!received_by?.trim()) return res.status(400).json({ message: 'received_by is required' });
  const returnDate = actual_return_date || moment().format('YYYY-MM-DD');
  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    await query(
      `UPDATE reservations
       SET returned_by=?, received_by=?, actual_return_date=?, comments=?, status='Returned', updated_at=?
       WHERE id=? AND status IN ('Active','Overdue')`,
      [returned_by, received_by, returnDate, comments || '', now, req.params.id]
    );
    res.json({ message: 'Reservation marked as returned.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/reservations/:id', auth, async (req, res) => {
  const { admin_password } = req.body;
  if (!admin_password?.trim())
    return res.status(400).json({ message: 'Admin password is required to delete a record.' });
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found.' });
    const match = await bcrypt.compare(admin_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password. Deletion cancelled.' });
    const result = await query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Reservation deleted successfully.' });
  } catch (err) {
    console.error('DELETE reservation error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── TECH4ED ───────────────────────────────────────────────────────────────────
app.get('/api/tech4ed', auth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM tech4ed
       WHERE DATE(time_in) = CURDATE() OR time_out IS NULL
       ORDER BY time_in DESC`,
      []
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/tech4ed/all', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM tech4ed ORDER BY time_in DESC', [])); }
  catch (err) { res.status(500).json({ message: 'Server error', error: err.message }); }
});

app.post('/api/tech4ed', auth, async (req, res) => {
  const validErr = validate(['name','gender','purpose'], req.body);
  if (validErr) return res.status(400).json({ message: validErr });

  const { name, gender, purpose } = req.body;
  if (!['Male','Female','Other'].includes(gender))
    return res.status(400).json({ message: 'Gender must be Male, Female, or Other' });

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `INSERT INTO tech4ed (name, gender, purpose, time_in, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), gender, purpose.trim(), now, now]
    );
    res.status(201).json({ message: 'Session started', id: result.insertId });
  } catch (err) {
    console.error('INSERT tech4ed error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.patch('/api/tech4ed/:id/timeout', auth, async (req, res) => {
  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `UPDATE tech4ed SET time_out=? WHERE id=? AND time_out IS NULL`,
      [now, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(400).json({ message: 'Session not found or already timed out.' });
    res.json({ message: 'Time out recorded.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`IT Office Server running on http://localhost:${PORT}`));
