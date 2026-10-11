// The backend address.
//
// Locally this falls back to the Express dev server on port 5000. In
// production set VITE_API_URL (for example https://your-api-host) in the
// frontend host's environment settings - it is baked in at build time, so it
// must never contain secrets (anything here is visible to the browser).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * One place for every call to the backend.
 *
 * `credentials: 'include'` makes the browser send the login cookie. The cookie
 * is HTTP-only, so JavaScript cannot read it and it is never saved in
 * localStorage. That cookie is the whole session.
 */
async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new Error(`Could not reach the backend at ${API_URL}. Is the server running?`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // The backend sends { "error": "..." } for every failure.
    const error = new Error(messageFor(response.status, data?.error, options.statusMessages));
    error.status = response.status;
    throw error;
  }

  return data;
}

/**
 * Turns a status code into something worth showing. A 400 keeps the backend's
 * own wording because it explains exactly what was wrong with the input.
 */
function messageFor(status, backendMessage, overrides) {
  if (overrides && overrides[status]) return overrides[status];
  if (status === 500) return 'Something went wrong. Please try again.';
  return backendMessage || 'Something went wrong. Please try again.';
}

/* ------------------------------------------------------------- account */

// Returns { id, email } for the signed-in user.
// Throws an error with status 401 when there is no valid login cookie.
export function getCurrentUser() {
  return request('/api/auth/me');
}

export function register({ email, password }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

/* --------------------------------------------------------------- tasks */

// The wording we show when a task request fails.
const TASK_ERRORS = {
  401: 'Your session has expired. Please log in again.',
  404: 'Task not found.',
  500: 'Something went wrong. Please try again.',
};

// All tasks of the signed-in user, already sorted by deadline.
export function getTasks() {
  return request('/api/tasks');
}

// Throws an Error with a readable message so the form can show it.
export function createTask(task) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

// Sends only the fields the user is allowed to change. reminderAt is never
// included: the backend recalculates it from deadline and reminderMinutes.
export function updateTask(id, changes) {
  return request(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
    statusMessages: TASK_ERRORS,
  });
}

export function deleteTask(id) {
  return request(`/api/tasks/${id}`, {
    method: 'DELETE',
    statusMessages: TASK_ERRORS,
  });
}
