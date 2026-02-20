'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { parsePlayerToken } from '@/lib/playerAuth';
import type { PlayerJwtPayload } from '@/lib/playerAuth';

interface PlayerContextValue {
  playerId: string;
  playerName: string;
  familyId: string;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayerContext must be used within PlayerLayout');
  return ctx;
}

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [playerInfo, setPlayerInfo] = useState<PlayerJwtPayload | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const payload = parsePlayerToken();
    if (!payload) {
      router.replace('/family-login');
    } else {
      setPlayerInfo(payload);
    }
    setChecked(true);
  }, [router]);

  if (!checked || !playerInfo) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-amber-400 text-4xl animate-spin">⭐</div>
      </div>
    );
  }

  return (
    <PlayerContext.Provider value={{
      playerId: playerInfo.playerId,
      playerName: playerInfo.playerName,
      familyId: playerInfo.familyId,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}
