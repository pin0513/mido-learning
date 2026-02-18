// Types for Family Scoreboard feature

export interface PlayerScoreDto {
  playerId: string;
  name: string;
  color: string;
  achievementPoints: number;
  redeemablePoints: number;
  totalEarned: number;
  totalDeducted: number;
  totalRedeemed: number;
}

export interface TransactionDto {
  id: string;
  playerIds: string[];
  type: 'earn' | 'deduct';
  amount: number;
  reason: string;
  categoryId: string | null;
  createdBy: string;
  createdAt: string;
  note: string | null;
}

export interface RewardDto {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string;
  isActive: boolean;
  stock: number | null;
}

export interface RedemptionDto {
  id: string;
  playerId: string;
  rewardId: string;
  rewardName: string;
  cost: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  note: string | null;
}

export interface AddTransactionRequest {
  playerIds: string[];
  type: 'earn' | 'deduct';
  amount: number;
  reason: string;
  categoryId?: string;
  note?: string;
}

export interface CreateRedemptionRequest {
  rewardId: string;
  note?: string;
}

export interface ProcessRedemptionRequest {
  action: 'approve' | 'reject';
  note?: string;
}
