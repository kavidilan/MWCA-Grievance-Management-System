const express = require('express');
const nodemailer = require('nodemailer');
const { all, get, run } = require('../database/database');
const { authenticate, authorize } = require('../auth');
const router = express.Router();

const statuses = ['Awaiting Review', 'Assigned', 'Forwarded', 'Resolved', 'Closed'];
const priorities = ['Normal', 'High', 'Critical'];
const categories = ['Women', 'Child', 'General / Other'];
const subcategories = {
  Women: [
    'Abuse / Domestic Violence',
    'Financial Assistance',
    'Maintenance & Family Disputes',
    'Legal Aid & Rights',
    'Employment & Workplace Harassment',
    'Health & Psychosocial Support',
    'Cyber Harassment',
    "Other Women's Issues"
  ],
  Child: [
    'Child Abuse & Exploitation',
    'Financial & Educational Support',
    'Early Childhood Development & Pre-School',
    'Probation & Custody Services',
    'Child Protection & Safety',
    'Child Labor & Trafficking',
    "Other Child Issues"
  ],
  'General / Other': [
    'General Inquiry',
    'Administrative Complaint',
    'Policy & Service Feedback',
    'Other'
  ]
};
const departments = [
  "Minister's Office",
  'Secretary Office',
  'Financial',
  'Development Branch',
  'Planning Division',
  'Child Secretariat Office',
  "Women's Bureau",
  'National Commission On Women',
  'National Child Protection Authority',
  'Department of Probation and Child Care Service'
];

async function getMailTransporterAsync(allowSimulation = false) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const hasPlaceholders = !user || !pass || /your-|example|password/i.test(user) || /your-|example|password/i.test(pass);
  if (hasPlaceholders) {
    if (allowSimulation) {
      return {
        transporter: {
          sendMail: async (options) => {
            console.log('📧 [SIMULATED EMAIL DISPATCH]', { to: options.to, subject: options.subject, attachmentsCount: options.attachments?.length });
            return { messageId: `simulated-${Date.now()}` };
          }
        },
        isTestAccount: true,
        fromUser: user || 'system@mwca.gov.lk'
      };
    }
    const error = new Error('SMTP is not configured. Click "⚙ Email Settings" to configure your sender email and Google App Password, or check "Simulate email dispatch".');
    error.status = 503;
    throw error;
  }

  const isGmail = host.includes('gmail') || user.endsWith('@gmail.com');
  const config = isGmail ? {
    service: 'gmail',
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  } : {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  };

  return { transporter: nodemailer.createTransport(config), isTestAccount: false, fromUser: process.env.MAIL_FROM || user };
}

function attachmentFromRow(row) {
  if (!row.attachment_name || !row.attachment_url) return undefined;
  const match = String(row.attachment_url).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return undefined;
  return { filename: row.attachment_name, contentType: match[1], content: Buffer.from(match[2], 'base64') };
}

function parseRecipientEmails(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[;,\n]/);
  return [...new Set(values.map(email => String(email).trim()).filter(Boolean))];
}

function attachmentsFromRow(row) {
  let attachments = [];
  try { attachments = row.attachments_json ? JSON.parse(row.attachments_json) : []; } catch (error) { attachments = []; }
  return attachments.map(attachment => {
    const match = String(attachment.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
    if (!match || !attachment.name) return null;
    return { filename: attachment.name, contentType: attachment.contentType || match[1], content: Buffer.from(match[2], 'base64') };
  }).filter(Boolean);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAllAttachmentsFromRow(row, prefixRef = false) {
  const result = [];
  const seenNames = new Set();
  const refPrefix = prefixRef && row.reference_number ? `${String(row.reference_number).replace(/[/\\?%*:|"<>]/g, '-')}_` : '';

  const singleAtt = attachmentFromRow(row);
  if (singleAtt) {
    seenNames.add(singleAtt.filename);
    result.push({ ...singleAtt, filename: `${refPrefix}${singleAtt.filename}` });
  }

  const multiAtts = attachmentsFromRow(row);
  for (const att of multiAtts) {
    if (!seenNames.has(att.filename)) {
      seenNames.add(att.filename);
      result.push({ ...att, filename: `${refPrefix}${att.filename}` });
    }
  }

  return result;
}

function summaryAttachment(row, targetDept, note) {
  const lines = [
    ['File No', row.reference_number],
    ['Date', row.received_at],
    ['Status', 'Forwarded'],
    ['Category', `${row.category} / ${row.subcategory || 'Not specified'}`],
    ['Heading Of the Letter', row.subject],
    ['Sent by', row.complainant_name],
    ['Forwarded to', targetDept],
    ['Action requested', note || 'Please assess and process this grievance.'],
    ['Description', row.description]
  ];
  const csv = lines.map(([label, value]) => `${label},"${String(value || '').replaceAll('"', '""')}"`).join('\n');
  return { filename: `${row.reference_number.replaceAll('/', '-')}-summary.csv`, contentType: 'text/csv', content: Buffer.from(csv, 'utf8') };
}

router.use(authenticate);

function updateEnvFile(newVars) {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  let content = '';
  try { content = fs.readFileSync(envPath, 'utf8'); } catch (err) { content = ''; }

  const lines = content.split('\n');
  const envObj = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        envObj[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }

  for (const [k, v] of Object.entries(newVars)) {
    if (v !== undefined && v !== null) {
      envObj[k] = String(v).trim();
      process.env[k] = String(v).trim();
    }
  }

  const newContent = Object.entries(envObj).map(([k, v]) => `${k}=${v}`).join('\n');
  fs.writeFileSync(envPath, newContent, 'utf8');
}

router.get('/smtp', (req, res) => {
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const isPlaceholder = !user || !pass || /your-|example|password/i.test(user) || /your-|example|password/i.test(pass);

  res.json({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user: isPlaceholder ? '' : user,
    mailFrom: process.env.MAIL_FROM || (isPlaceholder ? '' : user),
    isConfigured: !isPlaceholder,
    hasPassword: Boolean(pass && !isPlaceholder)
  });
});

router.post('/smtp', authorize('ADMIN'), (req, res) => {
  try {
    const { host, port, user, pass, mailFrom } = req.body;
    if (!user) return res.status(400).json({ message: 'SMTP User Email is required.' });

    const newVars = {
      SMTP_HOST: (host || 'smtp.gmail.com').trim(),
      SMTP_PORT: String(port || 465).trim(),
      SMTP_USER: user.trim(),
      MAIL_FROM: (mailFrom || user).trim()
    };

    if (pass && pass.trim()) {
      newVars.SMTP_PASS = pass.replace(/\s+/g, '');
    }

    updateEnvFile(newVars);

    res.json({
      message: 'SMTP settings updated successfully.',
      isConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS && !/your-|example|password/i.test(process.env.SMTP_USER)),
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: process.env.SMTP_USER,
      mailFrom: process.env.MAIL_FROM
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update SMTP settings.' });
  }
});

router.post('/smtp/test', authorize('ADMIN'), async (req, res) => {
  try {
    const { host, port, user, pass, mailFrom, testEmail } = req.body;

    if (!user || !pass || /your-|example|password/i.test(user) || /your-|example|password/i.test(pass)) {
      return res.status(400).json({
        message: 'Please enter your actual Gmail address and 16-character Google App Password to test connection.'
      });
    }

    const testConfig = {
      host: host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(port || process.env.SMTP_PORT || 465),
      user: user.trim(),
      pass: pass ? pass.replace(/\s+/g, '') : process.env.SMTP_PASS
    };

    const isGmail = testConfig.host.includes('gmail') || testConfig.user.endsWith('@gmail.com');
    const config = isGmail ? {
      service: 'gmail',
      auth: { user: testConfig.user, pass: testConfig.pass },
      tls: { rejectUnauthorized: false }
    } : {
      host: testConfig.host,
      port: testConfig.port,
      secure: testConfig.port === 465,
      auth: { user: testConfig.user, pass: testConfig.pass },
      tls: { rejectUnauthorized: false }
    };

    const transporter = nodemailer.createTransport(config);
    await transporter.verify();

    if (testEmail) {
      await transporter.sendMail({
        from: mailFrom || testConfig.user,
        to: testEmail,
        subject: '[MWCA Grievance System] SMTP Test Connection',
        text: 'This is a test email sent from the MWCA Grievance Management System. Your SMTP configuration is working perfectly!'
      });
      return res.json({ message: `SMTP connection verified and test email successfully delivered to ${testEmail}!` });
    }

    res.json({ message: 'SMTP connection verified successfully! Credentials are valid.' });
  } catch (error) {
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      return res.status(400).json({
        message: 'SMTP Authentication Failed: Gmail requires a 16-character App Password (not your normal account password). Ensure 2FA is enabled on your Google Account and generate an App Password at https://myaccount.google.com/apppasswords.'
      });
    }
    res.status(400).json({ message: `SMTP Connection Error: ${error.message}` });
  }
});

function sqliteToView(row) {
  const recDate = row.received_at || row.created_at;
  const defaultDue = recDate ? new Date(new Date(recDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
  return {
    id: row.id,
    reference_number: row.reference_number,
    complainant_name: row.complainant_name,
    nic: row.nic,
    telephone: row.telephone,
    email: row.email,
    address: row.address,
    district: row.district,
    source: row.source,
    intake_method: row.intake_method,
    category: row.category,
    subcategory: row.subcategory,
    subject: row.subject,
    description: row.description,
    priority: row.priority || 'Normal',
    confidentiality: row.confidentiality || 'Standard',
    status: row.status,
    assigned_division: row.assigned_division,
    recipient_email: row.recipient_email,
    attachment_name: row.attachment_name,
    attachment_url: row.attachment_url,
    attachment_size: row.attachment_size,
    received_at: recDate,
    due_at: (row.due_at && row.due_at !== row.received_at) ? row.due_at : defaultDue,
    closed_at: row.closed_at
  };
}

function buildFilters(req) {
  const clauses = [];
  const params = [];

  if (req.query.status && req.query.status !== 'all') { clauses.push('g.status = ?'); params.push(req.query.status); }
  if (req.query.source && req.query.source !== 'all') { clauses.push('g.source = ?'); params.push(req.query.source); }
  if (req.query.category && req.query.category !== 'all') { clauses.push('g.category = ?'); params.push(req.query.category); }
  if (req.query.subcategory && req.query.subcategory !== 'all') { clauses.push('g.subcategory = ?'); params.push(req.query.subcategory); }
  if (req.query.department && req.query.department !== 'all') { clauses.push('g.assigned_division = ?'); params.push(req.query.department); }
  if (req.query.priority && req.query.priority !== 'all') { clauses.push('g.priority = ?'); params.push(req.query.priority); }
  if (req.query.search) {
    clauses.push('(g.reference_number LIKE ? OR g.complainant_name LIKE ? OR g.subject LIKE ? OR g.description LIKE ?)');
    const term = `%${req.query.search}%`;
    params.push(term, term, term, term);
  }

  return { clauses, params };
}

router.get('/', async (req, res, next) => {
  try {
    const { clauses, params } = buildFilters(req);
    const query = `SELECT g.*, latest_action.note AS action_taken, latest_action.created_at AS action_date FROM grievances g LEFT JOIN case_actions latest_action ON latest_action.id = (SELECT id FROM case_actions WHERE grievance_id = g.id ORDER BY created_at DESC, id DESC LIMIT 1)${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY g.received_at DESC`;
    const rows = await all(query, params);
    res.json(rows.map(sqliteToView));
  } catch (error) { next(error); }
});

router.get('/statistics', async (req, res, next) => {
  try {
    const total = await get('SELECT COUNT(*) AS total FROM grievances');
    const byStatus = await all('SELECT status, COUNT(*) AS count FROM grievances GROUP BY status');
    const byCategory = await all('SELECT category, COUNT(*) AS count FROM grievances GROUP BY category');
    const bySource = await all('SELECT source, COUNT(*) AS count FROM grievances GROUP BY source');
    const byDepartment = await all('SELECT assigned_division AS department, COUNT(*) AS count FROM grievances WHERE assigned_division IS NOT NULL GROUP BY assigned_division');

    res.json({
      total: Number(total.total),
      byStatus: byStatus.map(x => ({ status: x.status, count: Number(x.count) })),
      byCategory: byCategory.map(x => ({ category: x.category, count: Number(x.count) })),
      bySource: bySource.map(x => ({ source: x.source, count: Number(x.count) })),
      byDepartment: byDepartment.map(x => ({ department: x.department, count: Number(x.count) }))
    });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const idValue = Number(req.params.id);
    const row = await get('SELECT * FROM grievances WHERE id = ? OR reference_number = ?', [Number.isFinite(idValue) ? idValue : -1, req.params.id]);
    if (!row) return res.status(404).json({ message: 'Grievance not found.' });
    res.json(sqliteToView(row));
  } catch (error) { next(error); }
});

router.post('/', authorize('ADMIN', 'OFFICER', 'USER', 'REVIEWER'), async (req, res, next) => {
  try {
    const b = req.body;
    if (!b.complainantName || !b.source || !b.category || !b.subject || !b.description) {
      return res.status(400).json({ message: 'Complete all required fields.' });
    }

    let normalizedCategory = b.category || 'Women';
    if (normalizedCategory === 'Other' || normalizedCategory === 'General') {
      normalizedCategory = 'General / Other';
    }
    if (!categories.includes(normalizedCategory)) {
      normalizedCategory = 'General / Other';
    }

    const maxRow = await get("SELECT reference_number FROM grievances WHERE reference_number LIKE 'MWCA/GMS/%' ORDER BY id DESC LIMIT 1");
    let seq = 1;
    if (maxRow && maxRow.reference_number) {
      const parts = maxRow.reference_number.split('/');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (Number.isFinite(lastNum) && lastNum >= seq) seq = lastNum + 1;
    }
    const totalDocs = await get('SELECT COUNT(*) AS count FROM grievances');
    if (Number(totalDocs.count) >= seq) seq = Number(totalDocs.count) + 1;

    let reference = `MWCA/GMS/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`;
    while (await get('SELECT id FROM grievances WHERE reference_number = ?', [reference])) {
      seq += 1;
      reference = `MWCA/GMS/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`;
    }

    const recDateStr = b.receivedDate || new Date().toISOString();
    const recDate = new Date(recDateStr);
    let calculatedDueAt = null;
    if (b.dueAt || b.dueDate) {
      calculatedDueAt = new Date(b.dueAt || b.dueDate).toISOString();
    } else if (b.deadlineDays && !isNaN(Number(b.deadlineDays))) {
      calculatedDueAt = new Date(recDate.getTime() + Number(b.deadlineDays) * 24 * 60 * 60 * 1000).toISOString();
    } else {
      calculatedDueAt = new Date(recDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const userId = (req.user && req.user.id) ? req.user.id : 1;

    const inserted = await run(
      `INSERT INTO grievances (reference_number, complainant_name, nic, telephone, email, address, district, source, intake_method, category, subcategory, subject, description, priority, confidentiality, status, assigned_division, recipient_email, recipient_emails, attachment_name, attachment_url, attachment_size, attachments_json, received_at, due_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference,
        b.complainantName,
        b.nic || null,
        b.telephone || null,
        b.email || null,
        b.address || null,
        b.district || null,
        b.source,
        b.intakeMethod || null,
        normalizedCategory,
        b.subcategory || 'General Inquiry',
        b.subject,
        b.description,
        b.priority || 'Normal',
        b.confidentiality || 'Standard',
        'Awaiting Review',
        b.assignedDivision || null,
        b.recipientEmail || null,
        JSON.stringify(parseRecipientEmails(b.recipientEmails || b.recipientEmail)),
        b.attachmentName || null,
        b.attachmentUrl || null,
        b.attachmentSize || null,
        JSON.stringify(Array.isArray(b.attachments) ? b.attachments : []),
        recDateStr,
        calculatedDueAt,
        userId
      ]
    );

    await run(
      'INSERT INTO case_actions (grievance_id, action_type, new_status, note, performed_by, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [
        inserted.id,
        'Registered',
        'Awaiting Review',
        `Grievance registered in SQLite database with ${b.attachmentName ? 'attached document (' + b.attachmentName + ')' : 'no attachments'}.`,
        userId
      ]
    );

    res.status(201).json({ id: inserted.id, referenceNumber: reference, status: 'Awaiting Review' });
  } catch (error) {
    console.error('❌ SQLite Grievance POST error:', error);
    res.status(500).json({ message: error.message || 'SQLite insertion error.' });
  }
});

router.post('/:id/send-email', authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  try {
    const { recipientEmail, recipientEmails, departmentName, note, reminder, newAttachments, attachments, language = 'si', simulate = false } = req.body;
    const isSinhala = (language !== 'en');

    const row = await get('SELECT * FROM grievances WHERE id = ? OR reference_number = ?', [Number(req.params.id) || -1, req.params.id]);
    if (!row) return res.status(404).json({ message: 'Grievance not found.' });

    const targetEmails = parseRecipientEmails(recipientEmails || recipientEmail || row.recipient_emails || row.recipient_email);
    const targetDept = String(departmentName || row.assigned_division || '').trim();
    if (!targetDept) return res.status(400).json({ message: 'Select or enter a destination department.' });
    const invalidEmail = targetEmails.find(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!targetEmails.length || invalidEmail) {
      return res.status(400).json({ message: invalidEmail ? `Invalid recipient email address: ${invalidEmail}` : 'Enter at least one recipient email address.' });
    }
    const previousStatus = row.status;

    // Parse incoming new attachments for email & DB persistence
    const incomingNewAtts = Array.isArray(newAttachments) ? newAttachments : (Array.isArray(attachments) ? attachments : []);
    const parsedNewMailAtts = incomingNewAtts.map(att => {
      if (!att || !att.name) return null;
      const dataStr = att.dataUrl || att.data;
      if (dataStr) {
        const match = String(dataStr).match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          return { filename: att.name, contentType: att.type || att.contentType || match[1], content: Buffer.from(match[2], 'base64') };
        }
      } else if (att.content && typeof att.content === 'string') {
        return { filename: att.name, contentType: att.type || att.contentType || 'application/octet-stream', content: Buffer.from(att.content, 'base64') };
      }
      return null;
    }).filter(Boolean);

    const recDate = row.received_at || row.created_at;
    let formattedDate = 'Not recorded';
    if (recDate) {
      const d = new Date(recDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    const titleText = isSinhala
      ? (reminder ? 'ප්‍රමාද වූ පැමිණිලි මතක් කිරීම' : 'මහජන පැමිණිලි ,දුක්ගැනවිලි සහ ඉල්ලීම්')
      : (reminder ? 'Overdue Reminder' : 'Grievance Referral');

    const emailSubject = req.body.subject || (isSinhala
      ? (reminder ? `ප්‍රමාද වූ පැමිණිලි මතක් කිරීම - ${row.reference_number}` : 'මහජන පැමිණිලි ,දුක්ගැනවිලි සහ ඉල්ලීම්')
      : (reminder ? `Overdue Reminder - ${row.reference_number}` : `Grievance Referral - ${row.reference_number}${row.subcategory || row.subject ? ' – ' + (row.subcategory || row.subject) : ''}`));

    const ministryName = isSinhala ? 'කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය' : 'Ministry of Women and Child Affairs';
    const greetingText = isSinhala ? 'ගරු මහත්මයා/මහත්මියනි,' : 'Dear Sir/Madam,';
    const introText = isSinhala
      ? (reminder
          ? `මෙය ඔබ කාර්යාලය වෙත යොමු කරන ලද <strong>${escHtml(row.reference_number)}</strong> දැරූ කාන්තා හා ළමා කටයුතු අමාත්‍යාංශයේ නිල පැමිණිල්ල සම්බන්ධයෙන් වූ හදිසි මතක් කිරීමකි.`
          : `කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය මගින් අවශ්‍ය සමාලෝචනය සහ ඉදිරි පියවර ගැනීම සඳහා පැමිණිල්ලක්/දුක්ගැනවිල්ලක් ඔබ කාර්යාලය වෙත යොමු කර ඇත.`)
      : (reminder
          ? `This is an urgent reminder regarding official MWCA grievance <strong>${escHtml(row.reference_number)}</strong> referred to your office.`
          : `A grievance has been referred to your office by the Ministry of Women and Child Affairs for necessary review and action.`);

    const detailsTitle = isSinhala ? 'පැමිණිලි විස්තර' : 'Grievance Details';
    const labelRef = isSinhala ? 'යොමු අංකය' : 'Reference No.';
    const labelCat = isSinhala ? 'ප්‍රධාන වර්ගීකරණය' : 'Category';
    const labelSubcat = isSinhala ? 'අනු වර්ගීකරණය' : 'Subcategory';
    const labelPriority = isSinhala ? 'ප්‍රමුඛතාව' : 'Priority';
    const labelDate = isSinhala ? 'ලැබුණු දිනය' : 'Date Received';
    const labelReferred = isSinhala ? 'යොමු කළ අංශය / දෙපාර්තමේන්තුව' : 'Referred To';

    const noteTitle = isSinhala ? 'උපදෙස් / කරුණු පැහැදිලි කිරීම්' : 'Instructions / Context';
    const actionTitle = isSinhala ? 'අවශ්‍ය ඉදිරි පියවර' : 'Action Required';
    const actionText = isSinhala
      ? `කරුණාකර මෙම පැමිණිල්ල සහ අමුණා ඇති ලේඛන පරීක්ෂා කර අදාළ ක්‍රියාපටිපාටීන්ට අනුකූලව අවශ්‍ය ඉදිරි පියවර ගන්න. මෙම පැමිණිල්ලට අදාළ සියලුම ලිපිගොනු සඳහා යොමු අංකය <strong>${escHtml(row.reference_number)}</strong> සඳහන් කිරීමට කාරුණික වන්න.`
      : `Kindly review the grievance and the attached documents and take the necessary action in accordance with the relevant procedures. Please quote reference number <strong>${escHtml(row.reference_number)}</strong> in all correspondence related to this grievance.`;

    const thanksText = isSinhala ? 'ස්තුතියි,' : 'Thank you.';
    const footerSystem = isSinhala ? 'මහජන පැමිණිලි සහ දුක්ගැනවිලි කළමනාකරණ පද්ධතිය' : 'Grievance Management System';
    const footerDept = isSinhala ? 'පාලන අංශය' : 'Administration Division';
    const footerMinistry = isSinhala ? 'කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය' : 'Ministry of Women and Child Affairs';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { background: ${reminder ? '#dc2626' : '#6758d8'}; color: #ffffff; padding: 24px 28px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.2px; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 13px; }
    .body { padding: 28px; font-size: 14.5px; line-height: 1.6; color: #334155; }
    .details-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 18px 0 22px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
    .details-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13.5px; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { width: 140px; font-weight: 600; color: #64748b; }
    .val { font-weight: 600; color: #0f172a; }
    .action { background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
    .action h4 { margin: 0 0 4px; color: #1e40af; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .action p { margin: 0; font-size: 13.5px; color: #1e3a8a; }
    .note { background: #fefce8; border-left: 4px solid #eab308; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 18px 0; }
    .note h4 { margin: 0 0 4px; color: #854d0e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .note p { margin: 0; font-size: 13.5px; color: #713f12; white-space: pre-wrap; }
    .footer { padding: 20px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
    .footer strong { color: #1e293b; display: block; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1><b>${titleText}</b></h1>
      <p>${ministryName}</p>
    </div>
    <div class="body">
      <p>${greetingText}</p>
      <p>${introText}</p>
      
      <h3 style="font-size:13.5px;font-weight:700;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.5px;margin:22px 0 8px;">${detailsTitle}</h3>
      <table class="details-table">
        <tr><td class="label">${labelRef}</td><td class="val"><strong>${escHtml(row.reference_number)}</strong></td></tr>
        <tr><td class="label">${labelCat}</td><td class="val">${escHtml(isSinhala ? (row.category === 'Child' ? 'ළමා අංශය (Child)' : (row.category === 'Women' ? 'කාන්තා අංශය (Women)' : row.category)) : row.category)}</td></tr>
        <tr><td class="label">${labelSubcat}</td><td class="val">${escHtml(isSinhala ? (row.subcategory || 'සාමාන්‍ය විමසීම්') : (row.subcategory || 'General Inquiry'))}</td></tr>
        <tr><td class="label">${labelPriority}</td><td class="val">${escHtml(isSinhala ? (row.priority === 'Critical' ? 'අතිශය හදිසි (Critical)' : (row.priority === 'High' ? 'ඉහළ ප්‍රමුඛතාව (High)' : (row.priority === 'Low' ? 'අඩු ප්‍රමුඛතාව (Low)' : 'සාමාන්‍ය (Normal)'))) : (row.priority || 'Normal'))}</td></tr>
        <tr><td class="label">${labelDate}</td><td class="val">${escHtml(formattedDate)}</td></tr>
        <tr><td class="label">${labelReferred}</td><td class="val">${escHtml(targetDept)}</td></tr>
      </table>

      ${note ? `
      <div class="note">
        <h4>${noteTitle}</h4>
        <p>${escHtml(note)}</p>
      </div>` : ''}

      <div class="action">
        <h4>${actionTitle}</h4>
        <p>${actionText}</p>
      </div>

      <p style="margin-top:24px;margin-bottom:0;">${thanksText}</p>
    </div>
    <div class="footer">
      <strong>${footerSystem}</strong>
      <div>${footerDept}</div>
      <div>${footerMinistry}</div>
    </div>
  </div>
</body>
</html>
`;

    const emailText = [
      greetingText,
      '',
      isSinhala
        ? (reminder ? `මෙය ඔබ කාර්යාලය වෙත යොමු කරන ලද ${row.reference_number} දැරූ කාන්තා හා ළමා කටයුතු අමාත්‍යාංශයේ නිල පැමිණිල්ල සම්බන්ධයෙන් වූ හදිසි මතක් කිරීමකි.` : 'කාන්තා හා ළමා කටයුතු අමාත්‍යාංශය මගින් අවශ්‍ය සමාලෝචනය සහ ඉදිරි පියවර ගැනීම සඳහා පැමිණිල්ලක්/දුක්ගැනවිල්ලක් ඔබ කාර්යාලය වෙත යොමු කර ඇත.')
        : (reminder ? `This is an urgent reminder regarding official MWCA grievance ${row.reference_number} referred to your office.` : 'A grievance has been referred to your office by the Ministry of Women and Child Affairs for necessary review and action.'),
      '',
      detailsTitle,
      '',
      `${labelRef} : ${row.reference_number}`,
      `${labelCat}      : ${row.category}`,
      `${labelSubcat}   : ${row.subcategory || 'General Inquiry'}`,
      `${labelPriority}      : ${row.priority || 'Normal'}`,
      `${labelDate} : ${formattedDate}`,
      `${labelReferred}   : ${targetDept}`,
      note ? `\n${noteTitle}  : ${note}\n` : '',
      actionTitle,
      '',
      actionText.replace(/<[^>]+>/g, ''),
      '',
      thanksText,
      '',
      footerSystem,
      footerDept,
      footerMinistry
    ].filter(Boolean).join('\n');

    const { transporter, fromUser, isTestAccount } = await getMailTransporterAsync(simulate);
    try {
      await transporter.sendMail({
        from: fromUser,
        to: targetEmails,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        attachments: [summaryAttachment(row, targetDept, note), ...getAllAttachmentsFromRow(row), ...parsedNewMailAtts].filter(Boolean)
      });

    } catch (mailErr) {
      if (mailErr.code === 'EAUTH' || mailErr.responseCode === 535) {
        mailErr.status = 502;
        mailErr.message = 'SMTP login failed. Use the sender email and its 16-character App Password in Email Settings.';
      }
      throw mailErr;
    }

    // Save newly attached documents into grievance's attachments_json in SQLite DB
    if (incomingNewAtts.length > 0) {
      let existingAtts = [];
      try { existingAtts = row.attachments_json ? JSON.parse(row.attachments_json) : []; } catch(e){}
      const updatedAtts = [...existingAtts, ...incomingNewAtts];
      await run('UPDATE grievances SET attachments_json = ? WHERE id = ?', [JSON.stringify(updatedAtts), row.id]);
    }

    await run(
      'UPDATE grievances SET recipient_email = ?, recipient_emails = ?, assigned_division = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetEmails.join(', '), JSON.stringify(targetEmails), targetDept, 'Forwarded', row.id]
    );

    const newAttNames = incomingNewAtts.map(a => a.name).filter(Boolean);
    const attSuffix = newAttNames.length ? ` with new document(s): ${newAttNames.join(', ')}` : '';

    await run(
      'INSERT INTO case_actions (grievance_id, action_type, previous_status, new_status, note, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [row.id, reminder ? 'Overdue Reminder Sent' : 'Email Referral Sent', previousStatus, 'Forwarded', `${reminder ? 'Overdue reminder' : 'Official email referral'} sent to ${targetDept} (${targetEmails.join(', ')}). Note: ${note || 'Case forwarded for official action.'}${attSuffix}`, req.user.id]
    );

    res.json({
      message: `Email referral successfully dispatched to ${targetEmails.join(', ')}`,
      isTestAccount: false,
      previewUrl: null,
      dispatchedAt: new Date().toISOString(),
      recipientEmail: targetEmails.join(', '),
      department: targetDept
    });
  } catch (error) {
    next(error);
  }
});

router.post('/send-department-summary', authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  try {
    const { departmentName, recipientEmail, recipientEmails, note, grievanceIds, attachDocuments = true, simulate = false } = req.body;

    const targetDept = String(departmentName || '').trim();
    if (!targetDept) return res.status(400).json({ message: 'Target department or ministry is required.' });

    const targetEmails = parseRecipientEmails(recipientEmails || recipientEmail);
    const invalidEmail = targetEmails.find(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!targetEmails.length || invalidEmail) {
      return res.status(400).json({ message: invalidEmail ? `Invalid recipient email address: ${invalidEmail}` : 'Enter at least one valid recipient email address.' });
    }

    let rows = [];
    if (Array.isArray(grievanceIds) && grievanceIds.length > 0) {
      const parsedIds = grievanceIds.map(Number).filter(id => Number.isFinite(id) && id > 0);
      if (parsedIds.length > 0) {
        const placeholders = parsedIds.map(() => '?').join(',');
        rows = await all(`SELECT * FROM grievances WHERE id IN (${placeholders}) ORDER BY received_at DESC`, parsedIds);
      }
    }
    if (!rows.length) {
      rows = await all('SELECT * FROM grievances WHERE assigned_division = ? ORDER BY received_at DESC', [targetDept]);
    }

    if (!rows.length) {
      return res.status(400).json({ message: `No grievance records found assigned to department "${targetDept}".` });
    }

    const { transporter, fromUser, isTestAccount } = await getMailTransporterAsync(simulate);

    // 1. Build CSV summary attachment
    const csvHeader = 'Reference No,Date Received,Complainant Name,NIC,Contact Number,Address,District,Category,Subcategory,Priority,Status,Subject,Description\n';
    const csvRows = rows.map(r => [
      r.reference_number,
      r.received_at || r.created_at,
      r.complainant_name,
      r.nic || '',
      r.telephone || '',
      r.address || '',
      r.district || '',
      r.category,
      r.subcategory || '',
      r.priority || 'Normal',
      r.status,
      r.subject,
      r.description
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const cleanDeptName = targetDept.replace(/[/\\?%*:|"<> ]/g, '_');
    const csvFilename = `${cleanDeptName}_Grievance_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    const summaryCsvAttachment = {
      filename: csvFilename,
      contentType: 'text/csv',
      content: Buffer.from(csvHeader + csvRows, 'utf8')
    };

    // 2. Build Document Attachments from all included grievances
    const docAttachments = [];
    if (attachDocuments) {
      for (const row of rows) {
        const atts = getAllAttachmentsFromRow(row, true);
        docAttachments.push(...atts);
      }
    }

    // 3. Build HTML Email Body
    const htmlGrievanceRows = rows.map((r, idx) => {
      const pColor = r.priority === 'Critical' ? '#dc2626' : (r.priority === 'High' ? '#ea580c' : '#2563eb');
      const pBg = r.priority === 'Critical' ? '#fef2f2' : (r.priority === 'High' ? '#fff7ed' : '#eff6ff');
      const attCount = getAllAttachmentsFromRow(r).length;
      return `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px;font-size:12px;color:#6b7280;">${idx + 1}</td>
          <td style="padding:10px;font-weight:600;color:#1e1b4b;font-size:13px;">${escHtml(r.reference_number)}</td>
          <td style="padding:10px;font-size:12px;color:#374151;">${escHtml(String(r.received_at || '').slice(0, 10))}</td>
          <td style="padding:10px;font-size:13px;color:#111827;">
            <strong>${escHtml(r.complainant_name)}</strong><br>
            <span style="font-size:11px;color:#6b7280;">${escHtml([r.address, r.district].filter(Boolean).join(', ') || 'Address/District N/A')}</span>
          </td>
          <td style="padding:10px;font-size:12px;color:#374151;">
            <strong>${escHtml(r.category)}</strong><br>
            <span style="font-size:11px;color:#6b7280;">${escHtml(r.subcategory || '')}</span>
          </td>
          <td style="padding:10px;font-size:12px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-weight:600;font-size:11px;background:${pBg};color:${pColor};">${escHtml(r.priority || 'Normal')}</span>
          </td>
          <td style="padding:10px;font-size:12px;color:#374151;">${escHtml(r.status)}</td>
          <td style="padding:10px;font-size:12px;color:#374151;max-width:240px;">
            <strong style="color:#1f2937;">${escHtml(r.subject)}</strong><br>
            <span style="color:#4b5563;font-size:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escHtml(r.description)}</span>
          </td>
          <td style="padding:10px;font-size:12px;color:#6b7280;text-align:center;">
            ${attCount > 0 ? `<span style="background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:4px;font-weight:600;font-size:11px;">📎 ${attCount} File${attCount > 1 ? 's' : ''}</span>` : '<span style="color:#9ca3af;">—</span>'}
          </td>
        </tr>
      `;
    }).join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#f4f6f9; margin:0; padding:20px; color:#1f2937;">
        <div style="max-width:850px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid #e5e7eb;">
          
          <div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color:#ffffff; padding:24px 30px;">
            <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#c7d2fe; font-weight:600;">Ministry of Women and Child Affairs</div>
            <h1 style="margin:6px 0 0 0; font-size:22px; font-weight:700;">Department Grievance Summary & Action Dispatch</h1>
            <p style="margin:4px 0 0 0; font-size:13px; color:#e0e7ff;">Target Department: <strong>${escHtml(targetDept)}</strong></p>
          </div>

          <div style="padding:24px 30px;">
            
            ${note ? `
            <div style="background:#f5f3ff; border-left:4px solid #6366f1; padding:14px 18px; border-radius:6px; margin-bottom:20px;">
              <strong style="color:#4338ca; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Official Instruction / Cover Note:</strong>
              <p style="margin:6px 0 0 0; font-size:14px; color:#374151; white-space:pre-wrap;">${escHtml(note)}</p>
            </div>
            ` : ''}

            <div style="display:flex; gap:16px; margin-bottom:20px;">
              <div style="background:#f3f4f6; border-radius:8px; padding:12px 18px; flex:1;">
                <span style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:600;">Total Cases Summarized</span>
                <div style="font-size:20px; font-weight:700; color:#1e1b4b;">${rows.length}</div>
              </div>
              <div style="background:#f3f4f6; border-radius:8px; padding:12px 18px; flex:1;">
                <span style="font-size:11px; color:#6b7280; text-transform:uppercase; font-weight:600;">Attachments Included</span>
                <div style="font-size:20px; font-weight:700; color:#4338ca;">${docAttachments.length + 1} <span style="font-size:12px; font-weight:normal; color:#6b7280;">(1 Summary CSV + ${docAttachments.length} Document${docAttachments.length === 1 ? '' : 's'})</span></div>
              </div>
            </div>

            <h3 style="font-size:15px; color:#111827; margin:0 0 10px 0; border-bottom:2px solid #e5e7eb; padding-bottom:6px;">Summary List of Grievances</h3>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                  <tr style="background:#f9fafb; border-bottom:2px solid #e5e7eb; font-size:11px; color:#4b5563; text-transform:uppercase;">
                    <th style="padding:10px;">#</th>
                    <th style="padding:10px;">Ref No</th>
                    <th style="padding:10px;">Date</th>
                    <th style="padding:10px;">Complainant</th>
                    <th style="padding:10px;">Category</th>
                    <th style="padding:10px;">Priority</th>
                    <th style="padding:10px;">Status</th>
                    <th style="padding:10px;">Subject & Context</th>
                    <th style="padding:10px;text-align:center;">Docs</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlGrievanceRows}
                </tbody>
              </table>
            </div>

            <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280; display:flex; justify-content:space-between;">
              <p style="margin:0;">📎 Attached: <strong>${escHtml(csvFilename)}</strong> ${docAttachments.length > 0 ? `and ${docAttachments.length} supporting document file(s)` : ''}.</p>
              <p style="margin:0;">Dispatched on: ${new Date().toLocaleString()}</p>
            </div>

          </div>

          <div style="background:#f9fafb; padding:16px 30px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#9ca3af;">
            Ministry of Women and Child Affairs — Grievance Management System<br>
            This is an official automated dispatch email. Please address cases promptly according to Ministry regulations.
          </div>

        </div>
      </body>
      </html>
    `;

    const allEmailAttachments = [summaryCsvAttachment, ...docAttachments];

    try {
      await transporter.sendMail({
        from: fromUser,
        to: targetEmails,
        subject: `[MWCA Grievance Summary Update] ${targetDept} — ${rows.length} Grievance Case(s)`,
        html: htmlBody,
        text: `MWCA Grievance Summary Update for ${targetDept}\nTotal Cases: ${rows.length}\n${note ? `Note: ${note}\n` : ''}\nPlease review attached CSV summary and supporting documents.`,
        attachments: allEmailAttachments
      });
    } catch (mailErr) {
      if (mailErr.code === 'EAUTH' || mailErr.responseCode === 535) {
        mailErr.status = 502;
        mailErr.message = 'SMTP login failed. Ensure sender email and 16-character App Password are correctly saved in Email Settings.';
      }
      throw mailErr;
    }

    for (const r of rows) {
      await run(
        'INSERT INTO case_actions (grievance_id, action_type, previous_status, new_status, note, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [r.id, 'Department Summary Email Sent', r.status, r.status, `Included in department summary email update dispatched to ${targetDept} (${targetEmails.join(', ')}). ${docAttachments.length} document attachment(s) included.`, req.user.id]
      );
    }

    res.json({
      message: isTestAccount
        ? `[Demo Mode] Department summary email update with ${rows.length} grievance(s) and ${allEmailAttachments.length} attachment(s) simulated successfully for ${targetEmails.join(', ')}.`
        : `Department summary email update with ${rows.length} grievance(s) and ${allEmailAttachments.length} attachment(s) successfully dispatched to ${targetEmails.join(', ')}.`,
      dispatchedAt: new Date().toISOString(),
      caseCount: rows.length,
      attachmentCount: allEmailAttachments.length,
      recipientEmail: targetEmails.join(', '),
      department: targetDept,
      isTestAccount
    });

  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authorize('ADMIN', 'OFFICER', 'REVIEWER'), async (req, res, next) => {
  try {
    if (!statuses.includes(req.body.status)) return res.status(400).json({ message: 'Invalid status.' });

    const existing = await get('SELECT id, status FROM grievances WHERE id = ? OR reference_number = ?', [Number(req.params.id) || -1, req.params.id]);
    if (!existing) return res.status(404).json({ message: 'Grievance not found.' });
    const newStatus = req.body.status;
    const closedAtSql = ['Resolved', 'Closed'].includes(newStatus) ? ', closed_at = CURRENT_TIMESTAMP' : ', closed_at = NULL';
    await run(`UPDATE grievances SET status = ?, updated_at = CURRENT_TIMESTAMP${closedAtSql} WHERE id = ?`, [newStatus, existing.id]);
    await run(
      'INSERT INTO case_actions (grievance_id, action_type, previous_status, new_status, note, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [existing.id, 'Status Updated', existing.status, newStatus, `Status changed to ${newStatus}.`, req.user.id]
    );
    res.json({ message: 'Status updated successfully.' });
  } catch (error) { next(error); }
});

router.patch('/:id', authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  try {
    const existing = await get('SELECT id, status FROM grievances WHERE id = ? OR reference_number = ?', [Number(req.params.id) || -1, req.params.id]);
    if (!existing) return res.status(404).json({ message: 'Grievance not found.' });
    const updateFields = [];
    const values = [];

    if (req.body.complainant_name !== undefined || req.body.complainantName !== undefined || req.body.name !== undefined) {
      updateFields.push('complainant_name = ?');
      values.push(req.body.complainant_name || req.body.complainantName || req.body.name || '');
    }
    if (req.body.nic !== undefined) { updateFields.push('nic = ?'); values.push(req.body.nic); }
    if (req.body.phone !== undefined || req.body.telephone !== undefined) {
      updateFields.push('telephone = ?');
      values.push(req.body.phone !== undefined ? req.body.phone : req.body.telephone);
    }
    if (req.body.address !== undefined) { updateFields.push('address = ?'); values.push(req.body.address); }
    if (req.body.district !== undefined) { updateFields.push('district = ?'); values.push(req.body.district); }
    if (req.body.source !== undefined) { updateFields.push('source = ?'); values.push(req.body.source); }
    if (req.body.subject !== undefined) { updateFields.push('subject = ?'); values.push(req.body.subject); }
    if (req.body.description !== undefined) { updateFields.push('description = ?'); values.push(req.body.description); }
    if (req.body.confidential !== undefined || req.body.confidentiality !== undefined) {
      updateFields.push('confidentiality = ?');
      values.push(req.body.confidential !== undefined ? req.body.confidential : req.body.confidentiality);
    }
    if (req.body.category !== undefined) { updateFields.push('category = ?'); values.push(req.body.category); }
    if (req.body.subcategory !== undefined) { updateFields.push('subcategory = ?'); values.push(req.body.subcategory); }
    if (req.body.assigned_division !== undefined || req.body.assignedDivision !== undefined) { updateFields.push('assigned_division = ?'); values.push(req.body.assigned_division || req.body.assignedDivision); }
    if (req.body.recipient_email !== undefined || req.body.recipientEmail !== undefined) { updateFields.push('recipient_email = ?'); values.push(req.body.recipient_email || req.body.recipientEmail); }
    if (req.body.priority !== undefined) { updateFields.push('priority = ?'); values.push(req.body.priority); }
    if (req.body.due_at || req.body.dueAt || req.body.dueDate) {
      updateFields.push('due_at = ?');
      const val = req.body.due_at || req.body.dueAt || req.body.dueDate;
      values.push(new Date(val).toISOString());
    }
    if (req.body.status) {
      updateFields.push('status = ?');
      values.push(req.body.status);
      if (['Resolved', 'Closed'].includes(req.body.status)) {
        updateFields.push('closed_at = CURRENT_TIMESTAMP');
      }
    }
    if (req.body.attachments !== undefined || req.body.attachments_json !== undefined) {
      const atts = Array.isArray(req.body.attachments) ? req.body.attachments : (req.body.attachments_json ? JSON.parse(req.body.attachments_json) : []);
      updateFields.push('attachments_json = ?');
      values.push(JSON.stringify(atts));
      updateFields.push('attachment_name = ?');
      values.push(atts[0]?.name || null);
      updateFields.push('attachment_url = ?');
      values.push(atts[0]?.dataUrl || null);
      updateFields.push('attachment_size = ?');
      values.push(atts[0]?.size || null);
    }

    if (!updateFields.length) return res.status(400).json({ message: 'No valid fields provided.' });
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(existing.id);

    await run(`UPDATE grievances SET ${updateFields.join(', ')} WHERE id = ?`, values);
    await run(
      'INSERT INTO case_actions (grievance_id, action_type, previous_status, new_status, note, performed_by, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [existing.id, 'Case Updated', existing.status, req.body.status || existing.status, `Case updated${req.body.assigned_division || req.body.assignedDivision ? ` and forwarded to ${req.body.assigned_division || req.body.assignedDivision}` : ''}.`, req.user.id]
    );
    res.json({ message: 'Grievance updated successfully.' });
  } catch (error) { next(error); }
});

router.delete('/', authorize('ADMIN', 'OFFICER', 'USER', 'REVIEWER'), async (req, res, next) => {
  try {
    const refQuery = req.query.ref || req.body.ref;
    const idQuery = req.query.id || req.body.id;
    if (!refQuery && !idQuery) return res.status(400).json({ message: 'Reference number or ID required.' });
    const existing = await get('SELECT id, reference_number FROM grievances WHERE (id = ? AND id > 0) OR reference_number = ?', [Number(idQuery) || -1, refQuery]);
    if (existing) {
      try { await run('DELETE FROM case_actions WHERE grievance_id = ?', [existing.id]); } catch (e) {}
      await run('DELETE FROM grievances WHERE id = ?', [existing.id]);
    }
    res.status(200).json({ message: 'Grievance deleted successfully.' });
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('ADMIN', 'OFFICER', 'USER', 'REVIEWER'), async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const refQuery = req.query.ref || rawId;
    const idNum = Number(rawId);
    const existing = await get('SELECT id, reference_number FROM grievances WHERE (id = ? AND id > 0) OR reference_number = ? OR reference_number = ?', [Number.isFinite(idNum) ? idNum : -1, rawId, refQuery]);

    if (existing) {
      try { await run('DELETE FROM case_actions WHERE grievance_id = ?', [existing.id]); } catch (e) {}
      await run('DELETE FROM grievances WHERE id = ?', [existing.id]);
    }
    res.status(200).json({ message: 'Grievance deleted successfully.' });
  } catch (error) { next(error); }
});

module.exports = router;
