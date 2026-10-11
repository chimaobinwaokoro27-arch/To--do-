import { useEffect, useRef, useState } from 'react';
import {
  BACKGROUNDS,
  CUSTOM_BACKGROUND_ID,
  DEFAULT_APPEARANCE,
  ROTATION_OPTIONS,
} from '../theme/backgrounds.js';
import { LIMITS } from '../theme/appearance.js';
import ThemeSelector from './ThemeSelector.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// One labelled range input, showing its current value next to the label.
function Slider({ id, label, value, min, max, suffix = '', onChange }) {
  return (
    <div className="slider">
      <div className="slider__head">
        <label className="slider__label" htmlFor={id}>
          {label}
        </label>
        <output className="slider__value" htmlFor={id}>
          {value}
          {suffix}
        </output>
      </div>
      <input
        id={id}
        className="slider__input"
        type="range"
        min={min}
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

// The Theme and appearance panel: pick a background photo, set the rotation,
// tune the glass and switch the appearance. Every control writes straight into
// the shared appearance state, so the change is visible immediately (and after
// a refresh, since that state is persisted).
function ThemePanel({ appearance, onClose }) {
  const {
    settings,
    updateSetting,
    setBackground,
    rotateNow,
    background,
    customImageUrl,
    uploadCustomImage,
    removeCustomImage,
    theme,
    mode,
    setTheme,
    toggleMode,
  } = appearance;

  const boxRef = useRef(null);
  const fileRef = useRef(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    boxRef.current?.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function handleFile(event) {
    const file = event.target.files?.[0] || null;
    // Clear the input so choosing the same file again still fires onChange.
    event.target.value = '';
    const message = await uploadCustomImage(file);
    setUploadError(message);
  }

  const isCustom = settings.backgroundId === CUSTOM_BACKGROUND_ID;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Theme and appearance">
      <div className="modal__box modal__box--panel" ref={boxRef} tabIndex={-1}>
        <div className="modal__head">
          <div>
            <h2 className="modal__title">Theme &amp; appearance</h2>
            <p className="modal__subtitle">Background photo, rotation and glass</p>
          </div>
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <section className="panel__section">
          <h3 className="panel__heading">Background</h3>

          <div className="bg-grid" role="radiogroup" aria-label="Background photo">
            {BACKGROUNDS.map((option) => {
              const active = option.id === settings.backgroundId;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`bg-option ${active ? 'bg-option--active' : ''}`}
                  onClick={() => setBackground(option.id)}
                >
                  <span className="bg-option__frame">
                    <img
                      className="bg-option__thumb"
                      src={option.thumb}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="bg-option__name">{option.name}</span>
                </button>
              );
            })}

            <button
              type="button"
              role="radio"
              aria-checked={isCustom}
              className={`bg-option ${isCustom ? 'bg-option--active' : ''}`}
              onClick={() =>
                customImageUrl ? setBackground(CUSTOM_BACKGROUND_ID) : fileRef.current?.click()
              }
            >
              <span className="bg-option__frame">
                {customImageUrl ? (
                  <img className="bg-option__thumb" src={customImageUrl} alt="" />
                ) : (
                  <span className="bg-option__thumb bg-option__thumb--empty" aria-hidden="true">
                    +
                  </span>
                )}
              </span>
              <span className="bg-option__name">Custom image</span>
            </button>
          </div>

          <input
            ref={fileRef}
            className="bg-option__file"
            type="file"
            accept="image/*"
            onChange={handleFile}
          />

          <div className="panel__row">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => fileRef.current?.click()}
            >
              {customImageUrl ? 'Replace image' : 'Upload image'}
            </button>

            <button
              type="button"
              className="button button--ghost button--small"
              onClick={rotateNow}
            >
              Shuffle now
            </button>

            {isCustom && customImageUrl && (
              <button
                type="button"
                className="button button--danger-ghost button--small"
                onClick={() => {
                  removeCustomImage();
                  setUploadError('');
                }}
              >
                Remove custom image
              </button>
            )}
          </div>

          {uploadError && (
            <p className="form__error" role="alert">
              {uploadError}
            </p>
          )}

          <p className="panel__credit">
            {background.name}
            {background.credit ? ` — photo: ${background.credit}` : ''}
            {background.license ? ` (${background.license})` : ''}
          </p>
        </section>

        <section className="panel__section">
          <h3 className="panel__heading">Automatic rotation</h3>
          <div className="form__group">
            <label className="form__label" htmlFor="rotation-mode">
              Change the background
            </label>
            <select
              id="rotation-mode"
              className="form__input"
              value={settings.rotation}
              onChange={(event) => updateSetting('rotation', event.target.value)}
            >
              {ROTATION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="panel__section">
          <h3 className="panel__heading">Glass</h3>
          <Slider
            id="glass-blur"
            label="Blur"
            value={settings.blur}
            min={LIMITS.blur.min}
            max={LIMITS.blur.max}
            suffix="px"
            onChange={(value) => updateSetting('blur', value)}
          />
          <Slider
            id="glass-transparency"
            label="Panel transparency"
            value={settings.transparency}
            min={LIMITS.transparency.min}
            max={LIMITS.transparency.max}
            suffix="%"
            onChange={(value) => updateSetting('transparency', value)}
          />
          <Slider
            id="glass-overlay"
            label="Overlay strength"
            value={settings.overlay}
            min={LIMITS.overlay.min}
            max={LIMITS.overlay.max}
            suffix="%"
            onChange={(value) => updateSetting('overlay', value)}
          />

          <div className="panel__row">
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => {
                updateSetting('blur', DEFAULT_APPEARANCE.blur);
                updateSetting('transparency', DEFAULT_APPEARANCE.transparency);
                updateSetting('overlay', DEFAULT_APPEARANCE.overlay);
              }}
            >
              Reset glass
            </button>
          </div>
        </section>

        <section className="panel__section">
          <h3 className="panel__heading">Appearance</h3>

          <div className="appearance">
            <span className="appearance__text">
              <span className="appearance__label">Colour mode</span>
              <span className="appearance__hint">{mode === 'dark' ? 'Dark' : 'Light'}</span>
            </span>
            <ThemeToggle mode={mode} onToggle={toggleMode} />
          </div>

          <ThemeSelector theme={theme} onChange={setTheme} />
        </section>
      </div>
    </div>
  );
}

export default ThemePanel;
