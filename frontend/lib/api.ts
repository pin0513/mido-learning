import { getAuth } from 'firebase/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthToken(): Promise<string | null> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return null;

  return await user.getIdToken();
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface StartGameResponse {
  sessionId: string;
  courseId: string;
  gameType: string;
  level: number;
  timeLimit: number;
  startedAt: string;
}

export interface CompleteGameRequest {
  sessionId: string;
  courseId: string;
  score: number;
  wpm?: number;
  accuracy: number;
  stars: number;
  timeSpent: number;
  correctChars?: number;
  totalChars?: number;
}

export interface CompleteGameResponse {
  experienceGained: number;
  coinsEarned: number;
  levelUp: boolean;
  newLevel?: number;
  achievements?: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
}

export async function startGame(courseId: string): Promise<StartGameResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/games/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ courseId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start game: ${response.statusText}`);
  }

  const result: ApiResponse<StartGameResponse> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Failed to start game');
  }

  return result.data;
}

export async function completeGame(
  request: CompleteGameRequest
): Promise<CompleteGameResponse> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/games/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to complete game: ${response.statusText}`);
  }

  const result: ApiResponse<CompleteGameResponse> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Failed to complete game');
  }

  return result.data;
}
