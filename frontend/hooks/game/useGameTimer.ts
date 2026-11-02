import { useState, useEffect, useEffectEvent, useRef, useCallback } from 'react';

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
}

export function useGameTimer({
  initialTime,
  onTimeUp,
}: UseGameTimerProps): UseGameTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setTimeLeft(initialTime);
  }, [initialTime]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setTimeLeft(initialTime);
  }, [initialTime, stop]);

  // Tick once a second. The updater only computes the next value (it must stay pure:
  // React may call it twice, e.g. in StrictMode); time-up is handled in the effect below.
  // The interval depends only on running/paused, so re-renders (every keystroke) do not
  // restart it.
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => Math.max(prev - 1, 0));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused]);

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

  return {
    timeLeft,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
