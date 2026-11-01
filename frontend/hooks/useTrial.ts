/**
 * 試玩模式 React Hook
 */

import { useState, useEffect } from 'react';
import { getTrialRemainingCount, hasTrialRemaining, consumeTrial } from '@/lib/trial';

export function useTrial() {
  const [remainingCount, setRemainingCount] = useState<number>(5);
  const [hasRemaining, setHasRemaining] = useState<boolean>(true);

  const updateTrialStatus = () => {
    const count = getTrialRemainingCount();
    const remaining = hasTrialRemaining();

    setRemainingCount(count);
    setHasRemaining(remaining);
  };

  useEffect(() => {
    // 初始載入試玩次數
    // eslint-disable-next-line react-hooks/set-state-in-effect -- trial count is in browser storage; read after mount to avoid hydration mismatch
    updateTrialStatus();
  }, []);

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
