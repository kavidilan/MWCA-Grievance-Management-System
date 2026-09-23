require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase, databasePath } = require('./database/database');
const grievanceRoutes = require('./routes/grievances');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const { ensureDefaultUsers } = require('./auth');

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'success', message: 'WCA grievance SQLite API is running.' }));
app.get('/api/docs', (req, res) => res.json({
  name: 'MWCA Grievance SQLite API',
  database: databasePath,
  endpoints: ['POST /api/auth/login', 'GET /api/auth/me', 'GET /api/grievances', 'GET /api/grievances/statistics', 'GET /api/grievances/:id', 'POST /api/grievances', 'PATCH /api/grievances/:id', 'PATCH /api/grievances/:id/status', 'DELETE /api/grievances/:id']
}));

app.use((error, req, res, next) => {
  console.error('❌ SQLite Server Error:', error);
  res.status(error.status || 500).json({ message: error.message || 'An unexpected server error occurred.' });
});

async function startServer() {
  try {
    await initializeDatabase();
    await ensureDefaultUsers();

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`✅ MWCA Grievance System running with SQLite on http://localhost:${port}`);
      console.log(`💾 Connected SQLite database: ${databasePath}`);
      console.log(`📊 API Documentation: http://localhost:${port}/api/docs`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`\n⚠️  Port ${port} is already in use by an active backend server process.`);
        console.log(`✅ The MWCA Grievance backend API is ALREADY RUNNING on http://localhost:${port}`);
        console.log(`   You can open http://localhost:3000 (or http://localhost:5173) in your browser to use the system.\n`);
        process.exit(0);
      } else {
        console.error('❌ SQLite Server Error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

startServer();
