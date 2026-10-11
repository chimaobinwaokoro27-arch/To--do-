import 'dotenv/config';
import app from './app.js';
import { initDatabase } from './config/db.js';
import { startReminderScheduler } from './services/reminderService.js';

const PORT = Number(process.env.PORT) || 5000;

initDatabase();

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

startReminderScheduler();
