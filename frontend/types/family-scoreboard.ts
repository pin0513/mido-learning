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
  emoji?: string | null;
  role?: string | null;
  birthday?: string | null;
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

// ── Player Management ─────────────────────────────────────────────────────

export interface CreatePlayerRequest {
  playerId: string;
  name: string;
  color: string;
  emoji?: string;
  role?: string;
  birthday?: string;
}

export interface UpdatePlayerRequest {
  name: string;
  color: string;
  emoji?: string;
  role?: string;
  birthday?: string;
}

export interface SetPlayerPasswordRequest {
  password: string;
}

// ── Family Lookup ─────────────────────────────────────────────────────────

export interface FamilyLookupDto {
  familyId: string;
  familyCode: string;
  players: PlayerSummaryDto[];
}

export interface PlayerSummaryDto {
  playerId: string;
  name: string;
  color: string;
  emoji?: string | null;
  hasPassword: boolean;
}

// ── Player Auth ───────────────────────────────────────────────────────────

export interface PlayerLoginRequest {
  familyCode: string;
  playerId: string;
  password: string;
}

export interface PlayerTokenDto {
  token: string;
  playerId: string;
  playerName: string;
  familyId: string;
}

// ── Tasks ─────────────────────────────────────────────────────────────────

export interface TaskDto {
  taskId: string;
  title: string;
  type: 'household' | 'exam' | 'activity';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  allowanceReward: number;
  description?: string | null;
  isActive: boolean;
  periodType: 'once' | 'daily' | 'weekly';
  weekDays: number[];
  assignedPlayerIds: string[];
  playerProposed: boolean;
}

export interface CreateTaskRequest {
  title: string;
  type: 'household' | 'exam' | 'activity';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward?: number;
  allowanceReward?: number;
  description?: string;
  periodType?: 'once' | 'daily' | 'weekly';
  weekDays?: number[];
  assignedPlayerIds?: string[];
}

// ── Task Completions ──────────────────────────────────────────────────────

export interface TaskCompletionDto {
  completionId: string;
  taskId: string;
  taskTitle: string;
  xpReward: number;
  playerId: string;
  note?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  processedAt?: string | null;
}

export interface SubmitTaskCompletionRequest {
  taskId: string;
  note?: string;
}

export interface ProcessTaskCompletionRequest {
  action: 'approve' | 'reject';
  note?: string;
}

// ── Player Self-Submissions ───────────────────────────────────────────────

export interface PlayerSubmissionDto {
  submissionId: string;
  playerId: string;
  type: 'earn';
  amount: number;
  reason: string;
  categoryType: 'household' | 'exam' | 'activity';
  note?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  processedAt?: string | null;
}

export interface CreatePlayerSubmissionRequest {
  categoryType: 'household' | 'exam' | 'activity';
  reason: string;
  amount: number;
  note?: string;
}

// ── Phase 3 - Allowance（零用金） ─────────────────────────────────────────

export interface AllowanceLedgerDto {
  recordId: string;
  playerId: string;
  amount: number;
  reason: string;
  type: 'earn' | 'spend' | 'adjust';
  createdBy: string;
  createdAt: string;
  note?: string | null;
}

export interface AdjustAllowanceRequest {
  playerId: string;
  amount: number;
  reason: string;
  note?: string;
}

export interface AllowanceBalanceDto {
  playerId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

// ── Phase 3 - Shop（商城） ────────────────────────────────────────────────

export interface ShopItemDto {
  itemId: string;
  name: string;
  description: string;
  price: number;
  type: 'physical' | 'activity' | 'privilege' | 'money';
  emoji: string;
  isActive: boolean;
  stock?: number | null;
  priceType: string;          // "allowance" | "xp"
  dailyLimit: number | null;  // null = 無上限
  allowanceGiven: number;     // XP 兌換時給予的零用金
}

export interface CreateShopItemRequest {
  name: string;
  description: string;
  price: number;
  type: 'physical' | 'activity' | 'privilege' | 'money';
  emoji: string;
  stock?: number;
  priceType?: string;
  dailyLimit?: number;
  allowanceGiven?: number;
}

export interface ShopOrderDto {
  orderId: string;
  playerId: string;
  itemId: string;
  itemName: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  processedAt?: string | null;
  processedBy?: string | null;
  note?: string | null;
}

export interface CreateShopOrderRequest {
  itemId: string;
  note?: string;
}

export interface ProcessShopOrderRequest {
  action: 'approve' | 'reject';
  note?: string;
}

// ── Phase 3 - Events（行事曆） ────────────────────────────────────────────

export interface EventDto {
  eventId: string;
  title: string;
  type: 'trip' | 'sports' | 'activity' | 'other';
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  emoji: string;
  color: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateEventRequest {
  title: string;
  type: 'trip' | 'sports' | 'activity' | 'other';
  startDate: string;
  endDate?: string;
  description?: string;
  emoji?: string;
  color?: string;
}

// ── Phase 3 - Task Templates（任務範本） ──────────────────────────────────

export interface TaskTemplateDto {
  templateId: string;
  name: string;
  description?: string | null;
  taskIds: string[];
}

export interface CreateTaskTemplateRequest {
  name: string;
  description?: string;
  taskIds?: string[];
}

// ── Phase 4 - Backup（備份） ───────────────────────────────────────────────

export interface FamilyBackupDto {
  familyId: string;
  version: string;
  exportedAt: string;
  players: PlayerScoreDto[];
  transactions: TransactionDto[];
  tasks: TaskDto[];
  shopItems: ShopItemDto[];
  events: EventDto[];
  taskTemplates: TaskTemplateDto[];
  allowanceLedger: AllowanceLedgerDto[];
}
