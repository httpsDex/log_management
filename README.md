# IT Office Work Logging Management System

A full-stack system to manage Repair Logs and Borrowed Items for an IT Office.

---

## Tech Stack
- **Frontend**: HTML, Tailwind CSS (CDN), Vanilla JS
- **Backend**: Node.js, Express.js
- **Database**: MySQL (mysql2)
- **Auth**: JWT (jsonwebtoken)

---

## Project Structure
```
project-root/
├── backend/
│   └── server.js         ← All backend logic
├── frontend/
│   ├── index.html        ← Login page
│   ├── dashboard.html    ← Main dashboard
│   └── js/
│       └── app.js        ← All frontend JS
├── database.sql          ← MySQL setup script
├── .env                  ← Environment config
├── package.json
└── README.md
```

---

## Step-by-Step Setup

### 1. Prerequisites
Make sure you have installed:
- Node.js (v18 or higher)
- MySQL Server (v8 or higher)

### 2. Install Dependencies
Open a terminal in the project root and run:
```bash
npm install
```

### 3. Set Up the Database
Open your MySQL client (MySQL Workbench, DBeaver, or terminal) and run:
```bash
mysql -u root -p < database.sql
```
Or paste the contents of `database.sql` directly into your SQL client and execute it.

### 4. Configure Environment
Edit the `.env` file with your actual values:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password   ← Change this
DB_NAME=it_office_db
JWT_SECRET=your_super_secret_key  ← Change this to something random
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123           ← Change this for security
```

### 5. Run the Backend Server
```bash
npm start
```
or for development with auto-restart:
```bash
npm run dev
```
You should see: `✅ IT Office Server running on http://localhost:3000`

### 6. Open the Frontend
Open `frontend/index.html` in your browser.

**Option A — Direct file**: Double-click `frontend/index.html` to open it.

**Option B — Using VS Code Live Server**: Right-click `index.html` → "Open with Live Server"

**Option C — Using a simple HTTP server** (recommended to avoid CORS issues):
```bash
cd frontend
npx serve .
```
Then go to: `http://localhost:3000` (or whichever port it shows)

---

## Login
Use the credentials from your `.env`:
- **Username**: `admin`
- **Password**: `admin123` (or whatever you set)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/login | Admin login |
| GET | /api/repairs | Get all repairs |
| POST | /api/repairs | Create new repair |
| PATCH | /api/repairs/:id/status | Update repair status |
| PATCH | /api/repairs/:id/pickup | Process pickup |
| GET | /api/borrowed | Get all borrowed items |
| POST | /api/borrowed | Create new borrow entry |
| PATCH | /api/borrowed/:id/return | Process item return |

All routes except `/api/login` require `Authorization: Bearer <token>` header.

---

## Notes
- The frontend API base URL is set to `http://localhost:3000/api` in `js/app.js`. Change this if your server runs on a different host/port.
- JWT tokens expire after 8 hours. Just log in again.
- For production, always use a strong `JWT_SECRET` and change the admin password.
