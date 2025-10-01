-- Customer Service Queue and Ticketing System Database Schema

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customer_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    category TEXT,
    assigned_to TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create queue table for managing ticket queue
CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    enqueued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- Create ticket_history table for tracking changes
CREATE TABLE IF NOT EXISTS ticket_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- Create users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('CustomerService', 'Supervisor', 'ADMIN')) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create password_reset_requests table
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'completed')) NOT NULL DEFAULT 'pending',
    reset_token TEXT,
    token_expires_at DATETIME,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_queue_position ON queue(position);

-- Admission System Tables

-- pipelines: satu jalur PSB per tahun ajaran
CREATE TABLE IF NOT EXISTS pipelines (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  year          INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- steps: daftar langkah per pipeline (urut pakai "ord")
CREATE TABLE IF NOT EXISTS steps (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_id   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  ord           INTEGER NOT NULL,            -- urutan kolom di kanban
  is_final      INTEGER NOT NULL DEFAULT 0,  -- 0/1
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  UNIQUE(pipeline_id, slug),
  UNIQUE(pipeline_id, ord)                   -- jaga satu ord per pipeline
);

-- step_requirements: dokumen wajib per step (key bebas: 'formulir','buktiPembelian', dll)
CREATE TABLE IF NOT EXISTS step_requirements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id       INTEGER NOT NULL,
  doc_key       TEXT NOT NULL,
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  UNIQUE(step_id, doc_key)
);

-- applicants: kandidat
CREATE TABLE IF NOT EXISTS applicants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  pipeline_id   INTEGER NOT NULL,
  current_step_id INTEGER NOT NULL,
  name          TEXT NOT NULL,
  nisn          TEXT,
  birthdate     TEXT,
  parent_phone  TEXT,
  email         TEXT,
  address       TEXT,
  notes         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  FOREIGN KEY (current_step_id) REFERENCES steps(id)
);

-- applicant_documents: dokumen yang sudah diunggah kandidat
CREATE TABLE IF NOT EXISTS applicant_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id  INTEGER NOT NULL,
  doc_key       TEXT NOT NULL,       -- harus sama dengan yang diminta di step_requirements
  filename      TEXT,
  url           TEXT,
  mime          TEXT,
  uploaded_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  UNIQUE(applicant_id, doc_key)
);

-- applicant_history: jejak perpindahan step
CREATE TABLE IF NOT EXISTS applicant_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id  INTEGER NOT NULL,
  from_step_id  INTEGER,
  to_step_id    INTEGER NOT NULL,
  by_admin_id   INTEGER NOT NULL,
  note          TEXT,
  at            TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE
);

-- step_dynamic_details: dynamic details per step (can be added/removed freely)
CREATE TABLE IF NOT EXISTS step_dynamic_details (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id       INTEGER NOT NULL,
  key           TEXT NOT NULL,
  type          TEXT NOT NULL,  -- e.g., 'text', 'checkbox', 'select'
  required      INTEGER NOT NULL DEFAULT 0,  -- 0 optional, 1 required
  label         TEXT NOT NULL,
  options       TEXT,  -- comma-separated options for 'select' type
  FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
  UNIQUE(step_id, key)
);

-- applicant_dynamic_details: applicant responses to dynamic details
CREATE TABLE IF NOT EXISTS applicant_dynamic_details (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  applicant_id  INTEGER NOT NULL,
  detail_key    TEXT NOT NULL,  -- should match step_dynamic_details.key for the step
  value         TEXT,  -- for text, or 'true'/'false' for checkbox
  FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
  UNIQUE(applicant_id, detail_key)
);

-- index yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_steps_pipeline ON steps(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_applicants_pipeline ON applicants(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_appdocs_applicant ON applicant_documents(applicant_id);
CREATE INDEX IF NOT EXISTS idx_history_applicant ON applicant_history(applicant_id);
CREATE INDEX IF NOT EXISTS idx_step_dynamic_details_step ON step_dynamic_details(step_id);
CREATE INDEX IF NOT EXISTS idx_applicant_dynamic_details_applicant ON applicant_dynamic_details(applicant_id);
