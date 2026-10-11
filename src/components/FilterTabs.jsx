const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

function FilterTabs({ activeFilter, onChange, counts }) {
  return (
    <div className="filters" role="group" aria-label="Filter tasks">
      {FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          className={`filters__tab ${activeFilter === filter.id ? 'filters__tab--active' : ''}`}
          aria-pressed={activeFilter === filter.id}
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
          <span className="filters__count">{counts[filter.id]}</span>
        </button>
      ))}
    </div>
  );
}

export default FilterTabs;
