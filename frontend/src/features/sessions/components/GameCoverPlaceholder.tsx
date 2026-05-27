import { Dices } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

interface GameCoverPlaceholderProps {
  name: string
  className?: string
}

/**
 * Placeholder visual para el cover de un juego cuando no hay thumbnail BGG.
 * Mantiene el ratio 3:4 del cover real y conserva la identidad editorial
 * (borde amarillo, gradiente suave, icono de dado + nombre).
 */
export function GameCoverPlaceholder({ name, className }: GameCoverPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-md border-2 border-yellow bg-gradient-to-br from-yellow-soft to-red/10 p-3 shadow-md',
        className,
      )}
    >
      <Dices size={36} aria-hidden="true" className="text-foreground/50" />
      <p className="line-clamp-2 text-center font-display text-xs font-bold leading-tight text-foreground/80">
        {name}
      </p>
    </div>
  )
}
