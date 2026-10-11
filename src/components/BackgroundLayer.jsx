import { useEffect, useState } from 'react';

// How long the outgoing picture stays underneath the incoming one. It only
// needs to outlive the 700ms crossfade in index.css, after which it is dropped
// so a retired blob URL is no longer referenced by any element.
const PREVIOUS_TTL_MS = 800;

// The full-viewport photographic background.
//
// It sits behind all content (z-index: -1) and consists of:
//   - the incoming picture, which fades in when it has actually loaded
//   - the outgoing picture, kept underneath so the crossfade never shows a gap
//   - a dimming overlay whose strength the user controls
//
// The picture is preloaded with a throwaway Image() first: only once it decodes
// do we swap, so a slow or failed request never blanks the screen. If it fails,
// the current picture simply stays and, when there is none, the theme gradient
// painted by `.app-bg` remains visible - the graceful fallback.
function BackgroundLayer({ background, onRetire }) {
  const src = background?.src || null;

  const [current, setCurrent] = useState(src);
  const [previous, setPrevious] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setCurrent(null);
      setPrevious(null);
      return undefined;
    }

    if (src === current) return undefined;

    let active = true;
    const image = new Image();

    image.onload = () => {
      if (!active) return;
      setPrevious(current);
      setCurrent(src);
    };
    // On error we keep whatever is already on screen.
    image.src = src;

    return () => {
      active = false;
    };
  }, [src, current]);

  // Drop the outgoing picture once the crossfade has finished. Only then is it
  // safe to free its blob URL, so the caller is told about it here.
  useEffect(() => {
    if (!previous) return undefined;

    const timer = window.setTimeout(() => {
      setPrevious(null);
      if (onRetire) onRetire(previous);
    }, PREVIOUS_TTL_MS);

    return () => window.clearTimeout(timer);
  }, [previous, onRetire]);

  const showCurrent = current && current !== failedSrc;
  const showPrevious = previous && previous !== failedSrc;

  return (
    <div className="app-bg" aria-hidden="true">
      {showPrevious && (
        <img
          className="app-bg__img"
          src={previous}
          alt=""
          onError={() => setFailedSrc(previous)}
        />
      )}

      {showCurrent && (
        <img
          key={current}
          className="app-bg__img app-bg__img--enter"
          src={current}
          alt=""
          onError={() => setFailedSrc(current)}
        />
      )}

      <span className="app-bg__overlay" />
    </div>
  );
}

export default BackgroundLayer;
