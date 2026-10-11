import { useRef, useState } from 'react';
import { toDateInputValue, toTimeInputValue } from '../utils/date.js';

const REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  date: '',
  time: '',
  reminderMinutes: '60',
};

const formatTime = (date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// Combines the date and time inputs into the format the backend expects.
function buildDeadline(date, time) {
  return `${date}T${time}:00`;
}

// Fills the form with a task's current values when editing it.
function formFromTask(task) {
  return {
    title: task.title,
    description: task.description || '',
    date: toDateInputValue(task.deadline),
    time: toTimeInputValue(task.deadline),
    reminderMinutes: String(task.reminderMinutes),
  };
}

// Pass a `task` to edit it, leave it out to create a new one.
function TaskFormModal({ userEmail, task, onClose, onCreate, onUpdate }) {
  const isEditing = Boolean(task);

  const [form, setForm] = useState(() => (isEditing ? formFromTask(task) : EMPTY_FORM));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // The reminder time is deadline - reminderMinutes. If that moment is already
  // in the past, the backend would reject the task, so we warn before sending.
  function getReminderWarning() {
    if (!form.date || !form.time || !form.reminderMinutes) return '';

    const deadline = new Date(buildDeadline(form.date, form.time));
    if (Number.isNaN(deadline.getTime())) return '';

    const reminderMinutes = Number(form.reminderMinutes);
    const reminderTime = new Date(deadline.getTime() - reminderMinutes * 60 * 1000);

    if (reminderTime <= new Date()) {
      return `That reminder time (${formatTime(reminderTime)}) has already passed. ` +
        'Please pick a later deadline or a shorter reminder.';
    }
    return '';
  }

  const reminderWarning = getReminderWarning();

  function validate() {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!form.date) nextErrors.date = 'Deadline date is required';
    if (!form.time) nextErrors.time = 'Deadline time is required';
    if (!form.reminderMinutes) nextErrors.reminderMinutes = 'Please choose a reminder time';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // A ref guard, because the disabled button only takes effect once React has
    // re-rendered. Two submits in the same tick would otherwise both be sent.
    if (isSavingRef.current) return;

    setServerError('');

    if (!validate()) return;
    if (reminderWarning) return;

    isSavingRef.current = true;
    setIsSaving(true);

    // Only the fields the user may change. No recipientEmail, no userId and no
    // emailSent: the backend owns reminderAt and the reminder recipient.
    const values = {
      title: form.title.trim(),
      description: form.description.trim(),
      deadline: buildDeadline(form.date, form.time),
      reminderMinutes: Number(form.reminderMinutes),
    };

    try {
      if (isEditing) {
        const saved = await onUpdate(task.id, values);
        setErrors({});
        onClose(saved);
      } else {
        const created = await onCreate(values);
        setForm(EMPTY_FORM);
        setErrors({});
        onClose(created);
      }
    } catch (error) {
      // Keep the form open with the values the user typed so they can retry.
      setServerError(error.message);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={isEditing ? 'Edit task' : 'Add task'}>
      <div className="modal__box modal__box--form">
        <div className="modal__head">
          <h2 className="modal__title">{isEditing ? 'Edit task' : 'Add a task'}</h2>
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form__group">
            <label className="form__label" htmlFor="title">
              Task title
            </label>
            <input
              id="title"
              className="form__input"
              type="text"
              placeholder="Submit frontend assignment"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
            {errors.title && <p className="form__error">{errors.title}</p>}
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="description">
              Description <span className="form__optional">optional</span>
            </label>
            <textarea
              id="description"
              className="form__input form__input--area"
              rows="2"
              placeholder="Finish the React assignment"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </div>

          <div className="form__row">
            <div className="form__group">
              <label className="form__label" htmlFor="date">
                Deadline date
              </label>
              <input
                id="date"
                className="form__input"
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
              />
              {errors.date && <p className="form__error">{errors.date}</p>}
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="time">
                Deadline time
              </label>
              <input
                id="time"
                className="form__input"
                type="time"
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
              />
              {errors.time && <p className="form__error">{errors.time}</p>}
            </div>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="reminder">
              Email reminder
            </label>
            <select
              id="reminder"
              className="form__input"
              value={form.reminderMinutes}
              onChange={(event) => updateField('reminderMinutes', event.target.value)}
            >
              {REMINDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.reminderMinutes && <p className="form__error">{errors.reminderMinutes}</p>}
            {reminderWarning && <p className="form__warning">{reminderWarning}</p>}
          </div>

          {/* Read-only: the reminder always goes to the signed-in account. */}
          <div className="form__group">
            <span className="form__label">Reminder will be sent to</span>
            <p className="form__note">
              <span aria-hidden="true">&#9993;</span>
              {userEmail}
            </p>
          </div>

          {serverError && <p className="form__error form__error--server">{serverError}</p>}

          <div className="form__actions">
            <button type="button" className="button button--ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="submit"
              className="button button--accent"
              disabled={isSaving || Boolean(reminderWarning)}
            >
              {isSaving
                ? isEditing ? 'Saving...' : 'Creating...'
                : isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskFormModal;
