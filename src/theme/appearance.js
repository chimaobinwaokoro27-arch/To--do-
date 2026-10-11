// ---------------------------------------------------------------------------
// Appearance preferences: the selected background, the rotation setting and the
// three glass sliders. All of it lives in one small JSON blob in localStorage -
// no image data, only numbers and short strings - and is mirrored onto <html>
// as CSS custom properties so the panels restyle without a React re-render of
// every component.
//
// Custom uploads are the one thing that can be large, so they live in
// IndexedDB instead (see customImage.js).
// ---------------------------------------------------------------------------

import {
  BACKGROUNDS,
  CUSTOM_BACKGROUND_ID,
  DEFAULT_APPEARANCE,
  isRotationId,
} from './backgrounds.js';

const STORAGE_KEY = 'taskflow:appearance';

// Slider ranges, shared by the panel inputs and the sanitiser so the UI can
// never write a value the app cannot render.
export const LIMITS = {
  blur: { min: 0, max: 40 },
  transparency: { min: 0, max: 100 },
  overlay: { min: 0, max: 100 },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked storage: the choice simply will not survive a refresh.
  }
}

// Turns anything (missing, partial, corrupt, out of range) into a valid set of
// preferences. Every field falls back to the default independently.
export function sanitizeAppearance(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};

  const isKnownBackground =
    input.backgroundId === CUSTOM_BACKGROUND_ID ||
    BACKGROUNDS.some((entry) => entry.id === input.backgroundId);

  const blur = Number(input.blur);
  const transparency = Number(input.transparency);
  const overlay = Number(input.overlay);

  return {
    backgroundId: isKnownBackground ? input.backgroundId : DEFAULT_APPEARANCE.backgroundId,
    rotation: isRotationId(input.rotation) ? input.rotation : DEFAULT_APPEARANCE.rotation,
    blur: Number.isFinite(blur)
      ? clamp(blur, LIMITS.blur.min, LIMITS.blur.max)
      : DEFAULT_APPEARANCE.blur,
    transparency: Number.isFinite(transparency)
      ? clamp(transparency, LIMITS.transparency.min, LIMITS.transparency.max)
      : DEFAULT_APPEARANCE.transparency,
    overlay: Number.isFinite(overlay)
      ? clamp(overlay, LIMITS.overlay.min, LIMITS.overlay.max)
      : DEFAULT_APPEARANCE.overlay,
  };
}

export function readStoredAppearance() {
  const saved = readStorage(STORAGE_KEY);
  if (!saved) return { ...DEFAULT_APPEARANCE };

  try {
    return sanitizeAppearance(JSON.parse(saved));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(settings) {
  writeStorage(STORAGE_KEY, JSON.stringify(settings));
}

// "Panel transparency" reads naturally when a bigger number means a more
// see-through panel, so the slider is inverted here: 100% -> faint glass,
// 0% -> almost solid.
export function glassAlphaFromTransparency(transparency) {
  const value = clamp(transparency, LIMITS.transparency.min, LIMITS.transparency.max);
  return 0.54 - (value / 100) * 0.5;
}

// The overlay strength is a straight percentage of full opacity.
export function overlayAlphaFromStrength(overlay) {
  const value = clamp(overlay, LIMITS.overlay.min, LIMITS.overlay.max);
  return (value / 100) * 0.85;
}

// Mirrors the preferences onto <html>. Called before the first paint (so a
// refresh never flashes the wrong glass) and again whenever React state changes.
export function applyAppearanceVars(settings) {
  const root = document.documentElement;
  root.style.setProperty('--glass-alpha', glassAlphaFromTransparency(settings.transparency).toFixed(3));
  root.style.setProperty('--overlay-alpha', overlayAlphaFromStrength(settings.overlay).toFixed(3));
  root.style.setProperty('--blur-base', `${settings.blur}px`);
}
