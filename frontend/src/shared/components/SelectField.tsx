import { forwardRef, type SelectHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

interface Option {
  value: string
  label: string
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string | undefined
  options: Option[]
  placeholder?: string
}

export const SelectField = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, id, className, ...rest }, ref) => {
    const inputId = id ?? rest.name
    const errorId = error ? `${inputId}-error` : undefined
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            'rounded-sm border bg-card px-3 py-2 text-base outline-none focus:ring-2 focus:ring-blue disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red',
            className,
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={errorId} role="alert" className="text-sm text-red">
            {error}
          </span>
        )}
      </div>
    )
  },
)
SelectField.displayName = 'SelectField'
