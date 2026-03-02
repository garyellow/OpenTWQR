import { useState, useCallback, useEffect, useRef } from 'react';
import { Palette, RotateCcw, ShieldCheck } from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS, applyAccentHue } from '../../stores/useThemeStore';
import { useAuthStore, LOCK_TIMEOUT_OPTIONS } from '../../stores/useAuthStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { isWebAuthnSupported, registerCredential } from '../../utils/authLock';
import { haptic } from '../../utils/haptics';
import { QRCodeSection } from './QRCodeSection';

const DEFAULT_HUE = 216;

/**
 * Combined "Personalization" section — accent colour (toggled) + app lock.
 */
export const PersonalizationSection = () => {
  const t = useLocaleStore((s) => s.t);

  /* ── Accent colour state ── */
  const accentHue = useThemeStore((s) => s.accentHue);
  const accentEnabled = useThemeStore((s) => s.accentEnabled);
  const setAccentHue = useThemeStore((s) => s.setAccentHue);
  const setAccentEnabled = useThemeStore((s) => s.setAccentEnabled);

  const [dragHue, setDragHue] = useState<number | null>(null);
  const displayHue = dragHue ?? accentHue;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleToggleAccent = useCallback(() => {
    haptic();
    if (accentEnabled) {
      // Turning off — revert to default
      setAccentEnabled(false);
      setDragHue(null);
      setAccentHue(DEFAULT_HUE, true);
    } else {
      setAccentEnabled(true);
    }
  }, [accentEnabled, setAccentEnabled, setAccentHue]);

  const handlePreset = useCallback(
    (hue: number) => {
      haptic();
      setDragHue(null);
      setAccentHue(hue, true);
    },
    [setAccentHue],
  );

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hue = Number(e.target.value);
      setDragHue(hue);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyAccentHue(hue);
        rafRef.current = null;
      });
    },
    [],
  );

  const handleSliderEnd = useCallback(
    (e: React.PointerEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const hue = Number((e.target as HTMLInputElement).value);
      setDragHue(null);
      setAccentHue(hue);
    },
    [setAccentHue],
  );

  const handleReset = useCallback(() => {
    haptic();
    setDragHue(null);
    setAccentHue(DEFAULT_HUE, true);
  }, [setAccentHue]);

  /* ── App lock state ── */
  const authEnabled = useAuthStore((s) => s.isEnabled);
  const lockTimeout = useAuthStore((s) => s.lockTimeout);
  const enableAuth = useAuthStore((s) => s.enable);
  const disableAuth = useAuthStore((s) => s.disable);
  const setLockTimeout = useAuthStore((s) => s.setLockTimeout);

  const [webAuthnAvailable, setWebAuthnAvailable] = useState<boolean | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    isWebAuthnSupported().then(setWebAuthnAvailable);
  }, []);

  const handleToggleLock = useCallback(async () => {
    if (authBusy) return;
    if (authEnabled) {
      disableAuth();
      return;
    }
    setAuthBusy(true);
    const credentialId = await registerCredential();
    if (credentialId) enableAuth(credentialId);
    setAuthBusy(false);
  }, [authEnabled, authBusy, enableAuth, disableAuth]);

  const showAppLock = webAuthnAvailable === true;

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        {t.personalization.sectionTitle}
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">

        {/* ── Accent colour toggle ── */}
        <div>
          <button
            type="button"
            role="switch"
            aria-checked={accentEnabled}
            onClick={handleToggleAccent}
            className="w-full flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'light-dark(var(--accent-light), var(--accent-dark-light))' }}
              >
                <Palette
                  size={18}
                  aria-hidden="true"
                  style={{ color: 'light-dark(var(--accent), var(--accent-dark))' }}
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.personalization.accentTitle}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t.personalization.accentDesc}
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <div
              aria-hidden="true"
              className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 ${
                accentEnabled ? '' : 'bg-zinc-300 dark:bg-zinc-600'
              }`}
              style={accentEnabled ? { backgroundColor: 'light-dark(var(--accent), var(--accent-dark))' } : undefined}
            >
              <div
                className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                  accentEnabled ? 'translate-x-5.25' : 'translate-x-0.75'
                }`}
              />
            </div>
          </button>

          {/* Colour picker — only visible when enabled */}
          {accentEnabled && (
            <div className="p-4 pt-0">
              {/* Preset swatches */}
              <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label={t.personalization.accentPresetsLabel}>
                {ACCENT_PRESETS.map(({ hue, color }) => (
                  <button
                    key={hue}
                    type="button"
                    role="radio"
                    aria-checked={accentHue === hue}
                    aria-label={t.accentPresets[hue] ?? String(hue)}
                    title={t.accentPresets[hue] ?? String(hue)}
                    onClick={() => handlePreset(hue)}
                    className={`relative w-8 h-8 rounded-full action-transition active:scale-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                      accentHue === hue
                        ? 'ring-2 ring-offset-2 dark:ring-offset-zinc-950 shadow-sm'
                        : ''
                    }`}
                    style={{
                      backgroundColor: color,
                      '--tw-ring-color': color,
                    } as React.CSSProperties}
                  />
                ))}
                {accentHue !== DEFAULT_HUE && (
                  <button
                    type="button"
                    onClick={handleReset}
                    aria-label={t.personalization.resetColor}
                    title={t.personalization.resetColorShort}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 action-transition"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Continuous hue slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="accent-hue-slider"
                    className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {t.personalization.accentSliderLabel}
                  </label>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono tabular-nums">
                    {displayHue}°
                  </span>
                </div>
                <input
                  id="accent-hue-slider"
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={displayHue}
                  onChange={handleSlider}
                  onPointerUp={handleSliderEnd}
                  onTouchEnd={handleSliderEnd}
                  aria-label={t.personalization.accentHueLabel}
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={displayHue}
                  className="w-full h-2.5 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-300 dark:[&::-webkit-slider-thumb]:border-zinc-500 [&::-webkit-slider-thumb]:action-transition
                    [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-300 dark:[&::-moz-range-thumb]:border-zinc-500"
                  style={{
                    background: 'linear-gradient(to right, oklch(55% 0.15 0), oklch(55% 0.15 60), oklch(55% 0.15 120), oklch(55% 0.15 180), oklch(55% 0.15 240), oklch(55% 0.15 300), oklch(55% 0.15 360))',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── App lock toggle ── */}
        {showAppLock && (
          <div>
            <button
              type="button"
              role="switch"
              aria-checked={authEnabled}
              onClick={handleToggleLock}
              disabled={authBusy}
              className="w-full flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
                  <ShieldCheck size={18} className="text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.personalization.appLockTitle}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {t.personalization.appLockDesc}
                  </p>
                </div>
              </div>
              {/* Toggle switch */}
              <div
                aria-hidden="true"
                className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 ${
                  authEnabled ? '' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                style={authEnabled ? { backgroundColor: 'light-dark(var(--accent), var(--accent-dark))' } : undefined}
              >
                <div
                  className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
                    authEnabled ? 'translate-x-5.25' : 'translate-x-0.75'
                  }`}
                />
              </div>
            </button>

            {/* Lock timeout selector — inside the same <div> so divide-y does not add an extra line */}
            {authEnabled && (
              <div className="px-4 pb-4">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  {t.personalization.lockTimeoutTitle}
                </p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.personalization.lockTimeoutLabel}>
                  {LOCK_TIMEOUT_OPTIONS.map(({ value }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={lockTimeout === value}
                      onClick={() => setLockTimeout(value)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                        lockTimeout === value
                          ? 'chip-accent shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {t.personalization.lockTimeoutOptions[value] ?? String(value)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── QR Code display settings (inlined after App Lock) ── */}
        <QRCodeSection />
      </div>
    </div>
  );
};
