import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  isLoading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-red text-white hover:opacity-90 disabled:opacity-50',
  secondary: 'bg-blue text-white hover:opacity-90 disabled:opacity-50',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', isLoading, disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-sm px-4 py-2 font-medium transition',
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
