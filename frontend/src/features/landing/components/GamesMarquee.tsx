const GAMES_DESKTOP = [
  'CATAN',
  'WINGSPAN',
  'TERRAFORMING MARS',
  'CARCASSONNE',
  'DUNE IMPERIUM',
  '7 WONDERS',
  'AZUL',
  'BRASS BIRMINGHAM',
]
const GAMES_MOBILE = ['CATAN', 'WINGSPAN', 'TERRAFORMING MARS', 'CARCASSONNE', 'DUNE']

const SEPARATOR_COLORS = ['text-yellow', 'text-red', 'text-green', 'text-blue']

/**
 * Banda negra con marquee horizontal de nombres de juegos.
 * Decorativa — no es nav, no es contenido lectura. Los nombres son
 * placeholders editoriales, no datos del backend.
 */
export function GamesMarquee() {
  return (
    <div className="marquee-wrap border-y-4 border-foreground bg-foreground py-3 text-background md:py-5">
      {/* Desktop */}
      <div className="hidden animate-marquee font-display text-3xl font-black md:flex">
        <GameBlock games={GAMES_DESKTOP} />
        <GameBlock games={GAMES_DESKTOP} ariaHidden />
      </div>
      {/* Mobile */}
      <div className="flex animate-marquee-mobile font-display text-lg font-black md:hidden">
        <GameBlock games={GAMES_MOBILE} compact />
        <GameBlock games={GAMES_MOBILE} compact ariaHidden />
      </div>
    </div>
  )
}

interface GameBlockProps {
  games: string[]
  ariaHidden?: boolean
  compact?: boolean
}

function GameBlock({ games, ariaHidden, compact }: GameBlockProps) {
  return (
    <div
      className={`flex shrink-0 items-center ${compact ? 'gap-6 px-3' : 'gap-10 px-6'}`}
      aria-hidden={ariaHidden}
    >
      {games.map((game, i) => (
        <span key={i} className="flex shrink-0 items-center gap-2">
          <span className="whitespace-nowrap">{game}</span>
          <span className={SEPARATOR_COLORS[i % SEPARATOR_COLORS.length]}>✦</span>
        </span>
      ))}
    </div>
  )
}
