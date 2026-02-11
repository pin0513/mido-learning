/**
 * 遊戲狀態管理
 */

import { create } from 'zustand';
import { GameSession, GamePerformance } from '@/types/skill-village/game';

interface GameState {
  currentSession: GameSession | null;
  isPlaying: boolean;
  startTime: number | null;
  performance: GamePerformance;

  startGame: (skillId: string, levelId: string) => void;
  updatePerformance: (data: Partial<GamePerformance>) => void;
  endGame: () => void;
  resetGame: () => void;
}

const defaultPerformance: GamePerformance = {
  playTime: 0,
  accuracy: 0,
  wpm: 0,
};

export const useGameStore = create<GameState>((set) => ({
  currentSession: null,
  isPlaying: false,
  startTime: null,
  performance: defaultPerformance,

  startGame: (skillId, levelId) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    set({
      currentSession: { sessionId, skillId, levelId },
      isPlaying: true,
      startTime: Date.now(),
      performance: defaultPerformance,
    });
  },

  updatePerformance: (data) => set((state) => ({
    performance: { ...state.performance, ...data },
  })),

  endGame: () => set({ isPlaying: false }),

  resetGame: () => set({
    currentSession: null,
    isPlaying: false,
    startTime: null,
    performance: defaultPerformance,
  }),
}));
