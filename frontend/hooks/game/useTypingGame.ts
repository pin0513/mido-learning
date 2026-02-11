import { useState, useCallback, useEffect } from 'react';

export interface Question {
  text: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

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
}

export function useTypingGame({
  questions,
  timeLimit,
  targetWPM,
  onComplete,
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

  const calculateWPM = useCallback((correctChars: number, seconds: number): number => {
    if (seconds === 0) return 0;
    return Math.round((correctChars / 5) / (seconds / 60));
  }, []);

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

  const handleInput = useCallback((value: string) => {
    if (!currentQuestion || isGameOver) return;

    // Prevent input longer than question
    if (value.length > currentQuestion.text.length) {
      value = value.slice(0, currentQuestion.text.length);
    }

    setCurrentInput(value);

    // Calculate stats
    const totalChars = value.length;
    const correctChars = value.split('').filter((char, i) => char === currentQuestion.text[i]).length;
    const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 0;

    // Calculate combo
    const lastChar = value[value.length - 1];
    const expectedChar = currentQuestion.text[value.length - 1];
    const isCorrect = lastChar === expectedChar;

    const newCombo = isCorrect ? stats.combo + 1 : 0;
    const maxCombo = Math.max(stats.maxCombo, newCombo);

    // Calculate WPM
    const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;
    const wpm = calculateWPM(correctChars, elapsedSeconds);

    setStats((prev) => ({
      ...prev,
      correctChars,
      totalChars,
      wpm,
      accuracy,
      combo: newCombo,
      maxCombo,
    }));

    // Check if question is completed
    if (value === currentQuestion.text) {
      // Move to next question or finish game
      if (questionIndex < questions.length - 1) {
        setQuestionIndex(questionIndex + 1);
        setCurrentInput('');
      } else {
        // Game completed
        finishGame({ correctChars, totalChars, wpm, accuracy, combo: newCombo, maxCombo });
      }
    }
  }, [currentQuestion, isGameOver, questionIndex, questions.length, stats.combo, stats.maxCombo, startTime, calculateWPM]);

  const finishGame = useCallback((finalStats: GameStats) => {
    setIsGameOver(true);
    const stars = calculateStars(finalStats.wpm, finalStats.accuracy);
    onComplete?.(finalStats, stars);
  }, [calculateStars, onComplete]);

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
  }, []);

  const resetGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // Handle time up
  useEffect(() => {
    if (isGameOver && startTime) {
      finishGame(stats);
    }
  }, [isGameOver, startTime, stats, finishGame]);

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
  };
}
