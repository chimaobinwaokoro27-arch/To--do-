import { useState } from 'react';
import { formatDateTime, formatTime, formatReminderLead } from '../utils/date.js';

function TaskCard({ task, isBusy, onToggleComplete, onEdit, onDelete, now }) {
  // The backend stores completed as 0 or 1.
  const isCompleted = task.completed === 1;

  // The delete button asks first, so a mis-click cannot lose a task.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Determine the deadline kind and countdown text using the shared `now`.
  let deadlineKind = 'active';
  let countdownText = '';

  if (isCompleted) {
    deadlineKind = 'completed';
    countdownText = 'Completed';
  } else {
    const deadline = new Date(task.deadline);
    const diff = deadline - (now || new Date()); // milliseconds

    if (diff <= 0) {
      deadlineKind = 'overdue';
      countdownText = 'Overdue';
    } else {
      const oneHour = 60 * 60 * 1000;

      if (diff > oneHour) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const minutes = Math.floor((diff % (60 * 60 * 1000)) / 60000);
        if (hours > 0) {
          countdownText = `${hours}h ${minutes}m remaining`;
        } else {
          countdownText = `${minutes}m remaining`;
        }
        deadlineKind = 'active';
      } else {
        // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        countdownText = `${minutes}m remaining`;
        deadlineKind = 'due';
      }
    }
  }

  // Reminder status text.
  let reminderStatus = 'Reminder scheduled';
  if (task.emailSent === 1) {
    reminderStatus = 'Reminder sent';
  } else if (isCompleted) {
    reminderStatus = 'Task completed';
  }

  // Build the card class based on deadline kind.
  let cardClass = 'card';
  if (deadlineKind === 'completed') cardClass += ' card--completed';

  return (
    <article className={cardClass}>
      <div className="card__top">
        <label className="card__check">
          <input
            type="checkbox"
            checked={isCompleted}
            disabled={isBusy}
            onChange={() => onToggleComplete(task)}
          />
          <span className="card__box" aria-hidden="true" />
          <span className="card__status">
            {isCompleted ? 'Completed' : 'Active'}
          </span>
        </label>
      </div>

      <h3 className="card__title">{task.title}</h3>
      {task.description && <p className="card__description">{task.description}</p>}

      <dl className="card__meta">
        <div className="card__row">
          <dt>Deadline</dt>
          <dd>{formatDateTime(task.deadline)}</dd>
        </div>
        {countdownText && (
          <div className="card__row">
            <dt>Time remaining</dt>
            <dd>{countdownText}</dd>
          </div>
        )}
        <div className="card__row">
          <dt>Reminder</dt>
          <dd>
            {formatReminderLead(task.reminderMinutes)} &middot; {formatTime(task.reminderAt)}
          </dd>
        </div>
        <div className="card__row">
          <dt>Status</dt>
          <dd>{reminderStatus}</dd>
        </div>
        <div className="card__row">
          <dt>Email to</dt>
          <dd>{task.recipientEmail}</dd>
        </div>
      </dl>
      {deadlineKind === 'overdue' && (
        <p className="card__overdue">Overdue</p>
      )}

      {isConfirmingDelete ? (
        <div className="card__confirm" role="alertdialog" aria-label="Delete this task">
          <p className="card__confirm-text">Delete this task?</p>
          <div className="card__confirm-actions">
            <button
              type="button"
              className="button button--small button--ghost"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isBusy}
            >
              No
            </button>
            <button
              type="button"
              className="button button--small button--danger"
              onClick={() => onDelete(task)}
              disabled={isBusy}
            >
              {isBusy ? 'Deleting...' : 'Yes, delete'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card__actions">
          <button
            type="button"
            className="button button--small button--ghost"
            onClick={() => onEdit(task)}
            disabled={isBusy}
          >
            Edit
          </button>
          <button
            type="button"
            className="button button--small button--danger-ghost"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isBusy}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}

export default TaskCard;