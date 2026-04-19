/**
 * Avoid opening the virtual keyboard automatically on touch-first devices.
 *
 * Desktop/laptop environments with fine pointers benefit from focusing the
 * first primary text field. On touch devices, auto-focusing often causes a
 * jarring keyboard jump and layout shift, so we opt out there.
 */
export const shouldAutoFocusTextInput = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};
