/**
 * Lightweight haptic feedback helpers using the Vibration API.
 * Silently no-ops on unsupported devices (iOS Safari, desktop).
 */

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Short tick — for swipe navigation, tab changes. ~10ms */
export function hapticTick() {
  if (canVibrate()) navigator.vibrate(10);
}

/** Medium tap — for button-like interactions, threshold reached. ~20ms */
export function hapticTap() {
  if (canVibrate()) navigator.vibrate(20);
}

/** Success — short double pulse. */
export function hapticSuccess() {
  if (canVibrate()) navigator.vibrate([15, 40, 15]);
}

/** Warning/error — longer pulse. */
export function hapticWarn() {
  if (canVibrate()) navigator.vibrate([30, 50, 30]);
}
