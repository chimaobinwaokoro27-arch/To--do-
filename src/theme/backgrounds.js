// ---------------------------------------------------------------------------
// The photographic background catalogue.
//
// Every background is a real landscape / atmospheric photograph. The files live
// on Wikimedia Commons, which is a stable, long-lived host, and are requested
// through its Special:FilePath endpoint. That endpoint takes a `width` query so
// the browser only downloads a properly sized thumbnail instead of the full
// multi-megabyte original:
//
//   ?width=1280  the background that is actually painted
//   ?width=360   the small preview shown in the appearance panel
//
// Only the selected image is ever requested at full size, and the previews use
// loading="lazy", so opening the app never downloads all six pictures.
// If a request fails the background layer silently keeps the theme gradient
// underneath (see BackgroundLayer.jsx), so the app stays readable offline.
//
// Each entry also carries its credit and licence: four of the six require
// attribution, which the appearance panel shows under the previews.
// ---------------------------------------------------------------------------

const FILE_PATH = 'https://commons.wikimedia.org/wiki/Special:FilePath/';

// Builds a stable thumbnail URL for one Commons file at a given pixel width.
function imageUrl(fileName, width) {
  const encoded = encodeURIComponent(fileName.replace(/ /g, '_'));
  return `${FILE_PATH}${encoded}?width=${width}`;
}

const CATALOGUE = [
  {
    id: 'misty-mountains',
    name: 'Misty mountains',
    file: 'Misty Aghileen pinnacles mountain peaks.jpg',
    credit: 'Servis John, U.S. Fish and Wildlife Service',
    license: 'Public domain',
  },
  {
    id: 'neon-city',
    name: 'Rainy neon city',
    file: 'DFC 0505 Neon-lit city street at night reflected in a rain puddle colorful signs and lights mirrored on the wet pavement.jpg',
    credit: 'PattayaPatrol',
    license: 'CC BY-SA 4.0',
  },
  {
    id: 'ocean-sunset',
    name: 'Ocean sunset',
    file: 'Sunset sky water.jpg',
    credit: 'Wikimedia Commons',
    license: 'CC0',
  },
  {
    id: 'forest',
    name: 'Forest scenery',
    file: 'Forest path through yellow autumn leaves in Tuntorp 1.jpg',
    credit: 'W.carter',
    license: 'CC BY-SA 4.0',
  },
  {
    id: 'starry-night',
    name: 'Starry night sky',
    file: 'Milky Way and starry night sky (26972689115).jpg',
    credit: 'NPS / Jacob W. Frank',
    license: 'Public domain',
  },
  {
    id: 'architecture',
    name: 'Minimal architecture',
    file: 'Bonn, Post-Tower -- 2017 -- 2128 (bw).jpg',
    credit: 'Dietmar Rabich',
    license: 'CC BY-SA 4.0',
  },
];

export const BACKGROUNDS = CATALOGUE.map((entry) => ({
  ...entry,
  full: imageUrl(entry.file, 1280),
  thumb: imageUrl(entry.file, 360),
}));

// A background the user uploaded from their own device. It is stored in
// IndexedDB (never localStorage, which is far too small for an image) and is
// resolved to a blob URL at runtime, so it has no fixed `full`/`thumb` here.
export const CUSTOM_BACKGROUND_ID = 'custom';

export const DEFAULT_BACKGROUND_ID = 'misty-mountains';

// The rotation interval choices. `ms` is the delay used for the repeating
// timer; 0 means "no repeating timer" (either off, or a single change when the
// app opens).
export const ROTATION_OPTIONS = [
  { id: 'off', label: 'Off', ms: 0 },
  { id: 'open', label: 'When the app opens', ms: 0 },
  { id: '5m', label: 'Every 5 minutes', ms: 5 * 60 * 1000 },
  { id: '30m', label: 'Every 30 minutes', ms: 30 * 60 * 1000 },
  { id: '60m', label: 'Every hour', ms: 60 * 60 * 1000 },
];

const ROTATION_IDS = ROTATION_OPTIONS.map((option) => option.id);

export function isRotationId(value) {
  return ROTATION_IDS.includes(value);
}

export function rotationIntervalMs(id) {
  const option = ROTATION_OPTIONS.find((entry) => entry.id === id);
  return option ? option.ms : 0;
}

export function backgroundById(id) {
  return BACKGROUNDS.find((entry) => entry.id === id) || null;
}

// The next picture in the list, wrapping around. A custom upload is not part of
// the rotation, so it starts again from the first curated background.
export function nextBackgroundId(currentId) {
  const index = BACKGROUNDS.findIndex((entry) => entry.id === currentId);
  if (index === -1) return BACKGROUNDS[0].id;
  return BACKGROUNDS[(index + 1) % BACKGROUNDS.length].id;
}

// Sensible first-run preferences. These are also the values the sliders reset
// to and the fallback whenever stored data is missing or corrupt.
export const DEFAULT_APPEARANCE = {
  backgroundId: DEFAULT_BACKGROUND_ID,
  rotation: 'off',
  blur: 16,
  transparency: 70,
  overlay: 45,
};
