export type Category = 'adult' | 'kid' | 'Programming' | 'Language' | 'Science' | 'Art';

export type Visibility = 'published' | 'login' | 'private';

export interface Question {
  id: string;
  question: string;
  answer: string;
}

export interface LearningComponent {
  id: string;
  title: string;
  theme?: string;
  subject?: string;
  description: string;
  category: Category | string;
  tags: string[];
  questions: Question[];
  thumbnailUrl?: string;
  visibility: Visibility;
  ratingAverage: number;
  ratingCount: number;
  createdBy?: string | { uid: string; displayName: string };
  createdAt: string;
  updatedAt?: string;
  layoutMode?: 'responsive' | 'fixed';
}

export interface CreateComponentRequest {
  title: string;
  theme: string;
  description?: string;
  category: Category | string; // Allow dynamic categories
  tags: string[];
  questions: Omit<Question, 'id'>[];
  thumbnailUrl?: string;
  layoutMode?: 'responsive' | 'fixed';
}

export interface ComponentListResponse {
  components: LearningComponent[];
  total: number;
  page: number;
  limit: number;
}

export interface ComponentQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  tags?: string;
  search?: string;
  visibility?: Visibility;
  sortBy?: 'createdAt' | 'ratingAverage' | 'ratingCount' | 'title';
  sortOrder?: 'asc' | 'desc';
  createdBy?: string;
}

export interface UpdateComponentRequest {
  title?: string;
  theme?: string;
  description?: string;
  category?: string; // Allow custom categories
  tags?: string[];
  questions?: Omit<Question, 'id'>[];
  thumbnailUrl?: string;
  layoutMode?: 'responsive' | 'fixed';
}

export interface UpdateVisibilityRequest {
  visibility: Visibility;
}

export const VISIBILITY_CONFIG: Record<Visibility, {
  label: string;
  description: string;
  icon: string;
  badgeClass: string;
}> = {
  published: {
    label: '公開',
    description: '所有人都可以看到',
    icon: '🌍',
    badgeClass: 'bg-green-100 text-green-800',
  },
  login: {
    label: '登入可見',
    description: '登入用戶才可以看到',
    icon: '🔑',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  private: {
    label: '私有',
    description: '只有自己可以看到',
    icon: '🔒',
    badgeClass: 'bg-gray-100 text-gray-800',
  },
};

export const CATEGORY_CONFIG: Record<string, {
  label: string;
  primary: string;
  light: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  buttonClass: string;
}> = {
  adult: {
    label: '大人學',
    primary: '#1E40AF',
    light: '#E0F2FE',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
  },
  kid: {
    label: '小人學',
    primary: '#DC2626',
    light: '#FEF3C7',
    textClass: 'text-red-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-red-800',
    buttonClass: 'bg-red-600 hover:bg-red-700',
  },
  game: {
    label: '小遊戲',
    primary: '#EA580C',
    light: '#FFF7ED',
    textClass: 'text-orange-800',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800',
    buttonClass: 'bg-orange-600 hover:bg-orange-700',
  },
  Programming: {
    label: '程式設計',
    primary: '#7C3AED',
    light: '#EDE9FE',
    textClass: 'text-purple-800',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800',
    buttonClass: 'bg-purple-600 hover:bg-purple-700',
  },
  Language: {
    label: '語言學習',
    primary: '#059669',
    light: '#D1FAE5',
    textClass: 'text-green-800',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    badgeClass: 'bg-green-100 text-green-800',
    buttonClass: 'bg-green-600 hover:bg-green-700',
  },
  Science: {
    label: '自然科學',
    primary: '#0891B2',
    light: '#CFFAFE',
    textClass: 'text-cyan-800',
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-200',
    badgeClass: 'bg-cyan-100 text-cyan-800',
    buttonClass: 'bg-cyan-600 hover:bg-cyan-700',
  },
  Art: {
    label: '藝術創作',
    primary: '#DB2777',
    light: '#FCE7F3',
    textClass: 'text-pink-800',
    bgClass: 'bg-pink-50',
    borderClass: 'border-pink-200',
    badgeClass: 'bg-pink-100 text-pink-800',
    buttonClass: 'bg-pink-600 hover:bg-pink-700',
  },
  '商業思維': {
    label: '商業思維',
    primary: '#7C3AED',
    light: '#EDE9FE',
    textClass: 'text-purple-800',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-800',
    buttonClass: 'bg-purple-600 hover:bg-purple-700',
  },
  '運動': {
    label: '運動',
    primary: '#059669',
    light: '#D1FAE5',
    textClass: 'text-green-800',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    badgeClass: 'bg-green-100 text-green-800',
    buttonClass: 'bg-green-600 hover:bg-green-700',
  },
};

// Default config for unknown categories
export const DEFAULT_CATEGORY_CONFIG = {
  label: '其他',
  primary: '#6B7280',
  light: '#F3F4F6',
  textClass: 'text-gray-800',
  bgClass: 'bg-gray-50',
  borderClass: 'border-gray-200',
  badgeClass: 'bg-gray-100 text-gray-800',
  buttonClass: 'bg-gray-600 hover:bg-gray-700',
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG;
}
