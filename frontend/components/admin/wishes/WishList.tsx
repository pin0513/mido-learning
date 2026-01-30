'use client';

import { Wish } from '@/types/wish';
import { WishCard } from './WishCard';
import { Pagination } from '@/components/admin/Pagination';

interface WishListProps {
  wishes: Wish[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onStartProcessing: (wish: Wish) => void;
  onDelete: (wish: Wish) => void;
  onCreateComponent: (wish: Wish) => void;
  onLinkComponent: (wish: Wish) => void;
  loadingWishId?: string | null;
}

export function WishList({
  wishes,
  isLoading,
  currentPage,
  totalPages,
  total,
  onPageChange,
  onStartProcessing,
  onDelete,
  onCreateComponent,
  onLinkComponent,
  loadingWishId,
}: WishListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (wishes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">沒有找到符合條件的願望</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        顯示 {wishes.length} 筆，共 {total} 筆願望
      </div>

      <div className="space-y-4">
        {wishes.map((wish) => (
          <WishCard
            key={wish.id}
            wish={wish}
            onStartProcessing={onStartProcessing}
            onDelete={onDelete}
            onCreateComponent={onCreateComponent}
            onLinkComponent={onLinkComponent}
            isLoading={loadingWishId === wish.id}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
