import TaskCard from './TaskCard.jsx';

function TaskList({ tasks, filter, busyTaskId, onToggleComplete, onEdit, onDelete, now }) {
  if (tasks.length === 0) {
    return (
      <div className="empty">
        <div className="empty__icon" aria-hidden="true">
          ✓
        </div>
        <h3 className="empty__title">No tasks here yet</h3>
        <p className="empty__text">
          {filter === 'all'
            ? 'Add your first task to get a deadline and an automatic email reminder.'
            : `You have no ${filter} tasks right now. Try another filter or add a new task.`}
        </p>
      </div>
    );
  }

  return (
    <ul className="cards">
      {tasks.map((task) => (
        <li key={task.id} className="cards__item">
          <TaskCard
            task={task}
            isBusy={busyTaskId === task.id}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
            now={now}
          />
        </li>
      ))}
    </ul>
  );
}

export default TaskList;
