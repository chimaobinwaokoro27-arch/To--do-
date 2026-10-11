import { useEffect, useRef, useState } from 'react';
import Sidebar from './Sidebar.jsx';
import FilterTabs from './FilterTabs.jsx';
import TaskList from './TaskList.jsx';
import TaskFormModal from './TaskFormModal.jsx';
import ThemePanel from './ThemePanel.jsx';
import BrandLogo from './BrandLogo.jsx';
import { getTasks, createTask, updateTask, deleteTask } from '../api.js';

const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

// Notification Toast component
function NotificationToast({ message, type = 'info', dismiss }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [open]);

  const className = {
    info: 'toast toast--info',
    due: 'toast toast--due',
    overdue: 'toast toast--overdue',
  }[type] || 'toast toast--info';

  return open && (
    <p className={className} role="alert">
      <span className="toast__icon" aria-hidden="true">•</span>
      <span className="toast__text">{message}</span>
      <button
        type="button"
        className="toast__dismiss"
        onClick={() => setOpen(false)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </p>
  );
}

function TodoApp({ user, onLogout, appearance }) {
  // The backend is the source of truth for tasks.
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filter, setFilter] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // On small screens the sidebar becomes a drawer this flag controls.
  const [isNavOpen, setIsNavOpen] = useState(false);

  // The Theme and appearance panel, opened from the sidebar.
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // The id of the task currently being saved, so its buttons stay disabled.
  const [busyTaskId, setBusyTaskId] = useState(null);

  // A ref guards against a duplicate request.
  const inFlightTaskId = useRef(null);

  function startTaskRequest(taskId) {
    if (inFlightTaskId.current === taskId) return false;
    inFlightTaskId.current = taskId;
    setBusyTaskId(taskId);
    return true;
  }

  function endTaskRequest() {
    inFlightTaskId.current = null;
    setBusyTaskId(null);
  }

  // { text, kind } for the green success note or the red error note.
  const [notice, setNotice] = useState(null);

  // The note disappears on its own after a few seconds.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function showNotice(text, kind = 'success') {
    setNotice({ text, kind });
  }

  // A 401 means the cookie is gone or expired, so there is nothing the user
  // could do about it: send them back to the login page with an explanation.
  function handleTaskError(error) {
    if (error.status === 401) {
      onLogout('Your session has expired. Please log in again.');
      return;
    }
    showNotice(error.message, 'error');
  }

  async function loadTasks() {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      if (error.status === 401) {
        onLogout('Your session has expired. Please log in again.');
        return;
      }
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Load this user's tasks once, when the dashboard opens.
  useEffect(() => {
    loadTasks();
  }, []);

  // Compute deadline state for each task.
  function getDeadlineInfo(task) {
    // Completed tasks always show "Completed" regardless of deadline.
    if (task.completed === 1) return { kind: 'completed', label: 'Completed', showNotification: false };

    const now = new Date();
    const deadline = new Date(task.deadline);
    const diff = deadline - now; // milliseconds

    if (diff <= 0) return { kind: 'overdue', label: 'Overdue', showNotification: true };

    const oneHour = 60 * 60 * 1000;

    if (diff > oneHour) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / 60000);
      if (hours > 0) return { kind: 'active', label: `${hours}h ${minutes}m remaining`, showNotification: false };
      return { kind: 'due', label: `${minutes}m remaining`, showNotification: true };
    }

    // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return { kind: 'due', label: `${minutes}m remaining`, showNotification: true };
  }

  // Deadline kind label for UI
  function kindLabel(kind) {
    if (kind === 'completed') return 'Completed';
    if (kind === 'overdue') return 'Overdue';
    if (kind === 'due') return 'Due Soon';
    return 'Active';
  }

  // Per-task deadline info: ['kind', 'text']
  const deadlineInfos = tasks.map((task) => {
    const info = getDeadlineInfo(task);
    return [info.kind, info.label];
  });

  // Sort tasks by deadline state then by deadline within each state.
  // State priority: Overdue(0) → Due Soon(1) → Active(2) → Completed(3)
  // Within each group, sort by deadline ascending (frontend only, DB unchanged)
  function sortTasksByState(tasks, deadlineInfos) {
    const statePriority = { overdue: 0, due: 1, active: 2, completed: 3 };
    return tasks.sort((a, b) => {
      const iA = tasks.indexOf(a);
      const iB = tasks.indexOf(b);
      const ka = deadlineInfos[iA]?.[0] ?? 'active';
      const kb = deadlineInfos[iB]?.[0] ?? 'active';
      const priorityA = statePriority[ka] ?? 99;
      const priorityB = statePriority[kb] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Same state: sort by deadline ascending
      const da = new Date(a.deadline);
      const db = new Date(b.deadline);
      return da - db;
    });
  }

  // Initial sort
  const sortedTasks = sortTasksByState([...tasks], deadlineInfos);

  // Counts based on deadline states
  const activeCount = deadlineInfos.filter(([kind]) => kind === 'active').length;
  const dueSoonCount = deadlineInfos.filter(([kind]) => kind === 'due').length;
  const overdueCount = deadlineInfos.filter(([kind]) => kind === 'overdue').length;
  const completedCount = deadlineInfos.filter(([kind]) => kind === 'completed').length;

  // Dashboard summary counts (including Overdue)
  const summaryCounts = {
    all: tasks.length,
    active: activeCount,
    dueSoon: dueSoonCount,
    overdue: overdueCount,
    completed: completedCount,
  };

  // Counts based on filter (without Overdue since filter groups differ)
  const counts = {
    all: tasks.length,
    active: activeCount,
    dueSoon: dueSoonCount,
    completed: completedCount,
  };

  // Single live timer that updates the "now" reference for all countdowns.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // refresh per minute
    return () => clearInterval(timer);
  }, []);

  // Notification state: track which tasks have shown Due Soon / Overdue notifications
  // Key: task.id, Value: {dueSoon: dateString, overdue: dateString}
  const [notificationSeen, setNotificationSeen] = useState(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('task_notifications') : null;
    return stored ? JSON.parse(stored) : {};
  });

  // Persist notification state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('task_notifications', JSON.stringify(notificationSeen));
    } catch { /* ignore storage errors */ }
  }, [notificationSeen]);

  // Check if a notification has already been shown for this task today
  function wasNotifSeen(taskId, type) {
    const record = notificationSeen[taskId];
    if (!record) return false;
    const nowDate = new Date().toDateString();
    if (type === 'dueSoon' && record.dueSoon === nowDate) return true;
    if (type === 'overdue' && record.overdue === nowDate) return true;
    return false;
  }

  function markNotifSeen(taskId, type) {
    setNotificationSeen((prev) => {
      const next = { ...prev, [taskId]: { ...prev[taskId], [type]: new Date().toDateString() } };
      return next;
    });
  }

  // Apply filter and re-sort
  const visibleTasks = sortTasksByState(
    [...tasks].filter((task) => {
      if (filter === 'active') return task.completed === 0;
      if (filter === 'completed') return task.completed === 1;
      return true;
    }),
    deadlineInfos
  );

  // Replaces one task with the copy the backend just sent back.
  function replaceTask(saved) {
    setTasks((current) => current.map((task) => (task.id === saved.id ? saved : task)));
  }

  // The checkbox: PATCH completed 1/0, then take the backend's answer.
  async function handleToggleComplete(task) {
    if (!startTaskRequest(task.id)) return;
    showNotice('');

    try {
      const saved = await updateTask(task.id, { completed: task.completed === 1 ? 0 : 1 });
      setTasks((current) => current.map((t) => (t.id === saved.id ? saved : t)));
      showNotice(saved.completed === 1 ? `"${saved.title}" marked as completed.` : `"${saved.title}" is active again.`);
    } catch (error) {
      handleTaskError(error);
    } finally {
      endTaskRequest();
    }
  }

  // Save from the edit form.
  async function handleUpdateTask(id, changes) {
    if (!startTaskRequest(id)) {
      throw new Error('This task is already being saved. Please wait.');
    }
    showNotice('');

    try {
      const saved = await updateTask(id, changes);
      setTasks((current) => current.map((t) => (t.id === saved.id ? saved : t)));
      showNotice(`"${saved.title}" updated. Reminder set for ${saved.reminderAt.replace('T', ' at ')}.`);
      return saved;
    } finally {
      endTaskRequest();
    }
  }

  // Sends a new task to the backend, then adds the returned task to the list.
  // recipientEmail is not sent: the backend always uses the signed-in email.
  async function handleCreateTask(task) {
    const created = await createTask(task);
    setTasks((current) => [created, ...current]);
    showNotice(
      `"${created.title}" created. Reminder set for ${created.reminderAt.replace('T', ' at ')}.`
    );
    return created;
  }

  async function handleDeleteTask(task) {
    if (!startTaskRequest(task.id)) return;
    showNotice('');

    try {
      await deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      showNotice(`"${task.title}" deleted.`);
    } catch (error) {
      // The task stays on screen because it was never removed.
      handleTaskError(error);
    } finally {
      endTaskRequest();
    }
  }

  // Notification area - render outside the main section flow
  const showNotifications = typeof window !== 'undefined';
  let notificationNodes = null;
  if (showNotifications) {
    notificationNodes = tasks.map((task) => {
      const info = getDeadlineInfo(task);
      if (info.kind === 'completed') return null;

      // Due Soon notification
      if (info.kind === 'due' && !wasNotifSeen(task.id, 'dueSoon')) {
        const minutes = parseInt(info.label);
        return (
          <NotificationToast
            key={`due-${task.id}`}
            message={`Task approaching: ${task.title} is due in ${minutes} minutes.`}
            type="due"
            dismiss={() => markNotifSeen(task.id, 'dueSoon')}
          />
        );
      }

      // Overdue notification
      if (info.kind === 'overdue' && !wasNotifSeen(task.id, 'overdue')) {
        return (
          <NotificationToast
            key={`overdue-${task.id}`}
            message={`Task overdue: ${task.title} has passed its deadline.`}
            type="overdue"
            dismiss={() => markNotifSeen(task.id, 'overdue')}
          />
        );
      }

      return null;
    });
  }

  return (
    <div className="layout">
      <Sidebar
        user={user}
        onAddTask={() => setIsAddOpen(true)}
        onLogout={onLogout}
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        appearance={appearance}
        onOpenPanel={() => setIsPanelOpen(true)}
      />

      {/* Tapping the dimmed background behind the mobile drawer closes it. */}
      <button
        type="button"
        className={`scrim ${isNavOpen ? 'scrim--show' : ''}`}
        aria-label="Close navigation"
        tabIndex={isNavOpen ? 0 : -1}
        onClick={() => setIsNavOpen(false)}
      />

      <div className="layout__body">
        <header className="topbar">
          <button
            type="button"
            className="topbar__menu"
            onClick={() => setIsNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isNavOpen}
            aria-controls="app-sidebar"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <span className="topbar__brand">
            <BrandLogo className="topbar__logo" decorative />
            TaskFlow
          </span>

          <button
            type="button"
            className="button button--accent button--small"
            onClick={() => setIsAddOpen(true)}
          >
            <span className="button__icon" aria-hidden="true">
              +
            </span>
            Add
          </button>
        </header>

        <main className="main">
          <div className="page-head">
            <div className="page-head__text">
              <p className="page-head__eyebrow">Dashboard</p>
              <h1 className="page-head__title">Your tasks</h1>
              <p className="page-head__subtitle">{todayLabel}</p>
            </div>

            {!isLoading && !loadError && (
              <FilterTabs activeFilter={filter} onChange={setFilter} counts={counts} />
            )}
          </div>

          {notice && notice.text && (
            <p
              className={`toast ${notice.kind === 'error' ? 'toast--error' : ''}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              <span className="toast__icon" aria-hidden="true">
                {notice.kind === 'error' ? '!' : '✓'}
              </span>
              <span className="toast__text">{notice.text}</span>
            </p>
          )}

          {isLoading ? (
            <p className="state" role="status">
              <span className="spinner" aria-hidden="true" />
              Loading tasks...
            </p>
          ) : loadError ? (
            <div className="state state--error" role="alert">
              <h3 className="state__title">Unable to load tasks.</h3>
              <p className="state__hint">{loadError}</p>
              <button type="button" className="button button--accent state__retry" onClick={loadTasks}>
                Retry
              </button>
            </div>
          ) : (
            <>
              <section className="stats" aria-label="Task summary">
                <div className="stat">
                  <span className="stat__value">{summaryCounts.all}</span>
                  <span className="stat__label">Total</span>
                </div>
                <div className="stat stat--active">
                  <span className="stat__value">{summaryCounts.active}</span>
                  <span className="stat__label">Active</span>
                </div>
                <div className="stat stat--due">
                  <span className="stat__value">{summaryCounts.dueSoon}</span>
                  <span className="stat__label">Due soon</span>
                </div>
                <div className="stat stat--overdue">
                  <span className="stat__value">{summaryCounts.overdue}</span>
                  <span className="stat__label">Overdue</span>
                </div>
                <div className="stat stat--done">
                  <span className="stat__value">{summaryCounts.completed}</span>
                  <span className="stat__label">Completed</span>
                </div>
              </section>

              <section className="board">
                <div className="board__head">
                  <h2 className="board__title">Task list</h2>
                  <span className="board__count">
                    {visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                <TaskList
                  tasks={visibleTasks}
                  filter={filter}
                  busyTaskId={busyTaskId}
                  onToggleComplete={handleToggleComplete}
                  onEdit={(task) => setEditingTask(task)}
                  onDelete={handleDeleteTask}
                  now={now}
                />
              </section>
            </>
          )}
        </main>
      </div>

      {showNotifications && notificationNodes && notificationNodes.length > 0 && (
        <div className="notification-toasts">{notificationNodes}</div>
      )}

      {isAddOpen && (
        <TaskFormModal
          userEmail={user.email}
          onClose={() => setIsAddOpen(false)}
          onCreate={handleCreateTask}
        />
      )}

      {editingTask && (
        <TaskFormModal
          userEmail={user.email}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdate={handleUpdateTask}
        />
      )}

      {isPanelOpen && (
        <ThemePanel appearance={appearance} onClose={() => setIsPanelOpen(false)} />
      )}
    </div>
  );
}

export default TodoApp;