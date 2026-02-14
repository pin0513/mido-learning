/**
 * 技能列表狀態管理
 */

import { create } from 'zustand';
import { Skill } from '@/types/skill-village/skill';

interface SkillsState {
  skills: Skill[];
  lastFetch: number | null;
  isLoading: boolean;

  setSkills: (skills: Skill[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  getSkillById: (id: string) => Skill | undefined;
  clearCache: () => void;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  lastFetch: null,
  isLoading: false,

  setSkills: (skills: Skill[]) => set({ skills, lastFetch: Date.now() }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),

  getSkillById: (id: string) => {
    return get().skills.find(s => s.id === id);
  },

  clearCache: () => set({ skills: [], lastFetch: null }),
}));
