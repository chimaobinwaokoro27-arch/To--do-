import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { applyTheme, readStoredMode, readStoredTheme } from './theme/theme.js';
import { applyAppearanceVars, readStoredAppearance } from './theme/appearance.js';

// Apply the saved theme and glass settings before the first paint so a refresh
// never flashes the default look, and so the login screen (which has no sidebar
// to read them from) is themed too.
applyTheme(readStoredTheme(), readStoredMode());
applyAppearanceVars(readStoredAppearance());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
