import cron from 'node-cron';
import { db } from '../config/db.js';
import { nowLocalIsoString } from '../utils/dateTime.js';
import { sendReminderEmail, describeEmailErrors } from './emailService.js';

// The join only decides which address the reminder goes to: a task always
// emails the account that owns it.
const findDueTasks = db.prepare(`
  SELECT tasks.*, users.email AS ownerEmail
  FROM tasks
  LEFT JOIN users ON users.id = tasks.userId
  WHERE tasks.emailSent = 0
    AND tasks.completed = 0
    AND tasks.reminderAt <= ?
  ORDER BY tasks.reminderAt ASC
`);

const markEmailSent = db.prepare('UPDATE tasks SET emailSent = 1 WHERE id = ?');

let isRunning = false;

/**
 * Sends a reminder for every task whose reminder time has been reached.
 * emailSent is only set to 1 when the email actually succeeded, so a
 * failed email is retried on the next run instead of being lost.
 */
export async function checkReminders() {
  if (isRunning) return 0;
  isRunning = true;

  const now = nowLocalIsoString();
  const dueTasks = findDueTasks.all(now);

  try {
    if (dueTasks.length === 0) return 0;

    console.log(`Reminder check at ${now}: ${dueTasks.length} task(s) due`);

    let sent = 0;

    for (const task of dueTasks) {
      try {
        // Tasks created before accounts existed have no owner, so the address
        // stored on the task itself is used for those.
        const recipientEmail = task.ownerEmail || task.recipientEmail;

        await sendReminderEmail({ ...task, recipientEmail });
        markEmailSent.run(task.id);
        sent += 1;
      } catch (error) {
        const { code, message } = describeEmailErrors(error);
        console.error(`Failed to send reminder for task #${task.id} (${code}): ${message}`);
      }
    }

    console.log(`Reminder check finished: ${sent}/${dueTasks.length} email(s) sent`);
    return sent;
  } finally {
    isRunning = false;
  }
}

export function startReminderScheduler() {
  const isEmailReady = Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

  if (!isEmailReady) {
    console.warn(
      'Reminder scheduler disabled: EMAIL_USER and EMAIL_APP_PASSWORD are missing in .env'
    );
    return null;
  }

  const job = cron.schedule('* * * * *', () => {
    checkReminders().catch((error) => {
      console.error('Reminder scheduler error:', error?.message || error);
    });
  });

  // Catch up on reminders that became due while the server was not running.
  checkReminders().catch((error) => {
    console.error('Initial reminder check error:', error?.message || error);
  });

  console.log('Reminder scheduler started (checks every minute)');
  return job;
}
