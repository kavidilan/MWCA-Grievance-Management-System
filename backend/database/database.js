const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'grievances.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const db = new DatabaseSync(databasePath);

async function initializeDatabase() {
  const tableExists = !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'grievances'").get();

  if (!tableExists) {
    db.exec(fs.readFileSync(schemaPath, 'utf8'));
  }

  const existingColumns = db.prepare('PRAGMA table_info(grievances)').all();
  const existingNames = new Set(existingColumns.map(column => column.name));

  const columnsToAdd = [
    'subcategory TEXT',
    'recipient_email TEXT',
    'recipient_emails TEXT',
    'attachment_name TEXT',
    'attachment_url TEXT',
    'attachment_size TEXT',
    'attachments_json TEXT'
  ];

  for (const colDef of columnsToAdd) {
    const columnName = colDef.split(' ')[0];
    if (!existingNames.has(columnName)) {
      try {
        db.exec(`ALTER TABLE grievances ADD COLUMN ${colDef}`);
      } catch (err) {
        // Ignore if migration doesn't apply cleanly
      }
    }
  }

  const finalNames = new Set(db.prepare('PRAGMA table_info(grievances)').all().map(column => column.name));
  if (finalNames.has('subcategory')) {
    db.exec('CREATE INDEX IF NOT EXISTS idx_grievances_subcategory ON grievances(subcategory)');
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_grievances_received ON grievances(received_at DESC)');

  try {
    db.exec("UPDATE grievances SET category = 'Child', subcategory = 'Child Protection & Safety' WHERE category = 'Child Protection'");
    db.exec("UPDATE grievances SET category = 'Women', subcategory = 'Abuse / Domestic Violence' WHERE category = 'Women’s Welfare'");
    db.exec("UPDATE grievances SET category = 'General / Other', subcategory = 'General Inquiry' WHERE category IN ('Other', 'Financial Assistance')");
    db.exec("UPDATE grievances SET due_at = datetime(received_at, '+7 days') WHERE due_at IS NULL OR due_at = received_at OR due_at = created_at");
  } catch (err) {
    // Migration ignore
  }
}

function sanitizeParams(params = []) {
  return params.map(p => (p === undefined ? null : p));
}

async function all(sql, params = []) {
  return db.prepare(sql).all(...sanitizeParams(params));
}

async function get(sql, params = []) {
  return db.prepare(sql).get(...sanitizeParams(params));
}

async function run(sql, params = []) {
  const result = db.prepare(sql).run(...sanitizeParams(params));
  return { id: Number(result.lastInsertRowid), changes: Number(result.changes) };
}

module.exports = { db, initializeDatabase, all, get, run, databasePath };
