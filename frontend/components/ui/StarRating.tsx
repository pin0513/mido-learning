'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  count?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onRate?: (score: number) => void;
  disabled?: boolean;
  showCount?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function StarRating({
  rating,
  count,
  interactive = false,
  size = 'md',
  onRate,
  disabled = false,
  showCount = true,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  const handleClick = (score: number) => {
    if (interactive && !disabled && onRate) {
      onRate(score);
    }
  };

  const handleMouseEnter = (score: number) => {
    if (interactive && !disabled) {
      setHoverRating(score);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const renderStar = (index: number) => {
    const score = index + 1;
    const filled = displayRating >= score;
    const halfFilled = displayRating >= score - 0.5 && displayRating < score;

    return (
      <button
        key={index}
        type="button"
        onClick={() => handleClick(score)}
        onMouseEnter={() => handleMouseEnter(score)}
        onMouseLeave={handleMouseLeave}
        disabled={!interactive || disabled}
        className={`
          ${interactive && !disabled ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
          transition-transform duration-100
          focus:outline-none focus:ring-0
          disabled:cursor-not-allowed
        `}
        aria-label={`Rate ${score} stars`}
      >
        <svg
          className={`${sizeClasses[size]} ${
            filled || halfFilled ? 'text-yellow-400' : 'text-gray-300'
          }`}
          fill={filled ? 'currentColor' : halfFilled ? 'url(#half)' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map(renderStar)}
      </div>
      {showCount && (
        <span className={`${textSizeClasses[size]} text-gray-500 ml-1`}>
          {rating > 0 ? rating.toFixed(1) : '-'}
          {count !== undefined && count > 0 && (
            <span className="ml-1">({count})</span>
          )}
        </span>
      )}
    </div>
  );
}

export function RatingDisplay({
  average,
  total,
  distribution,
}: {
  average: number;
  total: number;
  distribution?: number[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-4xl font-bold text-gray-900">
          {average > 0 ? average.toFixed(1) : '-'}
        </span>
        <div>
          <StarRating rating={average} showCount={false} size="lg" />
          <p className="text-sm text-gray-500 mt-1">
            {total > 0 ? `${total} 則評分` : '尚無評分'}
          </p>
        </div>
      </div>

      {distribution && distribution.length === 5 && total > 0 && (
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1];
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-gray-600">{star}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-500">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
