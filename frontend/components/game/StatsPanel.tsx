'use client';

interface StatsPanelProps {
  wpm: number;
  accuracy: number;
  combo: number;
  targetWPM?: number;
}

export function StatsPanel({ wpm, accuracy, combo, targetWPM }: StatsPanelProps) {
  const isWpmOnTarget = targetWPM ? wpm >= targetWPM : false;
  const isAccuracyGood = accuracy >= 90;

  return (
    <div className="grid grid-cols-3 gap-4 rounded-lg bg-white p-4 shadow">
      {/* WPM */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-600">WPM</div>
        <div
          className={`mt-1 text-3xl font-bold ${
            isWpmOnTarget ? 'text-green-600' : 'text-blue-600'
          }`}
        >
          {wpm}
        </div>
        {targetWPM && (
          <div className="mt-1 text-xs text-gray-500">
            Target: {targetWPM}
          </div>
        )}
      </div>

      {/* Accuracy */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-600">Accuracy</div>
        <div
          className={`mt-1 text-3xl font-bold ${
            isAccuracyGood ? 'text-green-600' : 'text-orange-600'
          }`}
        >
          {accuracy.toFixed(1)}%
        </div>
        <div className="mt-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full transition-all duration-300 ${
                isAccuracyGood ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${Math.min(accuracy, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Combo */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-600">Combo</div>
        <div
          className={`mt-1 text-3xl font-bold ${
            combo >= 10 ? 'animate-pulse text-purple-600' : 'text-gray-700'
          }`}
        >
          {combo > 0 && (
            <span className="mr-1 text-lg">
              {combo >= 50 ? '🔥🔥🔥' : combo >= 20 ? '🔥🔥' : '🔥'}
            </span>
          )}
          x{combo}
        </div>
        {combo >= 10 && (
          <div className="mt-1 text-xs font-semibold text-purple-600">
            AWESOME!
          </div>
        )}
      </div>
    </div>
  );
}
