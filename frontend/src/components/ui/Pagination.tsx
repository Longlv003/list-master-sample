import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  // Generate visible page numbers
  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 0',
      }}
    >
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Hiển thị <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> -{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> trong tổng số{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> bản ghi
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === currentPage ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p)}
            style={{ minWidth: '36px', padding: '0.4rem 0.6rem' }}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Trang tiếp theo"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};
