import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyTheme, readStoredMode, readStoredTheme, saveMode, saveTheme } from './theme.js';
import {
  BACKGROUNDS,
  CUSTOM_BACKGROUND_ID,
  DEFAULT_APPEARANCE,
  backgroundById,
  nextBackgroundId,
  rotationIntervalMs,
} from './backgrounds.js';
import {
  applyAppearanceVars,
  readStoredAppearance,
  saveAppearance,
} from './appearance.js';
import { deleteCustomImage, loadCustomImage, saveCustomImage } from './customImage.js';

// Guards the "When the app opens" rotation against React StrictMode, which
// mounts effects twice in development, and against a fast refresh.
const OPEN_ROTATION_KEY = 'taskflow:bg-opened-at';
const OPEN_ROTATION_GAP_MS = 60 * 1000;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function readOpenedAt() {
  try {
    return Number(localStorage.getItem(OPEN_ROTATION_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeOpenedAt(value) {
  try {
    localStorage.setItem(OPEN_ROTATION_KEY, String(value));
  } catch {
    // Non-fatal: rotation may repeat once, nothing breaks.
  }
}

// Owns everything about how the app looks: the accent theme, the light/dark
// mode, and the appearance preferences (background, rotation, glass sliders).
// It is created once in App and passed down, which keeps the background layer
// and the appearance panel reading from a single source of truth.
export function useAppearance() {
  const [theme, setTheme] = useState(readStoredTheme);
  const [mode, setMode] = useState(readStoredMode);
  const [settings, setSettings] = useState(readStoredAppearance);
  const [customImageUrl, setCustomImageUrl] = useState(null);

  // The custom upload's live blob URL, plus every blob URL that has not been
  // freed yet. A blob URL is revoked only once the background layer has stopped
  // painting it (it calls `releaseBlobUrl`), because revoking one that is still
  // on screen makes the browser log a missing-resource error mid-crossfade.
  const customUrlRef = useRef(null);
  const blobUrlsRef = useRef(null);
  if (blobUrlsRef.current === null) blobUrlsRef.current = new Set();

  // The `src` currently committed to the background layer. Used to tell an
  // upload that is on screen (must wait for the layer) from one that was never
  // shown (safe to free immediately).
  const displayedSrcRef = useRef(null);

  useEffect(() => {
    applyTheme(theme, mode);
    saveTheme(theme);
    saveMode(mode);
  }, [theme, mode]);

  useEffect(() => {
    applyAppearanceVars(settings);
    saveAppearance(settings);
  }, [settings]);

  const releaseBlobUrl = useCallback((url) => {
    if (!url || !blobUrlsRef.current.has(url)) return;
    // Still the custom image the user can pick again: keep it alive.
    if (url === customUrlRef.current) return;
    blobUrlsRef.current.delete(url);
    URL.revokeObjectURL(url);
  }, []);

  // Load a previously uploaded background once, on mount.
  useEffect(() => {
    let active = true;

    loadCustomImage()
      .then((blob) => {
        if (!active || !blob) return;
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.add(url);
        customUrlRef.current = url;
        setCustomImageUrl(url);
      })
      .catch(() => {
        // No stored image (or IndexedDB blocked): keep the curated background.
      });

    return () => {
      active = false;
    };
  }, []);

  // Free anything still retained when the app goes away. In development
  // StrictMode runs this once right after mount, before the async load above
  // has resolved, so no early revocation happens.
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // The repeating rotation. Depending only on `rotation` means exactly one
  // timer exists per setting, and it is always cleared when the interval
  // changes or the component unmounts. The next id is chosen from the previous
  // state inside the updater, so the effect never needs the background id.
  useEffect(() => {
    const ms = rotationIntervalMs(settings.rotation);
    if (!ms) return undefined;

    const timer = window.setInterval(() => {
      setSettings((current) => ({
        ...current,
        backgroundId: nextBackgroundId(current.backgroundId),
      }));
    }, ms);

    return () => window.clearInterval(timer);
  }, [settings.rotation]);

  // "When the app opens": advance the background once per app open. The
  // timestamp keeps StrictMode's double mount (and a quick refresh) from
  // skipping two pictures.
  useEffect(() => {
    if (readStoredAppearance().rotation !== 'open') return;

    const now = Date.now();
    if (now - readOpenedAt() < OPEN_ROTATION_GAP_MS) return;
    writeOpenedAt(now);

    setSettings((current) => ({
      ...current,
      backgroundId: nextBackgroundId(current.backgroundId),
    }));
  }, []);

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const setBackground = useCallback((id) => {
    setSettings((current) => ({ ...current, backgroundId: id }));
  }, []);

  // Picks the next picture immediately, for the panel's "Shuffle now" button.
  const rotateNow = useCallback(() => {
    setSettings((current) => ({
      ...current,
      backgroundId: nextBackgroundId(current.backgroundId),
    }));
  }, []);

  const uploadCustomImage = useCallback(
    async (file) => {
      if (!file) return '';
      if (!file.type.startsWith('image/')) {
        return 'Please choose an image file.';
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        return 'That image is larger than 10 MB. Please pick a smaller one.';
      }

      try {
        await saveCustomImage(file);
      } catch {
        // IndexedDB unavailable: still use the image for this session.
      }

      const previous = customUrlRef.current;
      const url = URL.createObjectURL(file);
      blobUrlsRef.current.add(url);
      customUrlRef.current = url;
      setCustomImageUrl(url);
      setSettings((current) => ({ ...current, backgroundId: CUSTOM_BACKGROUND_ID }));

      // An upload that happens to be on screen stays for the crossfade and is
      // freed by the layer; one that was never shown can go now.
      if (previous && previous !== displayedSrcRef.current) releaseBlobUrl(previous);

      return '';
    },
    [releaseBlobUrl]
  );

  const removeCustomImage = useCallback(async () => {
    try {
      await deleteCustomImage();
    } catch {
      // Nothing stored, or storage blocked.
    }

    const previous = customUrlRef.current;
    customUrlRef.current = null;
    setCustomImageUrl(null);
    setSettings((current) =>
      current.backgroundId === CUSTOM_BACKGROUND_ID
        ? { ...current, backgroundId: DEFAULT_APPEARANCE.backgroundId }
        : current
    );

    if (previous && previous !== displayedSrcRef.current) releaseBlobUrl(previous);
  }, [releaseBlobUrl]);

  // What the background layer should paint: the curated picture, or the custom
  // upload when selected. `src` may be null briefly while the stored image
  // loads, in which case the layer shows the theme gradient.
  const background = useMemo(() => {
    if (settings.backgroundId === CUSTOM_BACKGROUND_ID) {
      return {
        id: CUSTOM_BACKGROUND_ID,
        name: 'Custom image',
        src: customImageUrl,
        credit: 'Your upload',
        license: '',
      };
    }

    const entry = backgroundById(settings.backgroundId) || BACKGROUNDS[0];
    return {
      id: entry.id,
      name: entry.name,
      src: entry.full,
      credit: entry.credit,
      license: entry.license,
    };
  }, [settings.backgroundId, customImageUrl]);

  useEffect(() => {
    displayedSrcRef.current = background.src;
  }, [background.src]);

  return {
    theme,
    mode,
    setTheme,
    toggleMode,
    settings,
    updateSetting,
    setBackground,
    rotateNow,
    background,
    releaseBlobUrl,
    customImageUrl,
    uploadCustomImage,
    removeCustomImage,
  };
}
