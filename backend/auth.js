const crypto = require('node:crypto');
const { get, run } = require('./database/database');

const secret = process.env.AUTH_SECRET || 'change-this-mwca-secret';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createToken(user) {
  const payload = encode({ sub: user.id, role: user.role, exp: Date.now() + 8 * 60 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data : null;
  } catch (error) { return null; }
}

async function ensureDefaultUsers() {
  const users = [
    ['System Administrator', 'admin@mwca.gov', 'Admin@123', 'ADMIN'],
    ['Standard User', 'user@mwca.gov', 'User@123', 'USER'],
    ['Case Officer', 'officer@mwca.gov', 'Officer@123', 'OFFICER'],
    ['Case Reviewer', 'reviewer@mwca.gov', 'Reviewer@123', 'REVIEWER'],
    ['Read Only User', 'viewer@mwca.gov', 'Viewer@123', 'VIEWER']
  ];
  for (const [fullName, email, password, role] of users) {
    if (!(await get('SELECT id FROM users WHERE email = ?', [email]))) {
      await run('INSERT INTO users (full_name, email, password_hash, role, division) VALUES (?, ?, ?, ?, ?)', [fullName, email, hashPassword(password), role, 'MWCA']);
    }
  }
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const data = readToken(token);
  if (!data) return res.status(401).json({ message: 'Authentication required.' });
  get('SELECT id, full_name, email, role, division FROM users WHERE id = ? AND is_active = 1', [data.sub])
    .then(user => {
      if (!user) return res.status(401).json({ message: 'User account is inactive.' });
      req.user = user;
      next();
    }).catch(next);
}

function authorize(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Your role does not have permission for this action.' });
}

module.exports = { hashPassword, verifyPassword, createToken, authenticate, authorize, ensureDefaultUsers };
