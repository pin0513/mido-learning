'use client';

import { formatTime } from '@/lib/utils';

interface GameHeaderProps {
  title: string;
  level: number;
  timeLeft: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onExit?: () => void;
}

export function GameHeader({
  title,
  level,
  timeLeft,
  isPaused,
  onPause,
  onResume,
  onExit,
}: GameHeaderProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const isLowTime = timeLeft <= 10 && timeLeft > 0;

  return (
    <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white shadow-lg">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm opacity-90">Level {level}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Timer */}
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-2xl font-bold ${
            isLowTime
              ? 'animate-pulse bg-red-500'
              : 'bg-white/20 backdrop-blur-sm'
          }`}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{timeString}</span>
        </div>

        {/* Pause/Resume Button */}
        <button
          onClick={isPaused ? onResume : onPause}
          className="rounded-lg bg-white/20 p-2 backdrop-blur-sm transition hover:bg-white/30"
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? (
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          )}
        </button>

        {/* Exit Button */}
        {onExit && (
          <button
            onClick={onExit}
            className="rounded-lg bg-white/20 p-2 backdrop-blur-sm transition hover:bg-white/30"
            aria-label="Exit"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
