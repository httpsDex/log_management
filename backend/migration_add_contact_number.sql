-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add contact_number (bcrypt-hashed) to repairs and borrowed_items
-- Run this once against your it_office_db database.
-- ─────────────────────────────────────────────────────────────────────────────

USE it_office_db;

-- Add to repairs table (stores bcrypt hash of the customer's contact number)
ALTER TABLE repairs
  ADD COLUMN contact_number VARCHAR(255) DEFAULT NULL
  AFTER customer_name;

-- Add to borrowed_items table (stores bcrypt hash of the borrower's contact number)
ALTER TABLE borrowed_items
  ADD COLUMN contact_number VARCHAR(255) DEFAULT NULL
  AFTER borrower_name;
