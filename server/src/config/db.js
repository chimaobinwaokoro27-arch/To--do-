import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(currentDir, '..', '..', 'data');

fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dataDir, 'todo.db');

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Lets SQLite itself block rows that point at a user that does not exist.
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    email        TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    createdAt    TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    description     TEXT,
    deadline        TEXT NOT NULL,
    reminderMinutes INTEGER NOT NULL DEFAULT 60,
    reminderAt      TEXT NOT NULL,
    recipientEmail  TEXT NOT NULL,
    completed       INTEGER NOT NULL DEFAULT 0,
    emailSent       INTEGER NOT NULL DEFAULT 0,
    createdAt       TEXT NOT NULL,
    userId          INTEGER REFERENCES users(id)
  );
`);

// Databases created before accounts existed have no userId column. We add the
// column instead of recreating the table, so no task is ever thrown away.
// Tasks that stay NULL belong to nobody and are never shown to any user.
const taskColumns = db.prepare('PRAGMA table_info(tasks)').all().map((column) => column.name);
if (!taskColumns.includes('userId')) {
  db.exec('ALTER TABLE tasks ADD COLUMN userId INTEGER REFERENCES users(id)');
  console.log('Database updated: added the tasks.userId column');
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (userId);
  CREATE INDEX IF NOT EXISTS idx_tasks_reminder_due ON tasks (emailSent, completed, reminderAt);
`);

export function initDatabase() {
  const { count: taskCount } = db.prepare('SELECT COUNT(*) AS count FROM tasks').get();
  const { count: userCount } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  const { count: unownedCount } = db
    .prepare('SELECT COUNT(*) AS count FROM tasks WHERE userId IS NULL')
    .get();

  console.log(`Database ready at ${dbPath}`);
  console.log(`${taskCount} task(s) stored, ${userCount} user(s) registered`);

  if (unownedCount > 0) {
    console.log(`${unownedCount} older task(s) have no owner and stay hidden from every user`);
  }
}

export default db;
