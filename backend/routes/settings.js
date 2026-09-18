const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { authenticate, authorize } = require('../auth');

const router = express.Router();
router.use(authenticate);

function isSmtpConfigured() {
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  return Boolean(user && pass && !/your-|example|password/i.test(user) && !/your-|example|password/i.test(pass));
}

function getMailTransporter(customConfig = null) {
  const host = customConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(customConfig?.port || process.env.SMTP_PORT || 465);
  const user = String(customConfig?.user ?? process.env.SMTP_USER ?? '').trim();
  const pass = String(customConfig?.pass ?? process.env.SMTP_PASS ?? '').replace(/\s+/g, '');

  if (!user || !pass || /your-|example|password/i.test(user) || /your-|example|password/i.test(pass)) {
    const error = new Error('SMTP is not properly configured. Please enter a valid SMTP Email and App Password.');
    error.status = 400;
    error.isNotConfigured = true;
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

  return nodemailer.createTransport(config);
}

function updateEnvFile(newVars) {
  const envPath = path.join(__dirname, '..', '.env');
  let content = '';
  try {
    content = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    content = '';
  }

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

  const newContent = Object.entries(envObj)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.writeFileSync(envPath, newContent, 'utf8');
}

router.get('/smtp', (req, res) => {
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const isPlaceholder = /your-|example|password/i.test(user) || /your-|example|password/i.test(pass);

  res.json({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user: isPlaceholder ? '' : user,
    mailFrom: process.env.MAIL_FROM || (isPlaceholder ? '' : user),
    isConfigured: isSmtpConfigured(),
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
      isConfigured: isSmtpConfigured(),
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
    const testConfig = {
      host: host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(port || process.env.SMTP_PORT || 465),
      user: user || process.env.SMTP_USER,
      pass: pass ? pass.replace(/\s+/g, '') : process.env.SMTP_PASS
    };

    const transporter = getMailTransporter(testConfig);
    await transporter.verify();

    if (testEmail) {
      await transporter.sendMail({
        from: mailFrom || testConfig.user,
        to: testEmail,
        subject: '[MWCA Grievance System] SMTP Test Connection',
        text: 'This is a test email sent from the MWCA Grievance Management System. Your SMTP configuration is working perfectly!'
      });
      return res.json({ message: `SMTP connection verified and test email successfully sent to ${testEmail}!` });
    }

    res.json({ message: 'SMTP connection verified successfully! Credentials are valid.' });
  } catch (error) {
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      return res.status(400).json({
        message: 'SMTP Authentication Failed: Gmail requires a 16-character App Password (not your normal password). Ensure 2FA is enabled on your Google Account and generate an App Password at https://myaccount.google.com/apppasswords.'
      });
    }
    res.status(400).json({ message: `SMTP Connection Error: ${error.message}` });
  }
});

module.exports = router;
