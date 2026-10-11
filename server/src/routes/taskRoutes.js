import express from 'express';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  nowLocalIsoString,
  parseDateInput,
  calculateReminderAt,
  toLocalIsoString,
} from '../utils/dateTime.js';

const router = express.Router();

// Every task request needs a logged-in user. The user id always comes from
// the JWT cookie, never from the request body.
router.use(requireAuth);

const MAX_REMINDER_MINUTES = 60 * 24 * 7; // 7 days

const insertTask = db.prepare(`
  INSERT INTO tasks (title, description, deadline, reminderMinutes, reminderAt, recipientEmail, completed, emailSent, createdAt, userId)
  VALUES (@title, @description, @deadline, @reminderMinutes, @reminderAt, @recipientEmail, 0, 0, @createdAt, @userId)
`);

// Every statement filters on userId as well as the id, so another person's
// task simply does not exist as far as this request is concerned.
const selectAllForUser = db.prepare(
  'SELECT * FROM tasks WHERE userId = ? ORDER BY deadline ASC, id ASC'
);
const selectOwnedById = db.prepare('SELECT * FROM tasks WHERE id = ? AND userId = ?');
const updateOwnedById = db.prepare(`
  UPDATE tasks
  SET title = @title,
      description = @description,
      deadline = @deadline,
      reminderMinutes = @reminderMinutes,
      reminderAt = @reminderAt,
      recipientEmail = @recipientEmail,
      completed = @completed
  WHERE id = @id AND userId = @userId
`);
const deleteOwnedById = db.prepare('DELETE FROM tasks WHERE id = ? AND userId = ?');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

function parseReminderMinutes(value) {
  if (value === undefined || value === null || value === '') return 60;

  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_REMINDER_MINUTES) {
    throw new ValidationError(
      `reminderMinutes must be a whole number between 0 and ${MAX_REMINDER_MINUTES}`
    );
  }
  return minutes;
}

function parseCompleted(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false') return 0;
  throw new ValidationError('completed must be true/false (or 1/0)');
}

/**
 * Reads the fields the user is allowed to change.
 * `userEmail` comes from the signed-in account, so nobody can send a reminder
 * to an address they do not own. `userId` and `emailSent` in the request body
 * are simply never looked at.
 */
function buildTaskValues(body, currentTask, userEmail) {
  const title = body.title !== undefined ? String(body.title).trim() : currentTask?.title;
  if (!title) throw new ValidationError('title is required');

  const description =
    body.description !== undefined ? String(body.description) : currentTask?.description || '';

  const deadlineInput = body.deadline !== undefined ? body.deadline : currentTask?.deadline;
  if (deadlineInput === undefined || deadlineInput === null || deadlineInput === '') {
    throw new ValidationError('deadline is required');
  }
  const deadlineDate = parseDateInput(deadlineInput);
  if (!deadlineDate) throw new ValidationError('deadline is not a valid date');
  const deadline = toLocalIsoString(deadlineDate);

  const reminderMinutes =
    body.reminderMinutes !== undefined
      ? parseReminderMinutes(body.reminderMinutes)
      : currentTask?.reminderMinutes ?? 60;

  const completed =
    body.completed !== undefined ? parseCompleted(body.completed) : currentTask?.completed ?? 0;

  return { title, description, deadline, reminderMinutes, completed, deadlineDate, userEmail };
}

router.post('/', (req, res, next) => {
  try {
    const body = req.body || {};
    const { title, description, deadline, reminderMinutes, deadlineDate, userEmail } =
      buildTaskValues(body, null, req.user.email);

    const reminderAt = calculateReminderAt(deadlineDate, reminderMinutes);
    if (reminderAt <= nowLocalIsoString()) {
      throw new ValidationError(
        `The reminder time (${reminderAt}) is already in the past. ` +
          'Pick a later deadline or a smaller reminderMinutes value.'
      );
    }

    const createdAt = nowLocalIsoString();
    const result = insertTask.run({
      title,
      description,
      deadline,
      reminderMinutes,
      reminderAt,
      recipientEmail: userEmail,
      createdAt,
      userId: req.user.id, // always the signed-in user
    });

    const task = selectOwnedById.get(result.lastInsertRowid, req.user.id);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.get('/', (req, res, next) => {
  try {
    res.json(selectAllForUser.all(req.user.id));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    // A task that belongs to somebody else is reported as "not found" instead
    // of "forbidden", so its existence is never revealed.
    const task = selectOwnedById.get(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', (req, res, next) => {
  try {
    const currentTask = selectOwnedById.get(req.params.id, req.user.id);
    if (!currentTask) return res.status(404).json({ error: 'Task not found' });

    const body = req.body || {};
    const values = buildTaskValues(body, currentTask, req.user.email);

    const deadlineChanged = body.deadline !== undefined;
    const reminderChanged = body.reminderMinutes !== undefined;
    const isReopened = currentTask.completed === 1 && values.completed === 0;

    let reminderAt = currentTask.reminderAt;

    if (deadlineChanged || reminderChanged) {
      reminderAt = calculateReminderAt(values.deadlineDate, values.reminderMinutes);

      if (reminderAt <= nowLocalIsoString() && !isReopened) {
        throw new ValidationError(
          `The new reminder time (${reminderAt}) is already in the past. ` +
            'Pick a later deadline or a smaller reminderMinutes value.'
        );
      }
    }

    if (isReopened && reminderAt <= nowLocalIsoString()) {
      // Reopening must not fire a stale reminder right away, so the task is
      // re-armed from "now" and the scheduler picks it up on its next run.
      reminderAt = nowLocalIsoString();
    }

    // emailSent is deliberately not in this list, so an update can never
    // hand a task a second reminder email.
    updateOwnedById.run({
      id: currentTask.id,
      userId: req.user.id,
      title: values.title,
      description: values.description,
      deadline: values.deadline,
      reminderMinutes: values.reminderMinutes,
      reminderAt,
      recipientEmail: values.userEmail,
      completed: values.completed,
    });

    res.json(selectOwnedById.get(currentTask.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const result = deleteOwnedById.run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted', id: Number(req.params.id) });
  } catch (error) {
    next(error);
  }
});

export { ValidationError };
export default router;
