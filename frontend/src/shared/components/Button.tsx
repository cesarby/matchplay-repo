import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  isLoading?: boolean
}

/**
 * Botón brutalismo lúdico.
 *
 * API estable (3 variantes), look brutal:
 * - `primary`   → bg-red text-background. CTA principal.
 * - `secondary` → bg-blue text-background. Acción secundaria.
 * - `ghost`     → transparente con border ink. Acción terciaria.
 *
 * Todas las variantes llevan `brutal brutal-press md:brutal-hover`.
 * Spec §17.5 (Botón brutal) del diseño global.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-red text-background',
  secondary: 'bg-blue text-background',
  ghost: 'bg-background text-foreground',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', isLoading, disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'brutal brutal-press md:brutal-hover',
        'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3',
        'font-display text-base font-bold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
