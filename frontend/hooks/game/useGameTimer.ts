import { useState, useEffect, useEffectEvent, useRef, useCallback } from 'react';
import { elapsedGameSeconds } from './typing-stats';

export interface UseGameTimerProps {
  initialTime: number; // seconds
  onTimeUp?: () => void;
}

export interface UseGameTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  /**
   * Game time elapsed so far in seconds, with sub-second precision. Pauses are not counted.
   * floor(getElapsedSeconds()) === initialTime - timeLeft, so it agrees with the countdown
   * (and with timeSpent). This is the one time source for live WPM, finish WPM and time-up.
   */
  getElapsedSeconds: () => number;
}

export function useGameTimer({
  initialTime,
  onTimeUp,
}: UseGameTimerProps): UseGameTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Sub-second bookkeeping for getElapsedSeconds: while ticking, the partial second is
  // now - lastTickAt; while paused or stopped it is frozen in frozenPartialMs.
  const tickingRef = useRef(false);
  const lastTickAtRef = useRef(0);
  const frozenPartialMsRef = useRef(0);

  const freezePartial = useCallback(() => {
    if (tickingRef.current) {
      frozenPartialMsRef.current = Math.min(Date.now() - lastTickAtRef.current, 999);
      tickingRef.current = false;
    }
  }, []);

  const stop = useCallback(() => {
    freezePartial();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
  }, [freezePartial]);

  // start must set timeLeft and isRunning in the same batch: the time-up effect below runs
  // on isRunning && timeLeft === 0, so starting after a game that ended at 0 without
  // resetting timeLeft in the same update would end the new game immediately.
  const start = useCallback(() => {
    frozenPartialMsRef.current = 0;
    setIsRunning(true);
    setIsPaused(false);
    setTimeLeft(initialTime);
  }, [initialTime]);

  const pause = useCallback(() => {
    freezePartial();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
  }, [freezePartial]);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    frozenPartialMsRef.current = 0;
    setTimeLeft(initialTime);
  }, [initialTime, stop]);

  // Tick once a second. The updater only computes the next value (it must stay pure:
  // React may call it twice, e.g. in StrictMode); time-up is handled in the effect below.
  // The interval depends only on running/paused, so re-renders (every keystroke) do not
  // restart it.
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Continue the partial second frozen at a pause (0 on start).
      lastTickAtRef.current = Date.now() - frozenPartialMsRef.current;
      tickingRef.current = true;
      intervalRef.current = setInterval(() => {
        lastTickAtRef.current = Date.now();
        setTimeLeft((prev) => Math.max(prev - 1, 0));
      }, 1000);
    }

    return () => {
      freezePartial();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, freezePartial]);

  // Time-up runs after the render that shows 0, so onTimeUp sees timeLeft === 0, and it
  // runs once: stop() clears isRunning before the next check.
  const handleTimeUp = useEffectEvent(() => {
    stop();
    onTimeUp?.();
  });

  useEffect(() => {
    if (isRunning && timeLeft === 0) {
      handleTimeUp();
    }
  }, [isRunning, timeLeft]);

  const getElapsedSeconds = useCallback(() => {
    const partialMs = tickingRef.current ? Date.now() - lastTickAtRef.current : frozenPartialMsRef.current;
    return elapsedGameSeconds(initialTime, timeLeft, partialMs);
  }, [initialTime, timeLeft]);

  return {
    timeLeft,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
    getElapsedSeconds,
  };
}
