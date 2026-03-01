import { useCallback } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS, applyAccentHue } from '../../stores/useThemeStore';
import { haptic } from '../../utils/haptics';

const DEFAULT_HUE = 200;

/**
 * Accent-colour picker for the Settings page.
 *
 * Offers preset colour swatches and a continuous hue slider. Changes
 * are applied immediately (no preview step) so the user can see the
 * effect in real time.
 */
export const AccentColorSection = () => {
  const accentHue = useThemeStore((s) => s.accentHue);
  const setAccentHue = useThemeStore((s) => s.setAccentHue);

  const handlePreset = useCallback(
    (hue: number) => {
      haptic();
      setAccentHue(hue, true); // animate cross-fade to new hue
    },
    [setAccentHue],
  );

  const handleSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hue = Number(e.target.value);
      applyAccentHue(hue); // instant visual update without persisting on every tick
    },
    [],
  );

  const handleSliderEnd = useCallback(
    (e: React.PointerEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      const hue = Number((e.target as HTMLInputElement).value);
      setAccentHue(hue); // persist final value
    },
    [setAccentHue],
  );

  const handleReset = useCallback(() => {
    haptic();
    setAccentHue(DEFAULT_HUE, true); // animate cross-fade back to default
  }, [setAccentHue]);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        主題色彩
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Palette size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">自訂主題色</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  選擇偏好的介面主題色彩
                </p>
              </div>
            </div>
            {accentHue !== DEFAULT_HUE && (
              <button
                type="button"
                onClick={handleReset}
                aria-label="還原預設色彩"
                title="還原預設"
                className="p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 action-transition"
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Preset swatches */}
          <div
            className="flex gap-2.5 mb-4"
            role="radiogroup"
            aria-label="預設主題色彩"
          >
            {ACCENT_PRESETS.map(({ hue, label, color }) => (
              <button
                key={hue}
                type="button"
                role="radio"
                aria-checked={accentHue === hue}
                aria-label={label}
                title={label}
                onClick={() => handlePreset(hue)}
                className={`relative w-9 h-9 rounded-full action-transition active:scale-90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                  accentHue === hue ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-950' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Continuous hue slider */}
          <div className="space-y-2">
            <label
              htmlFor="accent-hue-slider"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              自由調整色相
            </label>
            <input
              id="accent-hue-slider"
              type="range"
              min={0}
              max={360}
              step={1}
              value={accentHue}
              onChange={handleSlider}
              onPointerUp={handleSliderEnd}
              onTouchEnd={handleSliderEnd}
              aria-label="色相角度"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={accentHue}
              className="w-full h-2.5 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-300 dark:[&::-webkit-slider-thumb]:border-zinc-500 [&::-webkit-slider-thumb]:action-transition
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-300 dark:[&::-moz-range-thumb]:border-zinc-500"
              style={{
                background: 'linear-gradient(to right, oklch(55% 0.15 0), oklch(55% 0.15 60), oklch(55% 0.15 120), oklch(55% 0.15 180), oklch(55% 0.15 240), oklch(55% 0.15 300), oklch(55% 0.15 360))',
              }}
            />
          </div>

          {/* Current preview */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: `oklch(55% 0.15 ${accentHue})` }} />
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {accentHue}°
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
