export type WishStatus = 'pending' | 'processing' | 'completed' | 'deleted';

export interface Wish {
  id: string;
  content: string;
  email: string;
  status: WishStatus;
  linkedComponentId?: string;
  linkedComponentTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishListResponse {
  success: boolean;
  data: {
    wishes: Wish[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface WishQueryParams {
  page?: number;
  limit?: number;
  status?: WishStatus;
  search?: string;
}

export interface UpdateWishStatusRequest {
  status: WishStatus;
  linkedComponentId?: string;
}

export interface CreateComponentFromWishRequest {
  title: string;
  subject: string;
  description: string;
  category: string;
  tags: string[];
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export interface DailyWishCount {
  date: string;
  count: number;
}

export interface WishStats {
  totalCount: number;
  byStatus: Record<WishStatus, number>;
  weeklyTrend: DailyWishCount[];
  avgProcessingTimeHours: number;
  completionRate: number;
}

export interface WishStatsResponse {
  success: boolean;
  data: WishStats;
}

export const WISH_STATUS_CONFIG = {
  pending: {
    label: '待處理',
    textClass: 'text-amber-800',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  processing: {
    label: '處理中',
    textClass: 'text-blue-800',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  completed: {
    label: '已完成',
    textClass: 'text-green-800',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    badgeClass: 'bg-green-100 text-green-800',
  },
  deleted: {
    label: '已刪除',
    textClass: 'text-gray-600',
    bgClass: 'bg-gray-50',
    borderClass: 'border-gray-200',
    badgeClass: 'bg-gray-100 text-gray-600',
  },
} as const;
