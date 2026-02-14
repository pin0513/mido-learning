/**
 * 角色狀態管理
 */

import { create } from 'zustand';
import { Character } from '@/types/skill-village/character';

interface CharacterState {
  // 狀態
  currentCharacter: Character | null;
  characters: Character[]; // 完整註冊帳號的所有角色
  isLoading: boolean;

  // 動作
  setCurrentCharacter: (character: Character) => void;
  setCharacters: (characters: Character[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  clearCurrentCharacter: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  currentCharacter: null,
  characters: [],
  isLoading: false,

  setCurrentCharacter: (character: Character) => set({ currentCharacter: character }),
  setCharacters: (characters: Character[]) => set({ characters }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  clearCurrentCharacter: () => set({ currentCharacter: null, characters: [] }),
}));
