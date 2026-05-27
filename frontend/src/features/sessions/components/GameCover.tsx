import { cn } from '@/shared/lib/cn'

import { GameCoverPlaceholder } from './GameCoverPlaceholder'

interface GameCoverProps {
  thumbnailUrl: string | null
  name: string
  className?: string
}

/**
 * Renderiza el cover del juego: la imagen real de BGG si está disponible,
 * o el {@link GameCoverPlaceholder} si no. Tamaño definido por el padre
 * via className (e.g. {@code w-40} fuerza ancho; ratio 3:4 lo cuida el componente).
 */
export function GameCover({ thumbnailUrl, name, className }: GameCoverProps) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={name}
        className={cn(
          'aspect-[3/4] rounded-md border-2 border-yellow object-cover shadow-md',
          className,
        )}
      />
    )
  }
  return <GameCoverPlaceholder name={name} className={className} />
}
