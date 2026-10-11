import 'dotenv/config';
import app from './app.js';
import { initDatabase } from './config/db.js';
import { startReminderScheduler } from './services/reminderService.js';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  // PostgreSQL schema is created (or already exists) before anything listens,
  // so the API never answers before the database is ready.
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  startReminderScheduler();
}

start().catch((error) => {
  console.error('Failed to start the API:', error?.message || error);
  process.exit(1);
});