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

// Course types
export interface GameQuestion {
  text: string;
  difficulty?: string;
}

export interface GameConfig {
  gameType: string;
  level: number;
  timeLimit: number;
  targetWPM?: number;
  questions: GameQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  thumbnail: string;
  price: number;
  status: string;
  category: string;
  type: string;
  gameConfig?: GameConfig;
  createdAt: string;
  updatedAt: string;
}

// Course API
export async function getCourses(params?: {
  type?: string;
  category?: string;
  status?: string;
}): Promise<Course[]> {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.status) queryParams.append('status', params.status);

  const url = `${API_URL}/api/courses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch courses');
  }

  const result: ApiResponse<Course[]> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Failed to fetch courses');
  }

  return result.data;
}

export async function getCourseById(id: string): Promise<Course> {
  const response = await fetch(`${API_URL}/api/courses/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }

  const result: ApiResponse<Course> = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || 'Failed to fetch course');
  }

  return result.data;
}
