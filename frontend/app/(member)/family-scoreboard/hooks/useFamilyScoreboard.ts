'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  getScores,
  getTransactions,
  getRewards,
  getRedemptions,
  initializeFamily,
  addTransaction,
  createRedemption,
  processRedemption,
} from '@/lib/api/family-scoreboard';
import type {
  PlayerScoreDto,
  TransactionDto,
  RewardDto,
  RedemptionDto,
  AddTransactionRequest,
  CreateRedemptionRequest,
  ProcessRedemptionRequest,
} from '@/types/family-scoreboard';

export function useFamilyScoreboard(familyId: string) {
  const [scores, setScores] = useState<PlayerScoreDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [rewards, setRewards] = useState<RewardDto[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getScores(familyId);
      setScores(data);
    } catch {
      setError('Failed to load scores');
    }
  }, [familyId]);

  const loadTransactions = useCallback(async (playerId?: string) => {
    if (!familyId) return;
    try {
      const data = await getTransactions(familyId, playerId);
      setTransactions(data);
    } catch {
      setError('Failed to load transactions');
    }
  }, [familyId]);

  const loadRewards = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getRewards(familyId);
      setRewards(data);
    } catch {
      setError('Failed to load rewards');
    }
  }, [familyId]);

  const loadRedemptions = useCallback(async (status?: string) => {
    if (!familyId) return;
    try {
      const data = await getRedemptions(familyId, status);
      setRedemptions(data);
    } catch {
      setError('Failed to load redemptions');
    }
  }, [familyId]);

  const loadAll = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadScores(),
        loadTransactions(),
        loadRewards(),
        loadRedemptions(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [familyId, loadScores, loadTransactions, loadRewards, loadRedemptions]);

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initializeFamily();
      await loadAll();
    } catch {
      setError('Failed to initialize family');
    } finally {
      setLoading(false);
    }
  }, [loadAll]);

  const submitTransaction = useCallback(async (request: AddTransactionRequest) => {
    setError(null);
    try {
      await addTransaction(request);
      await Promise.all([loadScores(), loadTransactions()]);
    } catch {
      setError('Failed to add transaction');
    }
  }, [loadScores, loadTransactions]);

  const submitRedemption = useCallback(async (request: CreateRedemptionRequest) => {
    setError(null);
    try {
      await createRedemption(familyId, request);
      await loadRedemptions();
    } catch {
      setError('Failed to submit redemption');
    }
  }, [familyId, loadRedemptions]);

  const handleRedemption = useCallback(
    async (redemptionId: string, request: ProcessRedemptionRequest) => {
      setError(null);
      try {
        await processRedemption(redemptionId, request);
        await Promise.all([loadScores(), loadRedemptions()]);
      } catch {
        setError('Failed to process redemption');
      }
    },
    [loadScores, loadRedemptions]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    scores,
    transactions,
    rewards,
    redemptions,
    loading,
    error,
    initialize,
    submitTransaction,
    submitRedemption,
    handleRedemption,
    refresh: loadAll,
  };
}
