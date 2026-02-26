-- ─────────────────────────────────────────────────────────────────────────────
-- IT Office Work Logging System — Database Setup
-- Run this file once to initialize your database
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS it_office_db;
USE it_office_db;

-- Users table (for reference only — credentials are stored in .env)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL
);

-- Repairs table
CREATE TABLE IF NOT EXISTS repairs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  item_type VARCHAR(100) NOT NULL,
  problem_description TEXT NOT NULL,
  received_by VARCHAR(255) NOT NULL,
  date_received DATE NOT NULL,
  repaired_by VARCHAR(255) DEFAULT NULL,
  picked_up_by VARCHAR(255) DEFAULT NULL,
  pickup_comment TEXT DEFAULT NULL,
  date_picked_up DATE DEFAULT NULL,
  status ENUM('Pending', 'Repaired', 'Unserviceable', 'Completed') NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Borrowed items table
CREATE TABLE IF NOT EXISTS borrowed_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  borrower_name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  item_borrowed VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  released_by VARCHAR(255) NOT NULL,
  date_borrowed DATE NOT NULL,
  returned_by VARCHAR(255) DEFAULT NULL,
  received_by VARCHAR(255) DEFAULT NULL,
  return_date DATE DEFAULT NULL,
  comments TEXT DEFAULT NULL,
  status ENUM('Pending', 'Returned') NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
