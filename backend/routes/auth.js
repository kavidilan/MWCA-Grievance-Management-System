const express = require('express');
const { get, run } = require('../database/database');
const { verifyPassword, hashPassword, createToken, authenticate } = require('../auth');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await get('SELECT id, full_name AS fullName, email, role, division, password_hash AS passwordHash FROM users WHERE LOWER(email) = ? AND is_active = 1', [email]);
    if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({
      token: createToken({ id: user.id, role: user.role, email: user.email }),
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, division: user.division }
    });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const division = String(req.body.division || '').trim();
    const password = String(req.body.password || '');
    if (!fullName || !email) return res.status(400).json({ message: 'Name and email are required.' });
    if (password && password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const existing = await get('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [email, req.user.id]);
    if (existing) return res.status(409).json({ message: 'That email address is already in use.' });

    const updateFields = ['full_name = ?', 'email = ?', 'division = ?'];
    const values = [fullName, email, division || null, req.user.id];
    if (password) {
      updateFields.push('password_hash = ?');
      values.splice(values.length - 1, 0, hashPassword(password));
    }

    await run(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, values);
    const updated = await get('SELECT id, full_name AS fullName, email, role, division FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: { id: updated.id, fullName: updated.fullName, email: updated.email, role: updated.role, division: updated.division } });
  } catch (error) { next(error); }
});

module.exports = router;