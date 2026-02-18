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

export async function initializeFamily(): Promise<{ familyId: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/initialize`, {
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
  request: AddTransactionRequest
): Promise<TransactionDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/api/family-scoreboard/transactions`, {
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
  request: ProcessRedemptionRequest
): Promise<RedemptionDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_URL}/api/family-scoreboard/redemptions/${redemptionId}/process`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    }
  );
  if (res.status === 401) throw new Error('Unauthorized');
  if (!res.ok) throw new Error('Failed to process redemption');
  return res.json();
}
