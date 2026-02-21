'use client';

import { getIdToken } from '@/lib/auth';
import type {
  PlayerScoreDto,
  TransactionDto,
  RewardDto,
  RedemptionDto,
  AddTransactionRequest,
  CreateRedemptionRequest,
  ProcessRedemptionRequest,
  FamilyLookupDto,
  PlayerLoginRequest,
  PlayerTokenDto,
  CreatePlayerRequest,
  UpdatePlayerRequest,
  SetPlayerPasswordRequest,
  TaskDto,
  CreateTaskRequest,
  TaskCompletionDto,
  SubmitTaskCompletionRequest,
  ProcessTaskCompletionRequest,
  PlayerSubmissionDto,
  CreatePlayerSubmissionRequest,
  AllowanceLedgerDto,
  AllowanceBalanceDto,
  AdjustAllowanceRequest,
  ShopItemDto,
  ShopOrderDto,
  CreateShopItemRequest,
  CreateShopOrderRequest,
  ProcessShopOrderRequest,
  EventDto,
  CreateEventRequest,
  TaskTemplateDto,
  CreateTaskTemplateRequest,
  FamilyBackupDto,
  SealDto,
  PenaltyDto,
  ActiveEffectDto,
  PlayerStatusDto,
  CreateSealRequest,
  CreatePenaltyRequest,
  CreateEffectRequest,
  AddTransactionWithEffectsRequest,
  CoAdminDto,
  AddCoAdminRequest,
  MyFamilyItemDto,
} from '@/types/family-scoreboard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Initialize ────────────────────────────────────────────────────────────────

export async function initializeFamily(familyId?: string): Promise<{ familyId: string }> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/initialize`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to initialize family');
  return res.json();
}

// ── Scores ────────────────────────────────────────────────────────────────────

export async function getScores(familyId: string): Promise<PlayerScoreDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/scores`, {
    headers,
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch scores');
  return res.json();
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(
  familyId: string,
  playerId?: string
): Promise<TransactionDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/transactions`);
  if (playerId) url.searchParams.set('playerId', playerId);
  const res = await fetch(url.toString(), { headers });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function addTransaction(
  request: AddTransactionRequest,
  familyId?: string
): Promise<TransactionDto> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/transactions`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to add transaction');
  return res.json();
}

// ── Rewards ───────────────────────────────────────────────────────────────────

export async function getRewards(familyId: string): Promise<RewardDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/rewards`, {
    headers,
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch rewards');
  return res.json();
}

// ── Redemptions ───────────────────────────────────────────────────────────────

export async function getRedemptions(
  familyId: string,
  status?: string
): Promise<RedemptionDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/redemptions`);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url.toString(), { headers });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to fetch redemptions');
  return res.json();
}

export async function createRedemption(
  familyId: string,
  request: CreateRedemptionRequest
): Promise<RedemptionDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/redemptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to create redemption');
  return res.json();
}

export async function processRedemption(
  redemptionId: string,
  request: ProcessRedemptionRequest,
  familyId?: string
): Promise<RedemptionDto> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/redemptions/${redemptionId}/process`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to process redemption');
  return res.json();
}

// ─────────────────────────── Player Auth helpers ───────────────────────────

async function getPlayerAuthHeaders(): Promise<HeadersInit> {
  const { getPlayerToken } = await import('@/lib/playerAuth');
  const token = getPlayerToken();
  if (!token) throw new Error('Not authenticated as player');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ─────────────────────────── Public (no auth) ──────────────────────────────

export async function lookupFamilyByCode(code: string): Promise<FamilyLookupDto> {
  const res = await fetch(`${API_URL}/api/family-scoreboard/lookup?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error('Family not found');
  return res.json() as Promise<FamilyLookupDto>;
}

export async function playerLogin(request: PlayerLoginRequest): Promise<PlayerTokenDto> {
  const res = await fetch(`${API_URL}/api/family-scoreboard/player-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (res.status === 401) throw new Error('Invalid password');
  if (!res.ok) throw new Error('Login failed');
  return res.json() as Promise<PlayerTokenDto>;
}

// ─────────────────────────── Admin ─────────────────────────────────────────

export async function generateDisplayCode(familyId?: string): Promise<{ displayCode: string }> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/generate-code`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to generate code');
  return res.json() as Promise<{ displayCode: string }>;
}

export async function regenerateDisplayCode(familyId?: string): Promise<{ displayCode: string }> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/regenerate-code`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to regenerate code');
  return res.json() as Promise<{ displayCode: string }>;
}

export async function setDisplayCode(code: string, familyId?: string): Promise<{ displayCode: string }> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/set-code`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '代碼設定失敗');
    throw new Error(msg);
  }
  return res.json() as Promise<{ displayCode: string }>;
}

export async function createPlayer(familyId: string, request: CreatePlayerRequest): Promise<PlayerScoreDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/players`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create player');
  return res.json() as Promise<PlayerScoreDto>;
}

export async function updatePlayer(familyId: string, playerId: string, request: UpdatePlayerRequest): Promise<PlayerScoreDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/players/${playerId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to update player');
  return res.json() as Promise<PlayerScoreDto>;
}

export async function setPlayerPassword(familyId: string, playerId: string, request: SetPlayerPasswordRequest): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/players/${playerId}/password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to set password');
}

export async function deletePlayer(familyId: string, playerId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/players/${playerId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok && res.status !== 404) throw new Error('Failed to delete player');
}

export async function lookupUserByEmail(email: string): Promise<{ uid: string; email: string; displayName: string | null } | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/lookup-user?email=${encodeURIComponent(email)}`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to lookup user');
  return res.json() as Promise<{ uid: string; email: string; displayName: string | null }>;
}

export async function getCoAdmins(familyId: string): Promise<CoAdminDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/co-admins`, { headers });
  if (!res.ok) throw new Error('Failed to get co-admins');
  return res.json() as Promise<CoAdminDto[]>;
}

export async function addCoAdmin(familyId: string, request: AddCoAdminRequest): Promise<CoAdminDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/co-admins`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to add co-admin');
  return res.json() as Promise<CoAdminDto>;
}

export async function removeCoAdmin(familyId: string, coAdminUid: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/co-admins/${coAdminUid}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok && res.status !== 404) throw new Error('Failed to remove co-admin');
}

export async function getMyFamily(): Promise<{ familyId: string; isPrimaryAdmin: boolean } | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/my-family`, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to get my family');
  return res.json() as Promise<{ familyId: string; isPrimaryAdmin: boolean }>;
}

export async function getMyFamilies(): Promise<MyFamilyItemDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/my-families`, { headers });
  if (!res.ok) throw new Error('Failed to get my families');
  return res.json() as Promise<MyFamilyItemDto[]>;
}

export async function leaveFamily(familyId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/leave`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: '離開家庭失敗' }));
    throw new Error((data as { message: string }).message);
  }
}

export async function createTask(familyId: string, request: CreateTaskRequest): Promise<TaskDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json() as Promise<TaskDto>;
}

export async function getTasks(familyId: string): Promise<TaskDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/tasks`, { headers });
  if (!res.ok) throw new Error('Failed to get tasks');
  return res.json() as Promise<TaskDto[]>;
}

export async function updateTask(familyId: string, taskId: string, request: CreateTaskRequest): Promise<TaskDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/tasks/${taskId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json() as Promise<TaskDto>;
}

export async function deactivateTask(familyId: string, taskId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to deactivate task');
}

export async function getTaskCompletions(familyId: string, status?: string): Promise<TaskCompletionDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/task-completions`);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get task completions');
  return res.json() as Promise<TaskCompletionDto[]>;
}

export async function processTaskCompletion(familyId: string, completionId: string, request: ProcessTaskCompletionRequest): Promise<TaskCompletionDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/task-completions/${completionId}/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to process task completion');
  return res.json() as Promise<TaskCompletionDto>;
}

export async function getPlayerSubmissions(familyId: string, status?: string): Promise<PlayerSubmissionDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/player-submissions`);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get player submissions');
  return res.json() as Promise<PlayerSubmissionDto[]>;
}

export async function processPlayerSubmission(familyId: string, submissionId: string, request: ProcessTaskCompletionRequest): Promise<PlayerSubmissionDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/player-submissions/${submissionId}/process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to process player submission');
  return res.json() as Promise<PlayerSubmissionDto>;
}

// ─────────────────────────── Player (Player JWT) ───────────────────────────

export async function getAvailableTasks(familyId: string): Promise<TaskDto[]> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/tasks/available`, { headers });
  if (!res.ok) throw new Error('Failed to get available tasks');
  return res.json() as Promise<TaskDto[]>;
}

export async function submitTaskCompletion(familyId: string, request: SubmitTaskCompletionRequest): Promise<TaskCompletionDto> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/task-completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to submit task completion');
  return res.json() as Promise<TaskCompletionDto>;
}

export async function submitPlayerSubmission(familyId: string, request: CreatePlayerSubmissionRequest): Promise<PlayerSubmissionDto> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/player-submissions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to submit player submission');
  return res.json() as Promise<PlayerSubmissionDto>;
}

export async function getMyHistory(familyId: string): Promise<TransactionDto[]> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/my-history`, { headers });
  if (!res.ok) throw new Error('Failed to get history');
  return res.json() as Promise<TransactionDto[]>;
}

// ─────────────────────────── Phase 3 Admin - Allowance ─────────────────────

export async function getAllowanceLedger(familyId: string, playerId?: string): Promise<AllowanceLedgerDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/allowance`);
  if (playerId) url.searchParams.set('playerId', playerId);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get allowance ledger');
  return res.json() as Promise<AllowanceLedgerDto[]>;
}

export async function getAllowanceBalance(familyId: string, playerId: string): Promise<AllowanceBalanceDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/allowance/${playerId}/balance`, { headers });
  if (!res.ok) throw new Error('Failed to get allowance balance');
  return res.json() as Promise<AllowanceBalanceDto>;
}

export async function adjustAllowance(familyId: string, request: AdjustAllowanceRequest): Promise<AllowanceLedgerDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/allowance`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to adjust allowance');
  return res.json() as Promise<AllowanceLedgerDto>;
}

// ─────────────────────────── Phase 3 Admin - Shop Management ───────────────

export async function getShopItems(familyId: string): Promise<ShopItemDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-items`, { headers });
  if (!res.ok) throw new Error('Failed to get shop items');
  return res.json() as Promise<ShopItemDto[]>;
}

export async function createShopItem(familyId: string, request: CreateShopItemRequest): Promise<ShopItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-items`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create shop item');
  return res.json() as Promise<ShopItemDto>;
}

export async function updateShopItem(familyId: string, itemId: string, request: CreateShopItemRequest): Promise<ShopItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-items/${itemId}`, {
    method: 'PUT', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to update shop item');
  return res.json() as Promise<ShopItemDto>;
}

export async function deactivateShopItem(familyId: string, itemId: string): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-items/${itemId}`, {
    method: 'DELETE', headers,
  });
}

export async function getShopOrders(familyId: string, status?: string): Promise<ShopOrderDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/shop-orders`);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get shop orders');
  return res.json() as Promise<ShopOrderDto[]>;
}

export async function processShopOrder(familyId: string, orderId: string, request: ProcessShopOrderRequest): Promise<ShopOrderDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-orders/${orderId}/process`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to process shop order');
  return res.json() as Promise<ShopOrderDto>;
}

// ─────────────────────────── Phase 3 Admin - Events ────────────────────────

export async function getEvents(familyId: string, month?: string): Promise<EventDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/events`);
  if (month) url.searchParams.set('month', month);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get events');
  return res.json() as Promise<EventDto[]>;
}

export async function createEvent(familyId: string, request: CreateEventRequest): Promise<EventDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/events`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json() as Promise<EventDto>;
}

export async function deleteEvent(familyId: string, eventId: string): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${API_URL}/api/family-scoreboard/${familyId}/events/${eventId}`, {
    method: 'DELETE', headers,
  });
}

// ─────────────────────────── Phase 3 Admin - Task Templates ────────────────

export async function getTaskTemplates(familyId: string): Promise<TaskTemplateDto[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/task-templates`, { headers });
  if (!res.ok) throw new Error('Failed to get task templates');
  return res.json() as Promise<TaskTemplateDto[]>;
}

export async function createTaskTemplate(familyId: string, request: CreateTaskTemplateRequest): Promise<TaskTemplateDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/task-templates`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create task template');
  return res.json() as Promise<TaskTemplateDto>;
}

export async function deleteTaskTemplate(familyId: string, templateId: string): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${API_URL}/api/family-scoreboard/${familyId}/task-templates/${templateId}`, {
    method: 'DELETE', headers,
  });
}

// ─────────────────────────── Phase 3 Player - Shop ─────────────────────────

export async function getPlayerShopItems(familyId: string): Promise<ShopItemDto[]> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-items`, { headers });
  if (!res.ok) throw new Error('Failed to get shop items');
  return res.json() as Promise<ShopItemDto[]>;
}

export async function createPlayerShopOrder(familyId: string, request: CreateShopOrderRequest): Promise<ShopOrderDto> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/shop-orders`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create shop order');
  return res.json() as Promise<ShopOrderDto>;
}

export async function getPlayerAllowanceBalance(familyId: string): Promise<AllowanceBalanceDto> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/allowance/balance`, { headers });
  if (!res.ok) throw new Error('Failed to get balance');
  return res.json() as Promise<AllowanceBalanceDto>;
}

export async function getPlayerAllowanceLedger(familyId: string): Promise<AllowanceLedgerDto[]> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/allowance/ledger`, { headers });
  if (!res.ok) throw new Error('Failed to get ledger');
  return res.json() as Promise<AllowanceLedgerDto[]>;
}

export async function getPlayerEvents(familyId: string, month?: string): Promise<EventDto[]> {
  const headers = await getPlayerAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/events`);
  if (month) url.searchParams.set('month', month);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get events');
  return res.json() as Promise<EventDto[]>;
}

// ─────────────────────────── Phase 4 - Backup ──────────────────────────────

export async function exportFamilyBackup(familyId: string): Promise<FamilyBackupDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/backup`, { headers });
  if (!res.ok) throw new Error('匯出失敗');
  return res.json() as Promise<FamilyBackupDto>;
}

export async function importFamilyBackup(familyId: string, backup: FamilyBackupDto): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/backup/import`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(backup),
  });
  if (!res.ok) throw new Error('匯入失敗');
}

// ─────────────────────────── Phase 4 - Admin Transactions ──────────────────

export async function addAdminTransaction(
  familyId: string,
  request: AddTransactionRequest
): Promise<TransactionDto> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/transactions`);
  if (familyId) url.searchParams.set('familyId', familyId);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('交易失敗');
  return res.json() as Promise<TransactionDto>;
}

export async function updateEvent(familyId: string, eventId: string, request: CreateEventRequest): Promise<EventDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/events/${eventId}`, {
    method: 'PUT', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json() as Promise<EventDto>;
}

// ─────────────────────────── Seal / Penalty / ActiveEffect ─────────────────

export async function addTransactionWithEffects(
  familyId: string, request: AddTransactionWithEffectsRequest
): Promise<TransactionDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/transactions-with-effects`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('交易失敗');
  return res.json() as Promise<TransactionDto>;
}

export async function getSeals(familyId: string, playerId?: string, status?: string): Promise<SealDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/seals`);
  if (playerId) url.searchParams.set('playerId', playerId);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get seals');
  return res.json() as Promise<SealDto[]>;
}

export async function createSeal(familyId: string, request: CreateSealRequest): Promise<SealDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/seals`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create seal');
  return res.json() as Promise<SealDto>;
}

export async function liftSeal(familyId: string, sealId: string): Promise<SealDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/seals/${sealId}/lift`, {
    method: 'POST', headers,
  });
  if (!res.ok) throw new Error('Failed to lift seal');
  return res.json() as Promise<SealDto>;
}

export async function getPenalties(familyId: string, playerId?: string, status?: string): Promise<PenaltyDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/penalties`);
  if (playerId) url.searchParams.set('playerId', playerId);
  if (status) url.searchParams.set('status', status);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get penalties');
  return res.json() as Promise<PenaltyDto[]>;
}

export async function createPenalty(familyId: string, request: CreatePenaltyRequest): Promise<PenaltyDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/penalties`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create penalty');
  return res.json() as Promise<PenaltyDto>;
}

export async function completePenalty(familyId: string, penaltyId: string): Promise<PenaltyDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/penalties/${penaltyId}/complete`, {
    method: 'POST', headers,
  });
  if (!res.ok) throw new Error('Failed to complete penalty');
  return res.json() as Promise<PenaltyDto>;
}

export async function getActiveEffects(familyId: string, playerId?: string): Promise<ActiveEffectDto[]> {
  const headers = await getAuthHeaders();
  const url = new URL(`${API_URL}/api/family-scoreboard/${familyId}/active-effects`);
  if (playerId) url.searchParams.set('playerId', playerId);
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error('Failed to get active effects');
  return res.json() as Promise<ActiveEffectDto[]>;
}

export async function createActiveEffect(familyId: string, request: CreateEffectRequest): Promise<ActiveEffectDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/active-effects`, {
    method: 'POST', headers, body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to create active effect');
  return res.json() as Promise<ActiveEffectDto>;
}

export async function expireEffect(familyId: string, effectId: string): Promise<ActiveEffectDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/active-effects/${effectId}/expire`, {
    method: 'POST', headers,
  });
  if (!res.ok) throw new Error('Failed to expire effect');
  return res.json() as Promise<ActiveEffectDto>;
}

export async function getPlayerStatus(familyId: string, playerId: string): Promise<PlayerStatusDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/players/${playerId}/status`, { headers });
  if (!res.ok) throw new Error('Failed to get player status');
  return res.json() as Promise<PlayerStatusDto>;
}

export async function getMyStatus(familyId: string): Promise<PlayerStatusDto> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/my-status`, { headers });
  if (!res.ok) throw new Error('Failed to get status');
  return res.json() as Promise<PlayerStatusDto>;
}

export async function getMyEffects(familyId: string): Promise<ActiveEffectDto[]> {
  const headers = await getPlayerAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/my-effects`, { headers });
  if (!res.ok) throw new Error('Failed to get effects');
  return res.json() as Promise<ActiveEffectDto[]>;
}

export async function deleteTransactions(familyId: string, ids: string[]): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/transactions`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to delete transactions');
}

export async function deleteRedemptions(familyId: string, ids: string[]): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/${familyId}/redemptions`, {
    method: 'DELETE',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to delete redemptions');
}
