/**
 * 認證狀態管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  // 狀態
  token: string | null;
  isAuthenticated: boolean;
  currentCharacterId: string | null;

  // 動作
  login: (token: string, characterId: string) => void;
  logout: () => void;
  switchCharacter: (characterId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isAuthenticated: false,
      currentCharacterId: null,

      login: (token, characterId) => set({
        token,
        isAuthenticated: true,
        currentCharacterId: characterId,
      }),

      logout: () => set({
        token: null,
        isAuthenticated: false,
        currentCharacterId: null,
      }),

      switchCharacter: (characterId) => set({ currentCharacterId: characterId }),
    }),
    {
      name: 'skill-village-auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        currentCharacterId: state.currentCharacterId,
      }),
    }
  )
);
