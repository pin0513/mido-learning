/**
 * 試玩模式 React Hook
 */

import { useState, useEffect } from 'react';
import { getTrialRemainingCount, hasTrialRemaining, consumeTrial } from '@/lib/trial';

export function useTrial() {
  const [remainingCount, setRemainingCount] = useState<number>(5);
  const [hasRemaining, setHasRemaining] = useState<boolean>(true);

  useEffect(() => {
    // 初始載入試玩次數
    updateTrialStatus();
  }, []);

  const updateTrialStatus = () => {
    const count = getTrialRemainingCount();
    const remaining = hasTrialRemaining();

    setRemainingCount(count);
    setHasRemaining(remaining);
  };

  const consume = () => {
    const newCount = consumeTrial();
    setRemainingCount(newCount);
    setHasRemaining(newCount > 0);
    return newCount;
  };

  return {
    remainingCount,
    hasRemaining,
    consume,
    refresh: updateTrialStatus,
  };
}
