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
