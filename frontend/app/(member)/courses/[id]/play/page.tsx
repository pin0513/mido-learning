'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
    if (!course || !sessionId) return;

    const timeSpent = course.gameConfig.timeLimit - timer.timeLeft;

    // Save final stats for result modal
    setFinalStats({ stats, stars, timeSpent });

    // Call API to complete game
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

    try {
      const session = await startGame(resolvedParams.id);
      setSessionId(session.sessionId);
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
    router.push('/dashboard');
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-900">
            {course.title}
          </h1>
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
            className="mt-8 w-full rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-xl font-bold text-white shadow-lg transition hover:shadow-xl"
          >
            Start Game
          </button>
          <button
            onClick={handleExit}
            className="mt-3 w-full rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Back to Dashboard
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
