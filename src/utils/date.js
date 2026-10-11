// Small date helpers so the UI shows friendly dates while the raw value
// from the backend ("2026-09-30T18:00:00") is never changed.

function toDate(localIsoString) {
  const date = new Date(localIsoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(localIsoString) {
  const date = toDate(localIsoString);
  if (!date) return '-';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(localIsoString) {
  const date = toDate(localIsoString);
  if (!date) return '-';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function isToday(localIsoString) {
  const date = toDate(localIsoString);
  if (!date) return false;

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// "Sep 30, 2026 at 6:00 PM", or "Today at 6:00 PM" for a task due today.
export function formatDateTime(localIsoString) {
  if (!localIsoString) return '-';
  if (isToday(localIsoString)) return `Today at ${formatTime(localIsoString)}`;
  return `${formatDate(localIsoString)} at ${formatTime(localIsoString)}`;
}

// Splits "2026-09-30T18:00:00" into the values an <input type="date"> and an
// <input type="time"> need. The text is simply cut, so the local time the
// backend stored is never shifted by a timezone.
export function toDateInputValue(localIsoString) {
  return (localIsoString || '').slice(0, 10);
}

export function toTimeInputValue(localIsoString) {
  return (localIsoString || '').slice(11, 16);
}

// Turns the backend's reminderMinutes into readable text.
export function formatReminderLead(minutes) {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)} day before`;
  if (minutes >= 60) return `${Math.round(minutes / 60)} hour before`;
  return `${minutes} min before`;
}
