import { THEMES } from '../theme/theme.js';

// A radio group of the four themes. Each option shows its name, a couple of
// colour swatches and a check mark when it is the selected one.
function ThemeSelector({ theme, onChange }) {
  return (
    <div className="theme-picker">
      <span className="theme-picker__label" id="theme-picker-label">
        Theme
      </span>

      <div
        className="theme-picker__list"
        role="radiogroup"
        aria-labelledby="theme-picker-label"
      >
        {THEMES.map((option) => {
          const isActive = option.id === theme;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              className={`theme-option ${isActive ? 'theme-option--active' : ''}`}
              onClick={() => onChange(option.id)}
            >
              <span className="theme-option__swatches" aria-hidden="true">
                {option.swatches.map((color) => (
                  <span
                    key={color}
                    className="theme-option__swatch"
                    style={{ background: color }}
                  />
                ))}
              </span>

              <span className="theme-option__name">{option.name}</span>

              <span className="theme-option__check" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ThemeSelector;
