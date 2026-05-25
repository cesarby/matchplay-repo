import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

interface PaginationProps {
  page: number // 0-indexed
  totalPages: number
  onPageChange: (page: number) => void
}

/**
 * Paginación circular: prev/next como botones redondos size-10. La siguiente
 * se resalta en rojo cuando hay más páginas — invita visualmente a continuar.
 * Renderiza nada si totalPages ≤ 1.
 */
export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const canPrev = page > 0
  const canNext = page < totalPages - 1

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-2 py-4">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
        aria-label="Página anterior"
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <span className="px-4 text-sm text-muted-foreground" aria-live="polite">
        {page + 1} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
        aria-label="Página siguiente"
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40',
          canNext
            ? 'bg-red text-white hover:scale-110'
            : 'border border-border bg-card text-foreground',
        )}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  )
}
