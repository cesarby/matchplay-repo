import { format, parse, startOfDay, startOfToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, CalendarDays, ChevronDown, Clock } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/shared/lib/cn'

interface SessionDateTimePickerProps {
  /** Label visible del campo. */
  label: string
  /**
   * Valor controlado en formato datetime-local ({@code "YYYY-MM-DDTHH:mm"}) o
   * cadena vacía si todavía no se ha elegido nada.
   */
  value: string
  onChange: (next: string) => void
  /** Texto de error a mostrar bajo el field. */
  error?: string
  /** Mínimo de fecha permitida (default: hoy 00:00). */
  minDate?: Date
}

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm"

/**
 * Slots de hora en intervalos de 30 minutos, de 08:00 a 22:00 inclusive.
 * Cubre desde el desayuno tardío hasta el último arranque razonable.
 */
const TIME_SLOTS: string[] = (() => {
  const out: string[] = []
  for (let h = 8; h <= 22; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) out.push(`${String(h).padStart(2, '0')}:30`)
  }
  return out
})()

const DEFAULT_TIME = '20:00'

/**
 * Picker de fecha y hora con calendario custom (board-game-café theme) y
 * slots de 30 minutos. Reemplaza al {@code <input type="datetime-local">}
 * nativo cuando se quiere control total del look & feel.
 *
 * <p>Persiste el valor en formato {@code "YYYY-MM-DDTHH:mm"} (local) para
 * mantener compatibilidad con el resto del form (zod schema, conversión a
 * ISO en submit).</p>
 */
export function SessionDateTimePicker({
  label,
  value,
  onChange,
  error,
  minDate,
}: SessionDateTimePickerProps) {
  const triggerId = useId()
  const errorId = `${triggerId}-error`
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const today = useMemo(() => startOfToday(), [])
  const min = useMemo(() => startOfDay(minDate ?? today), [minDate, today])

  // Parseo de value → date + time separados
  const parsed = useMemo(() => parseValue(value), [value])
  const selectedDate = parsed?.date ?? null
  const selectedTime = parsed?.time ?? DEFAULT_TIME

  // Click fuera → cerrar
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function commit(nextDate: Date | undefined, nextTime: string) {
    if (!nextDate) {
      onChange('')
      return
    }
    const [hh = 0, mm = 0] = nextTime.split(':').map(Number)
    const combined = new Date(nextDate)
    combined.setHours(hh, mm, 0, 0)
    onChange(format(combined, DATETIME_LOCAL_FORMAT))
  }

  function handleDaySelect(day: Date | undefined) {
    // Al elegir día, mantenemos la hora actual (o default si era el primer pick).
    commit(day, selectedTime)
  }

  function handleTimeSelect(slot: string) {
    if (!selectedDate) {
      // Sin día elegido todavía, asumimos "hoy o mañana" según el mínimo.
      commit(min, slot)
    } else {
      commit(selectedDate, slot)
    }
  }

  const triggerLabel = formatTriggerLabel(selectedDate, selectedTime, !!parsed)

  return (
    <div className="flex flex-col gap-1" ref={wrapperRef}>
      <label htmlFor={triggerId} className="flex items-center gap-2 text-sm font-medium">
        <Calendar size={14} aria-hidden="true" className="text-red" />
        {label}
      </label>

      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'flex w-full items-center justify-between rounded-sm border-2 bg-card px-4 py-2.5 text-base outline-none transition focus:ring-2 focus:ring-yellow/30',
          error ? 'border-red' : 'border-border hover:border-red/60',
          open && 'border-red ring-2 ring-yellow/30',
        )}
      >
        <span className="inline-flex items-center gap-3">
          <CalendarDays
            size={18}
            aria-hidden="true"
            className={selectedDate ? 'text-red' : 'text-muted-foreground'}
          />
          <span
            className={cn(
              'font-mono font-semibold tracking-tight',
              !selectedDate && 'font-sans font-normal text-muted-foreground',
            )}
          >
            {triggerLabel}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={cn('text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div role="dialog" aria-label={label} className="relative z-30">
          <div className="absolute inset-x-0 top-1 rounded-md border-2 border-border bg-card p-4 shadow-xl">
            <DayPicker
              mode="single"
              locale={es}
              weekStartsOn={1}
              showOutsideDays
              fixedWeeks
              selected={selectedDate ?? undefined}
              onSelect={handleDaySelect}
              disabled={{ before: min }}
              today={today}
              className="rdp-board"
              classNames={{
                month_caption:
                  'flex items-center justify-center py-2 mb-2 font-display text-base font-bold capitalize',
                nav: 'flex items-center justify-between absolute inset-x-2 top-1.5',
                button_previous:
                  'inline-flex size-8 items-center justify-center rounded-md border border-border bg-muted hover:bg-yellow-soft transition',
                button_next:
                  'inline-flex size-8 items-center justify-center rounded-md border border-border bg-muted hover:bg-yellow-soft transition',
                month_grid: 'w-full border-collapse',
                weekdays: 'flex',
                weekday:
                  'flex-1 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-2',
                week: 'flex w-full mt-1',
                day: 'flex-1 p-0.5',
                day_button: cn(
                  'flex aspect-square w-full items-center justify-center rounded-md',
                  'text-sm font-semibold transition',
                  'border-2 border-transparent text-foreground',
                  'hover:bg-yellow-soft hover:border-yellow',
                ),
              }}
              modifiersClassNames={{
                today: '!text-yellow !border-yellow !bg-yellow-soft !font-bold',
                selected:
                  '!bg-red !text-white !border-red shadow-md hover:!bg-red hover:!border-red',
                outside: '!opacity-30',
                disabled:
                  '!opacity-40 !line-through !cursor-not-allowed hover:!bg-transparent hover:!border-transparent',
              }}
            />

            {/* Time picker */}
            <div className="mt-3 border-t-2 border-border pt-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Clock size={12} aria-hidden="true" />
                Hora
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {TIME_SLOTS.map((slot) => {
                  const active = selectedTime === slot && !!selectedDate
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleTimeSelect(slot)}
                      className={cn(
                        'rounded-md border-2 px-1 py-1.5 font-mono text-xs font-semibold transition',
                        active
                          ? 'border-red bg-red text-white shadow-sm'
                          : 'border-border bg-card hover:border-red/60 hover:bg-yellow-soft',
                      )}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-semibold text-background hover:opacity-90"
              >
                Hecho
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <span id={errorId} role="alert" className="text-sm text-red">
          {error}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseValue(value: string): { date: Date; time: string } | null {
  if (!value) return null
  try {
    const d = parse(value, DATETIME_LOCAL_FORMAT, new Date())
    if (!Number.isFinite(d.getTime())) return null
    return { date: d, time: format(d, 'HH:mm') }
  } catch {
    return null
  }
}

function formatTriggerLabel(date: Date | null, time: string, hasValue: boolean): string {
  if (!hasValue || !date) return 'Selecciona fecha y hora'
  // "sáb 30 may 2026 · 20:00"
  return `${format(date, "EEE d 'de' MMM yyyy", { locale: es })} · ${time}`
}
