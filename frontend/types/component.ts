export type Category = 'adult' | 'kid';

export interface Question {
  id: string;
  question: string;
  answer: string;
}

export interface LearningComponent {
  id: string;
  title: string;
  subject: string;
  description: string;
  category: Category;
  tags: string[];
  questions: Question[];
  thumbnailUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComponentRequest {
  title: string;
  subject: string;
  description: string;
  category: Category;
  tags: string[];
  questions: Omit<Question, 'id'>[];
  thumbnailUrl?: string;
}

export interface ComponentListResponse {
  data: LearningComponent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComponentQueryParams {
  page?: number;
  limit?: number;
  category?: Category;
  tags?: string;
}

export const CATEGORY_CONFIG = {
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
} as const;
