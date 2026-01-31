export interface ComponentRating {
  id: string;
  componentId: string;
  userId: string;
  score: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface CreateRatingRequest {
  score: number; // 1-5
}

export interface UpdateRatingRequest {
  score: number; // 1-5
}

export interface RatingResponse {
  id: string;
  componentId: string;
  userId: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRatingResponse {
  score: number | null;
  hasRated: boolean;
}

export interface RatingListResponse {
  ratings: RatingResponse[];
  average: number;
  total: number;
  distribution: number[]; // Index 0 = 1 star, Index 4 = 5 stars
}
