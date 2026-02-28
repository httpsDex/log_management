require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const mysql       = require('mysql2');
const bcrypt      = require('bcrypt');
const jwt         = require('jsonwebtoken');
const moment      = require('moment');
const path        = require('path');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

// Crash if JWT_SECRET is missing — never fall back to a weak default
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env. Exiting.');
  process.exit(1);
}

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Helmet — sets secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      connectSrc:  ["'self'"],
      imgSrc:      ["'self'", 'data:'],
    },
  },
}));

// CORS — allow only your dev origins
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'https://httpsdex.github.io',
  'https://log-management-3bou.onrender.com',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. same-origin, Postman during dev)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Simple request logger
const logger = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} — ${moment().format()}`);
  next();
};
app.use(logger);

// Rate limiter for login — 20 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ── Database connection ───────────────────────────────────────────────────────
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

// Promisify db.query
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

// Required fields check
const validate = (fields, body) => {
  for (const f of fields)
    if (!body[f] || String(body[f]).trim() === '') return `"${f}" is required`;
  return null;
};

// Quantity must be a whole positive integer within 1–9999
const validateQuantity = (val) => {
  const n = Number(val);
  return Number.isInteger(n) && n >= 1 && n <= 9999;
};

// Paginated response helper
const paginate = async (baseSQL, countSQL, params, req) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const countRows = await query(countSQL, params);
  const total     = countRows[0].total;
  const rows      = await query(`${baseSQL} LIMIT ? OFFSET ?`, [...params, limit, offset]);

  return { data: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// Generic 500 handler — never expose raw error to client
const serverError = (res, err) => {
  console.error(err);
  res.status(500).json({ message: 'An internal server error occurred.' });
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });
  try {
    // BINARY makes the username comparison case-sensitive
    const rows = await query('SELECT * FROM users WHERE BINARY username = ? LIMIT 1', [username]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: rows[0].username });
  } catch (err) {
    serverError(res, err);
  }
});

// ── LOOKUPS ───────────────────────────────────────────────────────────────────
app.get('/api/offices', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM offices ORDER BY name ASC', [])); }
  catch (err) { serverError(res, err); }
});

app.get('/api/employees', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM employees WHERE is_active = 1 ORDER BY full_name ASC', [])); }
  catch (err) { serverError(res, err); }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
app.get('/api/stats', auth, async (req, res) => {
  try {
    const [repairStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Pending') AS pending,
        SUM(status = 'Released') AS released,
        SUM(repair_condition = 'Fixed') AS fixed,
        SUM(repair_condition = 'Unserviceable') AS unserviceable
      FROM repairs`, []);

    const [borrowStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Pending') AS pending,
        SUM(status = 'Returned') AS returned
      FROM borrowed_items`, []);

    const [resStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Active') AS active,
        SUM(status = 'Overdue') AS overdue,
        SUM(status = 'Returned') AS returned
      FROM reservations`, []);

    const [t4eStats] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(type = 'entry') AS entries,
        SUM(type = 'session' AND time_out IS NULL) AS active_sessions,
        SUM(DATE(time_in) = CURDATE()) AS today
      FROM tech4ed`, []);

    const recentRepairs = await query(
      `SELECT 'repair' AS kind, id, customer_name AS name, item_name AS item, office, status, updated_at AS ts FROM repairs ORDER BY updated_at DESC LIMIT 5`, []);
    const recentBorrows = await query(
      `SELECT 'borrow' AS kind, id, borrower_name AS name, item_borrowed AS item, office, status, updated_at AS ts FROM borrowed_items ORDER BY updated_at DESC LIMIT 5`, []);
    const recentRes = await query(
      `SELECT 'reservation' AS kind, id, borrower_name AS name, item_name AS item, office, status, updated_at AS ts FROM reservations ORDER BY updated_at DESC LIMIT 5`, []);

    const officeData = await query(`
      SELECT office, COUNT(*) AS cnt FROM (
        SELECT office FROM repairs
        UNION ALL SELECT office FROM borrowed_items
        UNION ALL SELECT office FROM reservations
      ) t GROUP BY office ORDER BY cnt DESC LIMIT 8`, []);

    const monthlyRepairs = await query(`
      SELECT DATE_FORMAT(date_received,'%Y-%m') AS month, COUNT(*) AS cnt
      FROM repairs WHERE date_received >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month`, []);
    const monthlyBorrows = await query(`
      SELECT DATE_FORMAT(date_borrowed,'%Y-%m') AS month, COUNT(*) AS cnt
      FROM borrowed_items WHERE date_borrowed >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month`, []);
    const monthlyRes = await query(`
      SELECT DATE_FORMAT(reservation_date,'%Y-%m') AS month, COUNT(*) AS cnt
      FROM reservations WHERE reservation_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month ORDER BY month`, []);

    res.json({
      repairs:      repairStats,
      borrows:      borrowStats,
      reservations: resStats,
      tech4ed:      t4eStats,
      recent:       [...recentRepairs, ...recentBorrows, ...recentRes]
                      .sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 12),
      officeData,
      monthly: { repairs: monthlyRepairs, borrows: monthlyBorrows, reservations: monthlyRes },
    });
  } catch (err) {
    serverError(res, err);
  }
});

// ── REPAIRS ───────────────────────────────────────────────────────────────────
app.get('/api/repairs', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let baseSQL  = 'SELECT * FROM repairs';
    let countSQL = 'SELECT COUNT(*) AS total FROM repairs';
    const params = [];

    if (status) {
      baseSQL  += ' WHERE status = ?';
      countSQL += ' WHERE status = ?';
      params.push(status);
    }
    baseSQL += ' ORDER BY created_at DESC';

    res.json(await paginate(baseSQL, countSQL, params, req));
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/repairs/all', auth, async (req, res) => {
  try { res.json(await query('SELECT * FROM repairs ORDER BY created_at DESC', [])); }
  catch (err) { serverError(res, err); }
});

app.post('/api/repairs', auth, async (req, res) => {
  const validErr = validate(
    ['customer_name','office','item_name','quantity','date_received','received_by','problem_description'],
    req.body
  );
  if (validErr) return res.status(400).json({ message: validErr });
  if (!validateQuantity(req.body.quantity))
    return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 9999.' });

  const { customer_name, office, item_name, serial_specs, quantity, date_received, received_by, problem_description, contact_number } = req.body;
  const contactValue = contact_number ? String(contact_number).trim() || null : null;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const result = await query(
      `INSERT INTO repairs (customer_name, contact_number, office, item_name, serial_specs, quantity, date_received, received_by, problem_description, repair_condition, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'Pending', ?, ?)`,
      [customer_name, contactValue, office, item_name, serial_specs || null, quantity, date_received, received_by, problem_description, now, now]
    );
    res.status(201).json({ message: 'Repair entry created', id: result.insertId });
  } catch (err) {
    serverError(res, err);
  }
});

app.patch('/api/repairs/:id/condition', auth, async (req, res) => {
  const { repair_condition, repaired_by, repair_comment } = req.body;
  if (!['Fixed', 'Unserviceable'].includes(repair_condition))
    return res.status(400).json({ message: 'repair_condition must be Fixed or Unserviceable' });
  if (!repaired_by?.trim())
    return res.status(400).json({ message: 'repaired_by is required' });

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `UPDATE repairs SET repair_condition=?, repaired_by=?, repair_comment=?, updated_at=? WHERE id=? AND status='Pending'`,
      [repair_condition, repaired_by, repair_comment || null, now, req.params.id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Record not found or already released.' });
    res.json({ message: `Condition updated to ${repair_condition}` });
  } catch (err) {
    serverError(res, err);
  }
});

app.patch('/api/repairs/:id/release', auth, async (req, res) => {
  const { claimed_by, date_claimed, released_by } = req.body;
  if (!claimed_by?.trim())  return res.status(400).json({ message: 'claimed_by is required' });
  if (!released_by?.trim()) return res.status(400).json({ message: 'released_by is required' });

  const claimDate = date_claimed || moment().format('YYYY-MM-DD');
  const now       = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const rows = await query('SELECT repair_condition FROM repairs WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Record not found.' });
    if (!rows[0].repair_condition)
      return res.status(400).json({ message: 'Cannot release: repair condition not set yet.' });

    await query(
      `UPDATE repairs SET claimed_by=?, date_claimed=?, released_by=?, status='Released', updated_at=? WHERE id=? AND status='Pending'`,
      [claimed_by, claimDate, released_by, now, req.params.id]
    );
    res.json({ message: 'Item released successfully.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/repairs/:id', auth, async (req, res) => {
  const { admin_password } = req.body;
  if (!admin_password?.trim())
    return res.status(400).json({ message: 'Admin password required.' });
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found.' });
    const match = await bcrypt.compare(admin_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password.' });
    const result = await query('DELETE FROM repairs WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Repair record deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

// ── BORROWED ITEMS ────────────────────────────────────────────────────────────
app.get('/api/borrowed', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let baseSQL  = 'SELECT * FROM borrowed_items';
    let countSQL = 'SELECT COUNT(*) AS total FROM borrowed_items';
    const params = [];

    if (status) {
      baseSQL  += ' WHERE status = ?';
      countSQL += ' WHERE status = ?';
      params.push(status);
    }
    baseSQL += ' ORDER BY created_at DESC';

    res.json(await paginate(baseSQL, countSQL, params, req));
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/borrowed', auth, async (req, res) => {
  const validErr = validate(
    ['borrower_name','office','item_borrowed','quantity','released_by','date_borrowed'],
    req.body
  );
  if (validErr) return res.status(400).json({ message: validErr });
  if (!validateQuantity(req.body.quantity))
    return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 9999.' });

  const { borrower_name, office, item_borrowed, quantity, released_by, date_borrowed, contact_number } = req.body;
  const contactValue = contact_number ? String(contact_number).trim() || null : null;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const result = await query(
      `INSERT INTO borrowed_items (borrower_name, contact_number, office, item_borrowed, quantity, released_by, date_borrowed, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [borrower_name, contactValue, office, item_borrowed, quantity, released_by, date_borrowed, now, now]
    );
    res.status(201).json({ message: 'Borrow entry created', id: result.insertId });
  } catch (err) {
    serverError(res, err);
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
      `UPDATE borrowed_items SET returned_by=?, received_by=?, return_date=?, comments=?, status='Returned', updated_at=? WHERE id=? AND status='Pending'`,
      [returned_by, received_by, returnDate, comments || '', now, req.params.id]
    );
    res.json({ message: 'Item marked as returned.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/borrowed/:id', auth, async (req, res) => {
  const { admin_password } = req.body;
  if (!admin_password?.trim())
    return res.status(400).json({ message: 'Admin password required.' });
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found.' });
    const match = await bcrypt.compare(admin_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password.' });
    const result = await query('DELETE FROM borrowed_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Borrow record deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

// ── RESERVATIONS ──────────────────────────────────────────────────────────────
app.get('/api/reservations', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let baseSQL  = 'SELECT * FROM reservations';
    let countSQL = 'SELECT COUNT(*) AS total FROM reservations';
    const params = [];

    if (status) {
      if (status === 'Active') {
        baseSQL  += " WHERE status IN ('Active','Overdue')";
        countSQL += " WHERE status IN ('Active','Overdue')";
      } else {
        baseSQL  += ' WHERE status = ?';
        countSQL += ' WHERE status = ?';
        params.push(status);
      }
    }
    baseSQL += ' ORDER BY created_at DESC';

    res.json(await paginate(baseSQL, countSQL, params, req));
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/reservations', auth, async (req, res) => {
  const validErr = validate(
    ['borrower_name','office','item_name','quantity','reservation_date','expected_return_date','released_by'],
    req.body
  );
  if (validErr) return res.status(400).json({ message: validErr });
  if (!validateQuantity(req.body.quantity))
    return res.status(400).json({ message: 'Quantity must be a whole number between 1 and 9999.' });

  const { borrower_name, contact_number, office, item_name, quantity, reservation_date, expected_return_date, released_by } = req.body;

  if (expected_return_date < reservation_date)
    return res.status(400).json({ message: 'Expected return date must be after reservation date.' });

  const contactValue = contact_number ? String(contact_number).trim() || null : null;
  const now = moment().format('YYYY-MM-DD HH:mm:ss');

  try {
    const result = await query(
      `INSERT INTO reservations (borrower_name, contact_number, office, item_name, quantity, reservation_date, expected_return_date, released_by, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)`,
      [borrower_name, contactValue, office, item_name, quantity, reservation_date, expected_return_date, released_by, now, now]
    );
    res.status(201).json({ message: 'Reservation created', id: result.insertId });
  } catch (err) {
    serverError(res, err);
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
      `UPDATE reservations SET returned_by=?, received_by=?, actual_return_date=?, comments=?, status='Returned', updated_at=? WHERE id=? AND status IN ('Active','Overdue')`,
      [returned_by, received_by, returnDate, comments || '', now, req.params.id]
    );
    res.json({ message: 'Reservation marked as returned.' });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/reservations/:id', auth, async (req, res) => {
  const { admin_password } = req.body;
  if (!admin_password?.trim())
    return res.status(400).json({ message: 'Admin password required.' });
  try {
    const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'User not found.' });
    const match = await bcrypt.compare(admin_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Incorrect password.' });
    const result = await query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Record not found.' });
    res.json({ message: 'Reservation deleted.' });
  } catch (err) {
    serverError(res, err);
  }
});

// ── TECH4ED ───────────────────────────────────────────────────────────────────
app.get('/api/tech4ed', auth, async (req, res) => {
  try {
    const { type, active } = req.query;
    const conditions = [];
    const params     = [];

    if (type)         { conditions.push('type = ?');                            params.push(type); }
    if (active === '1') { conditions.push('time_out IS NULL AND type = ?');     params.push('session'); }

    let baseSQL  = 'SELECT * FROM tech4ed';
    let countSQL = 'SELECT COUNT(*) AS total FROM tech4ed';

    if (conditions.length) {
      const where = ' WHERE ' + conditions.join(' AND ');
      baseSQL  += where;
      countSQL += where;
    }
    baseSQL += ' ORDER BY time_in DESC';

    res.json(await paginate(baseSQL, countSQL, params, req));
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/tech4ed/active', auth, async (req, res) => {
  try {
    res.json(await query(`SELECT * FROM tech4ed WHERE type='session' AND time_out IS NULL ORDER BY time_in DESC`, []));
  } catch (err) {
    serverError(res, err);
  }
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
      `INSERT INTO tech4ed (name, gender, purpose, time_in, type, created_at) VALUES (?, ?, ?, ?, 'session', ?)`,
      [name.trim(), gender, purpose.trim(), now, now]
    );
    res.status(201).json({ message: 'Session started', id: result.insertId });
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/tech4ed/entry', auth, async (req, res) => {
  const validErr = validate(['name','gender','purpose'], req.body);
  if (validErr) return res.status(400).json({ message: validErr });

  const { name, gender, purpose } = req.body;
  if (!['Male','Female','Other'].includes(gender))
    return res.status(400).json({ message: 'Gender must be Male, Female, or Other' });

  const now = moment().format('YYYY-MM-DD HH:mm:ss');
  try {
    const result = await query(
      `INSERT INTO tech4ed (name, gender, purpose, time_in, type, created_at) VALUES (?, ?, ?, ?, 'entry', ?)`,
      [name.trim(), gender, purpose.trim(), now, now]
    );
    res.status(201).json({ message: 'Entry logged', id: result.insertId });
  } catch (err) {
    serverError(res, err);
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
    serverError(res, err);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`ITSS Office Server running on http://localhost:${PORT}`));
