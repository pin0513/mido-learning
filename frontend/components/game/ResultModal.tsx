'use client';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface ResultModalProps {
  isOpen: boolean;
  score: number;
  stars: number;
  wpm: number;
  accuracy: number;
  timeSpent: number;
  targetWPM: number;
  experienceGained?: number;
  coinsEarned?: number;
  levelUp?: boolean;
  newLevel?: number;
  achievements?: Achievement[];
  onPlayAgain: () => void;
  onExit: () => void;
}

export function ResultModal({
  isOpen,
  score,
  stars,
  wpm,
  accuracy,
  timeSpent,
  targetWPM,
  experienceGained,
  coinsEarned,
  levelUp,
  newLevel,
  achievements,
  onPlayAgain,
  onExit,
}: ResultModalProps) {
  if (!isOpen) return null;

  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const getStarColor = (index: number) => {
    return index < stars ? 'text-yellow-400' : 'text-gray-300';
  };

  const getMessage = () => {
    if (stars === 3) return 'Perfect! 🎉';
    if (stars === 2) return 'Great Job! 👏';
    return 'Keep Practicing! 💪';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md animate-in fade-in zoom-in-95 w-full rounded-2xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{getMessage()}</h2>

          {/* Stars */}
          <div className="my-4 flex justify-center gap-2">
            {[0, 1, 2].map((index) => (
              <svg
                key={index}
                className={`h-12 w-12 ${getStarColor(index)}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          {/* Score */}
          <div className="text-5xl font-bold text-blue-600">{score}</div>
          <div className="text-sm text-gray-500">points</div>
        </div>

        {/* Stats Grid */}
        <div className="my-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{wpm}</div>
            <div className="text-sm text-gray-600">WPM</div>
            <div className="text-xs text-gray-500">Target: {targetWPM}</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {accuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600">Time</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {stars}/3
            </div>
            <div className="text-sm text-gray-600">Stars</div>
          </div>
        </div>

        {/* Rewards */}
        {(experienceGained !== undefined || coinsEarned !== undefined) && (
          <div className="mb-6 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4">
            <div className="text-center text-sm font-medium text-gray-700">
              Rewards Earned
            </div>
            <div className="mt-2 flex justify-center gap-4">
              {experienceGained !== undefined && (
                <div className="flex items-center gap-1 text-purple-600">
                  <span className="text-2xl">⭐</span>
                  <span className="font-bold">+{experienceGained}</span>
                  <span className="text-sm">XP</span>
                </div>
              )}
              {coinsEarned !== undefined && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <span className="text-2xl">🪙</span>
                  <span className="font-bold">+{coinsEarned}</span>
                  <span className="text-sm">Coins</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Level Up */}
        {levelUp && newLevel && (
          <div className="mb-6 animate-pulse rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 p-4 text-center font-bold text-white shadow-lg">
            🎉 LEVEL UP! You&apos;re now Level {newLevel}! 🎉
          </div>
        )}

        {/* Unlocked Achievements Section */}
        {achievements && achievements.length > 0 && (
          <div className="mb-6 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 p-4">
            <div className="text-center mb-3">
              <h3 className="text-lg font-bold text-yellow-900">
                🏆 成就解鎖！
              </h3>
              <p className="text-xs text-yellow-700">恭喜獲得新成就</p>
            </div>
            <div className="space-y-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm"
                >
                  <span className="text-2xl flex-shrink-0">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-gray-600">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Play Again
          </button>
          <button
            onClick={onExit}
            className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
