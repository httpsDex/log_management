-- ─────────────────────────────────────────────────────────────────────────────
-- IT Office Work Logging System — Normalized Database
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS it_office_db;
USE it_office_db;

-- ─── Lookup: Offices ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offices (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE
);

INSERT IGNORE INTO offices (name) VALUES
  ('Office of the Director'),
  ('Administrative Division'),
  ('Finance Division'),
  ('Human Resource Division'),
  ('IT Division'),
  ('Planning Division'),
  ('Records Division'),
  ('Legal Division');

-- ─── Lookup: Employees ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  full_name  VARCHAR(255) NOT NULL UNIQUE,
  is_active  TINYINT(1) NOT NULL DEFAULT 1
);

INSERT IGNORE INTO employees (full_name) VALUES
  ('Juan dela Cruz'),
  ('Maria Santos'),
  ('Jose Reyes'),
  ('Ana Garcia'),
  ('Pedro Bautista');

-- ─── Users (login) ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id       INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL   -- bcrypt hash
);

-- ─── Repairs ─────────────────────────────────────────────────────────────────
-- office and received_by/released_by store the display name string
-- so records stay intact even if lookup data changes later
CREATE TABLE IF NOT EXISTS repairs (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  customer_name       VARCHAR(255) NOT NULL,
  office              VARCHAR(255) NOT NULL,   -- from offices lookup or custom
  item_name           VARCHAR(255) NOT NULL,
  serial_specs        VARCHAR(255) DEFAULT NULL, -- model/specs e.g. "L3210"
  quantity            INT NOT NULL DEFAULT 1,
  date_received       DATE NOT NULL,
  received_by         VARCHAR(255) NOT NULL,   -- employee name or "OJT: <name>"
  problem_description TEXT NOT NULL,
  repaired_by         VARCHAR(255) DEFAULT NULL,
  repair_comment      TEXT DEFAULT NULL,
  claimed_by          VARCHAR(255) DEFAULT NULL,
  date_claimed        DATE DEFAULT NULL,
  released_by         VARCHAR(255) DEFAULT NULL,
  status              ENUM('Pending','Fixed','Unserviceable','Released') NOT NULL DEFAULT 'Pending',
  created_at          DATETIME NOT NULL,
  updated_at          DATETIME NOT NULL
);

-- ─── Borrowed Items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS borrowed_items (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  borrower_name VARCHAR(255) NOT NULL,
  office        VARCHAR(255) NOT NULL,   -- from offices lookup or custom
  item_borrowed VARCHAR(255) NOT NULL,
  quantity      INT NOT NULL DEFAULT 1,
  released_by   VARCHAR(255) NOT NULL,  -- employee name or "Other: <name>"
  date_borrowed DATE NOT NULL,
  returned_by   VARCHAR(255) DEFAULT NULL,
  received_by   VARCHAR(255) DEFAULT NULL, -- employee name or "OJT: <name>"
  return_date   DATE DEFAULT NULL,
  comments      TEXT DEFAULT NULL,
  status        ENUM('Pending','Returned') NOT NULL DEFAULT 'Pending',
  created_at    DATETIME NOT NULL,
  updated_at    DATETIME NOT NULL
);