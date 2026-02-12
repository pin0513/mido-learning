'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTrial } from '@/hooks/useTrial';
import { useGameTimer } from '@/hooks/game/useGameTimer';
import { useTypingGame, Question, GameStats } from '@/hooks/game/useTypingGame';
import { GameHeader } from '@/components/game/GameHeader';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { TypingInput } from '@/components/game/TypingInput';
import { StatsPanel } from '@/components/game/StatsPanel';
import { ResultModal } from '@/components/game/ResultModal';
import { startGame, completeGame, CompleteGameResponse } from '@/lib/api';

interface GameConfig {
  gameType: string;
  level: number;
  timeLimit: number;
  targetWPM: number;
  questions: Question[];
}

interface CourseData {
  title: string;
  type: string;
  gameConfig: GameConfig;
}

export default function TypingGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { hasRemaining, remainingCount, consume } = useTrial();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [rewards, setRewards] = useState<CompleteGameResponse | null>(null);
  const [finalStats, setFinalStats] = useState<{
    stats: GameStats;
    stars: number;
    timeSpent: number;
  } | null>(null);
  const [isTrialMode, setIsTrialMode] = useState(false);

  // Load course data
  useEffect(() => {
    async function loadCourse() {
      try {
        const courseDoc = await getDoc(doc(db, 'courses', resolvedParams.id));

        if (!courseDoc.exists()) {
          console.error('Course not found');
          router.push('/dashboard');
          return;
        }

        const data = courseDoc.data() as CourseData;

        if (data.type !== 'game') {
          console.error('This is not a game course');
          router.push(`/courses/${resolvedParams.id}`);
          return;
        }

        setCourse(data);
      } catch (error) {
        console.error('Failed to load course:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [resolvedParams.id, router]);

  const handleGameComplete = async (stats: GameStats, stars: number) => {
    if (!course) return;

    const timeSpent = course.gameConfig.timeLimit - timer.timeLeft;

    // Save final stats for result modal
    setFinalStats({ stats, stars, timeSpent });

    // Only call API if user is logged in (trial mode doesn't accumulate achievements)
    if (user && sessionId) {
      try {
        const result = await completeGame({
          sessionId,
          courseId: resolvedParams.id,
          score: Math.round(stats.wpm * stats.accuracy),
          wpm: stats.wpm,
          accuracy: stats.accuracy,
          stars,
          timeSpent,
          correctChars: stats.correctChars,
          totalChars: stats.totalChars,
        });

        setRewards(result);
      } catch (error) {
        console.error('Failed to complete game:', error);
      }
    }

    setShowResult(true);
  };

  const timer = useGameTimer({
    initialTime: course?.gameConfig.timeLimit || 60,
    onTimeUp: () => {
      // Force complete game when time is up
      if (game.stats.totalChars > 0) {
        handleGameComplete(game.stats, 1); // Minimum 1 star for participation
      }
    },
  });

  const game = useTypingGame({
    questions: course?.gameConfig.questions || [],
    timeLimit: course?.gameConfig.timeLimit || 60,
    targetWPM: course?.gameConfig.targetWPM || 30,
    onComplete: handleGameComplete,
  });

  const handleStartGame = async () => {
    if (!course) return;

    // Check trial mode
    if (!user) {
      if (!hasRemaining) {
        alert('試玩次數已用完！請登入以繼續遊玩。');
        return;
      }
      // Consume trial count
      const remaining = consume();
      setIsTrialMode(true);
      console.log(`Trial mode: ${remaining} plays remaining`);
    }

    try {
      // Only call startGame API if user is logged in
      if (user) {
        const session = await startGame(resolvedParams.id);
        setSessionId(session.sessionId);
      }

      timer.start();
      game.startGame();
      setGameStarted(true);
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  const handlePlayAgain = () => {
    setShowResult(false);
    setFinalStats(null);
    setRewards(null);
    game.resetGame();
    timer.reset();
    handleStartGame();
  };

  const handleExit = () => {
    router.push(user ? '/dashboard' : '/games');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  // Start screen
  if (!gameStarted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-900">
            {course.title}
          </h1>

          {/* Trial Mode Banner */}
          {!user && (
            <div className={`mt-4 rounded-lg p-4 ${
              hasRemaining
                ? 'bg-blue-50 border-2 border-blue-200'
                : 'bg-red-50 border-2 border-red-200'
            }`}>
              {hasRemaining ? (
                <div className="text-center">
                  <p className="text-sm text-blue-700 font-medium">
                    🎮 試玩模式 - 剩餘 <span className="text-lg font-bold">{remainingCount}</span> 次
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    登入後可無限暢玩並累積成就 🏆
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-red-700 font-medium">
                    ⏰ 試玩次數已用完
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Link href="/login" className="flex-1">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition">
                        登入
                      </button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium transition">
                        註冊
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <span className="text-gray-600">Level</span>
              <span className="font-bold text-blue-600">
                {course.gameConfig.level}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <span className="text-gray-600">Time Limit</span>
              <span className="font-bold text-blue-600">
                {course.gameConfig.timeLimit}s
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <span className="text-gray-600">Target WPM</span>
              <span className="font-bold text-blue-600">
                {course.gameConfig.targetWPM}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <span className="text-gray-600">Questions</span>
              <span className="font-bold text-blue-600">
                {course.gameConfig.questions.length}
              </span>
            </div>
          </div>
          <button
            onClick={handleStartGame}
            disabled={!user && !hasRemaining}
            className={`mt-8 w-full rounded-lg px-6 py-4 text-xl font-bold text-white shadow-lg transition ${
              !user && !hasRemaining
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-xl'
            }`}
          >
            {!user && !hasRemaining ? '試玩次數已用完' : 'Start Game'}
          </button>
          <button
            onClick={handleExit}
            className="mt-3 w-full rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {user ? 'Back to Dashboard' : 'Back to Games'}
          </button>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
          <GameHeader
            title={course.title}
            level={course.gameConfig.level}
            timeLeft={timer.timeLeft}
            isPaused={timer.isPaused}
            onPause={timer.pause}
            onResume={timer.resume}
            onExit={handleExit}
          />

          <div className="space-y-6 p-6">
            {/* Question Progress */}
            <div className="text-center text-sm text-gray-600">
              Question {game.questionIndex + 1} of{' '}
              {course.gameConfig.questions.length}
            </div>

            {/* Question Display */}
            {game.currentQuestion && (
              <QuestionDisplay
                text={game.currentQuestion.text}
                currentInput={game.currentInput}
                isCorrectChar={game.isCorrectChar}
              />
            )}

            {/* Typing Input */}
            <TypingInput
              value={game.currentInput}
              onChange={game.handleInput}
              disabled={timer.isPaused || game.isGameOver}
            />

            {/* Stats Panel */}
            <StatsPanel
              wpm={game.stats.wpm}
              accuracy={game.stats.accuracy}
              combo={game.stats.combo}
              targetWPM={course.gameConfig.targetWPM}
            />
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {showResult && finalStats && (
        <ResultModal
          isOpen={showResult}
          score={Math.round(finalStats.stats.wpm * finalStats.stats.accuracy)}
          stars={finalStats.stars}
          wpm={finalStats.stats.wpm}
          accuracy={finalStats.stats.accuracy}
          timeSpent={finalStats.timeSpent}
          targetWPM={course.gameConfig.targetWPM}
          experienceGained={rewards?.experienceGained}
          coinsEarned={rewards?.coinsEarned}
          levelUp={rewards?.levelUp}
          newLevel={rewards?.newLevel}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
        />
      )}
    </div>
  );
}
