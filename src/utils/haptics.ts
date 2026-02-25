/**
 * Trigger a short haptic (vibration) feedback on supported devices.
 *
 * Uses `navigator.vibrate` which is available on Android Chrome / Edge.
 * iOS Safari does not support this API — the call is safely a no-op.
 */
export const haptic = (ms = 10) => {
  navigator.vibrate?.(ms);
};
