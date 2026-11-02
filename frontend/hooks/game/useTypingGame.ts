import { useState, useCallback, useRef } from 'react';
import { calculateAccuracy, calculateWpm } from './typing-stats';

export interface Question {
  text: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Stats for the whole game so far. correctChars / totalChars count every question: completed
 * questions (all correct, since a question only completes when the input matches) plus the
 * current input. wpm uses correctChars and the elapsed game time (5 chars = 1 word); it is
 * computed when the game ends (0 while playing; show a live value from the timer instead).
 */
export interface GameStats {
  correctChars: number;
  totalChars: number;
  wpm: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
}

export interface UseTypingGameProps {
  questions: Question[];
  timeLimit: number;
  targetWPM: number;
  onComplete?: (stats: GameStats, stars: number) => void;
  /**
   * Game time elapsed in seconds, used for the finish WPM (and so the stars). Pass the
   * timer's getElapsedSeconds so pauses are excluded and it matches the countdown, the live
   * WPM and timeSpent. Without it, wall-clock time since startGame is used.
   */
  getElapsedSeconds?: () => number;
}

export interface UseTypingGameReturn {
  currentQuestion: Question | null;
  currentInput: string;
  questionIndex: number;
  stats: GameStats;
  isGameOver: boolean;
  isCorrectChar: (index: number) => boolean | null;
  handleInput: (value: string) => void;
  startGame: () => void;
  resetGame: () => void;
  /**
   * End the game now (e.g. time is up) with the current stats; no-op if it already ended.
   * WPM is computed over the elapsed game time (getElapsedSeconds), so it reflects the whole
   * game and not the moment of the last keystroke.
   */
  endGame: (stars?: number) => void;
}

export function useTypingGame({
  questions,
  timeLimit,
  targetWPM,
  onComplete,
  getElapsedSeconds,
}: UseTypingGameProps): UseTypingGameReturn {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [stats, setStats] = useState<GameStats>({
    correctChars: 0,
    totalChars: 0,
    wpm: 0,
    accuracy: 0,
    combo: 0,
    maxCombo: 0,
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const currentQuestion = questions[questionIndex] || null;

  const elapsedSeconds = useCallback(
    () => (getElapsedSeconds ? getElapsedSeconds() : startTime ? (Date.now() - startTime) / 1000 : 0),
    [getElapsedSeconds, startTime],
  );

  const calculateStars = useCallback((wpm: number, accuracy: number): number => {
    if (wpm >= targetWPM && accuracy >= 95) return 3;
    if (wpm >= targetWPM * 0.8 && accuracy >= 85) return 2;
    return 1;
  }, [targetWPM]);

  const isCorrectChar = useCallback((index: number): boolean | null => {
    if (!currentQuestion) return null;
    if (index >= currentInput.length) return null;
    return currentInput[index] === currentQuestion.text[index];
  }, [currentQuestion, currentInput]);

  // onComplete must fire exactly once per game. The guard is a ref (not state) so a
  // second call in the same tick, e.g. a timer that fires twice, is also ignored.
  const finishedRef = useRef(false);
  // Characters of the questions already completed in this game (they are all correct).
  const completedCharsRef = useRef(0);

  const finishGame = useCallback((finalStats: GameStats, stars?: number) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsGameOver(true);
    onComplete?.(finalStats, stars ?? calculateStars(finalStats.wpm, finalStats.accuracy));
  }, [calculateStars, onComplete]);

  const handleInput = useCallback((value: string) => {
    if (!currentQuestion || isGameOver) return;

    // Prevent input longer than question
    if (value.length > currentQuestion.text.length) {
      value = value.slice(0, currentQuestion.text.length);
    }

    setCurrentInput(value);

    // Calculate stats for the whole game: completed questions plus the current input
    const currentCorrect = value.split('').filter((char, i) => char === currentQuestion.text[i]).length;
    const totalChars = completedCharsRef.current + value.length;
    const correctChars = completedCharsRef.current + currentCorrect;
    const accuracy = calculateAccuracy(correctChars, totalChars);

    // Calculate combo
    const lastChar = value[value.length - 1];
    const expectedChar = currentQuestion.text[value.length - 1];
    const isCorrect = lastChar === expectedChar;

    const newCombo = isCorrect ? stats.combo + 1 : 0;
    const maxCombo = Math.max(stats.maxCombo, newCombo);

    setStats((prev) => ({
      ...prev,
      correctChars,
      totalChars,
      accuracy,
      combo: newCombo,
      maxCombo,
    }));

    // Check if question is completed
    if (value === currentQuestion.text) {
      // Move to next question or finish game
      if (questionIndex < questions.length - 1) {
        completedCharsRef.current += currentQuestion.text.length;
        setQuestionIndex(questionIndex + 1);
        setCurrentInput('');
      } else {
        // Game completed: WPM over the elapsed game time (same source as the live WPM)
        const finalStats = { correctChars, totalChars, wpm: calculateWpm(correctChars, elapsedSeconds()), accuracy, combo: newCombo, maxCombo };
        setStats(finalStats);
        finishGame(finalStats);
      }
    }
  }, [currentQuestion, isGameOver, questionIndex, questions.length, stats.combo, stats.maxCombo, elapsedSeconds, finishGame]);

  const startGame = useCallback(() => {
    setQuestionIndex(0);
    setCurrentInput('');
    setStats({
      correctChars: 0,
      totalChars: 0,
      wpm: 0,
      accuracy: 0,
      combo: 0,
      maxCombo: 0,
    });
    setIsGameOver(false);
    setStartTime(Date.now());
    finishedRef.current = false;
    completedCharsRef.current = 0;
  }, []);

  const resetGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const endGame = useCallback((stars?: number) => {
    if (finishedRef.current) return;
    const finalStats = { ...stats, wpm: calculateWpm(stats.correctChars, elapsedSeconds()) };
    setStats(finalStats);
    finishGame(finalStats, stars);
  }, [finishGame, stats, elapsedSeconds]);

  return {
    currentQuestion,
    currentInput,
    questionIndex,
    stats,
    isGameOver,
    isCorrectChar,
    handleInput,
    startGame,
    resetGame,
    endGame,
  };
}
