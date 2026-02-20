'use client';

const PLAYER_TOKEN_KEY = 'player_token';

export function savePlayerToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYER_TOKEN_KEY, token);
  }
}

export function getPlayerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLAYER_TOKEN_KEY);
}

export function clearPlayerToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PLAYER_TOKEN_KEY);
  }
}

export function getPlayerTokenHeaders(): HeadersInit {
  const token = getPlayerToken();
  if (!token) throw new Error('Not authenticated as player');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface PlayerJwtPayload {
  playerId: string;
  playerName: string;
  familyId: string;
  type: string;
  exp: number;
}

export function parsePlayerToken(): PlayerJwtPayload | null {
  const token = getPlayerToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as PlayerJwtPayload;
    // Check expiry
    if (payload.exp * 1000 < Date.now()) {
      clearPlayerToken();
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
