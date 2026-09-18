PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OFFICER',
  division TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grievances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_number TEXT UNIQUE NOT NULL,
  complainant_name TEXT NOT NULL,
  nic TEXT,
  telephone TEXT,
  email TEXT,
  address TEXT,
  district TEXT,
  source TEXT NOT NULL,
  intake_method TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  confidentiality TEXT NOT NULL DEFAULT 'Standard',
  status TEXT NOT NULL DEFAULT 'Awaiting Review',
  assigned_division TEXT,
  recipient_email TEXT,
  recipient_emails TEXT,
  attachment_name TEXT,
  attachment_url TEXT,
  attachment_size TEXT,
  attachments_json TEXT,
  assigned_officer_id INTEGER,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at TEXT,
  closed_at TEXT,
  created_by INTEGER,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_officer_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_name TEXT UNIQUE NOT NULL,
  institution_type TEXT,
  email TEXT,
  telephone TEXT,
  address TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grievance_id INTEGER NOT NULL,
  referral_type TEXT NOT NULL,
  receiving_institution_id INTEGER,
  receiving_division TEXT,
  forwarding_reference TEXT,
  forwarding_note TEXT,
  referral_status TEXT NOT NULL DEFAULT 'Forwarded',
  referred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  response_due_at TEXT,
  response_received_at TEXT,
  FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
  FOREIGN KEY (receiving_institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS case_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grievance_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  performed_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  grievance_id INTEGER,
  activity TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (grievance_id) REFERENCES grievances(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category);
CREATE INDEX IF NOT EXISTS idx_grievances_subcategory ON grievances(subcategory);
CREATE INDEX IF NOT EXISTS idx_grievances_received ON grievances(received_at DESC);
