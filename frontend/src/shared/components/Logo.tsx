/** Variantes del logo disponibles en /public/brand/. */
export type LogoVariant = 'icon' | 'full' | 'text-only'

export interface LogoProps {
  /**
   * - `icon`      → logo_icon.svg (solo el símbolo, cuadrado)
   * - `full`      → logo_with_slogan.svg (símbolo + nombre + eslogan)
   * - `text-only` → logo_without_icon.svg (nombre sin símbolo)
   *
   * @default 'full'
   */
  variant?: LogoVariant
  /** Clases Tailwind adicionales aplicadas al <img>. */
  className?: string
  /** Texto alternativo. Por defecto "Matchplay". */
  alt?: string
}

const VARIANT_FILE: Record<LogoVariant, string> = {
  icon: '/brand/logo_icon.svg',
  full: '/brand/logo_with_slogan.svg',
  'text-only': '/brand/logo_without_icon.svg',
}

/**
 * Renderiza el logo de Matchplay en tres variantes.
 *
 * @example
 * // Header: logo completo
 * <Logo variant="full" className="h-8" />
 *
 * // Favicon/avatar: solo icono
 * <Logo variant="icon" className="h-10 w-10" />
 *
 * // Footer: solo nombre
 * <Logo variant="text-only" className="h-6" />
 */
export function Logo({ variant = 'full', className = '', alt = 'Matchplay' }: LogoProps) {
  return <img src={VARIANT_FILE[variant]} alt={alt} className={className} draggable={false} />
}
