// Pure typing-game stat helpers (unit-tested in typing-stats.test.ts).

/** Standard word length for WPM: 5 characters = 1 word. */
export const CHARS_PER_WORD = 5;

/**
 * Words per minute from the correct characters typed in the whole game and the elapsed
 * game time in seconds. Returns 0 when no time has elapsed (or the input is not a finite
 * number), so there is never a divide-by-zero.
 */
export function calculateWpm(correctChars: number, elapsedSeconds: number): number {
  if (!Number.isFinite(correctChars) || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0 || correctChars <= 0) {
    return 0;
  }
  return Math.round(correctChars / CHARS_PER_WORD / (elapsedSeconds / 60));
}

/** Accuracy in percent (0-100) of the characters currently counted; 0 when nothing is counted. */
export function calculateAccuracy(correctChars: number, totalChars: number): number {
  if (!(totalChars > 0)) return 0;
  return (correctChars / totalChars) * 100;
}

/**
 * Game time elapsed in seconds, from the countdown: the whole seconds already ticked off
 * (initialTime - timeLeft) plus the part of the current second that has run (partialMs,
 * clamped to under one second). Paused time is never counted because the timer passes the
 * partial second frozen at the pause. Capped at initialTime.
 */
export function elapsedGameSeconds(initialTime: number, timeLeft: number, partialMs: number): number {
  if (!Number.isFinite(initialTime) || initialTime <= 0) return 0;
  const whole = Math.min(Math.max(initialTime - timeLeft, 0), initialTime);
  const partial = Number.isFinite(partialMs) ? Math.min(Math.max(partialMs, 0), 999) / 1000 : 0;
  return Math.min(whole + partial, initialTime);
}
