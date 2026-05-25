import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
}

export const TextField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, id, className, ...rest }, ref) => {
    const inputId = id ?? rest.name
    const errorId = error ? `${inputId}-error` : undefined
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            'rounded-sm border bg-card px-3 py-2 text-base outline-none transition focus:ring-2 focus:ring-blue',
            error && 'border-red',
            className,
          )}
          {...rest}
        />
        {error && (
          <span id={errorId} role="alert" className="text-sm text-red">
            {error}
          </span>
        )}
      </div>
    )
  },
)
TextField.displayName = 'TextField'
