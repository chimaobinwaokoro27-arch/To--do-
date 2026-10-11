// ---------------------------------------------------------------------------
// Theme system - one place that knows about the four visual themes, the
// light/dark appearance mode, and how the choice is remembered.
//
// The choice is mirrored onto <html> as two attributes:
//   data-theme = midnight | crystal | aurora | rose
//   data-mode  = dark | light
// Every colour in index.css hangs off a [data-theme][data-mode] selector, so
// changing these two attributes restyles the whole app without a reload.
// ---------------------------------------------------------------------------

export const THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Glass',
    swatches: ['#141a3a', '#7c5cff', '#3b82f6'],
  },
  {
    id: 'crystal',
    name: 'Crystal Light',
    swatches: ['#eef2ff', '#a78bfa', '#60a5fa'],
  },
  {
    id: 'aurora',
    name: 'Aurora Glass',
    swatches: ['#052e2b', '#10d9a3', '#22d3ee'],
  },
  {
    id: 'rose',
    name: 'Rose Glass',
    swatches: ['#2a0f2e', '#f472b6', '#a855f7'],
  },
];

export const DEFAULT_THEME = 'midnight';
export const DEFAULT_MODE = 'dark';

const THEME_IDS = THEMES.map((theme) => theme.id);

const STORAGE_THEME = 'taskflow:theme';
const STORAGE_MODE = 'taskflow:mode';

// The key the previous single light/dark toggle used. We still read it once so
// an existing user keeps their choice instead of being reset.
const LEGACY_STORAGE_KEY = 'theme';

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private mode or a blocked storage: fall back to the defaults.
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The choice simply will not survive a refresh; the UI still works.
  }
}

export function readStoredTheme() {
  const saved = readStorage(STORAGE_THEME);
  return THEME_IDS.includes(saved) ? saved : DEFAULT_THEME;
}

export function readStoredMode() {
  const saved = readStorage(STORAGE_MODE);
  if (saved === 'dark' || saved === 'light') return saved;

  const legacy = readStorage(LEGACY_STORAGE_KEY);
  return legacy === 'dark' || legacy === 'light' ? legacy : DEFAULT_MODE;
}

export function saveTheme(theme) {
  writeStorage(STORAGE_THEME, theme);
}

export function saveMode(mode) {
  writeStorage(STORAGE_MODE, mode);
}

// Applies the choice to <html>. Called once before the first paint and again
// whenever React state changes, so there is never a flash of the wrong theme.
export function applyTheme(theme, mode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.mode = mode;
}
