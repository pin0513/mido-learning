'use client';

import { useEffect, useState } from 'react';
import { FloatingWishBot } from './FloatingWishBot';

/** 預設不掛上浮動許願。WISH_FAB_ENABLED=true 時，這一頁載入後才渲染。 */
export function WishFabGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/wish-fab')
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data: { enabled?: boolean }) => {
        if (!cancelled && data.enabled === true) setEnabled(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!enabled) return null;
  return <FloatingWishBot />;
}
