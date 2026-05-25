/**
 * Devuelve una etiqueta de fecha contextual para mostrar en cards de partidas.
 *
 * - Hoy   → `{ key: 'today', label: 'Hoy · 20:00', tone: 'urgent' }`
 * - Mañana → `{ key: 'tomorrow', label: 'Mañana', tone: 'warning' }`
 * - Esta semana → `{ key: 'thisWeek', label: 'Vie · 21 nov', tone: 'info' }`
 * - Más lejos / pasado → `{ key: 'far', label: 'DD MMM', tone: 'info' }`
 *
 * El consumidor decide cómo renderiza cada `tone` (color del badge, etc.).
 */
export type RelativeDateTone = 'urgent' | 'warning' | 'info'

export interface RelativeDateLabel {
  key: 'today' | 'tomorrow' | 'thisWeek' | 'far'
  label: string
  tone: RelativeDateTone
}

const MS_PER_DAY = 24 * 60 * 60_000

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function relativeDateLabel(iso: string, locale = 'es'): RelativeDateLabel {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) {
    return { key: 'far', label: '—', tone: 'info' }
  }

  const now = new Date()
  const today = startOfDay(now)
  const target = startOfDay(date)
  const diffDays = Math.round((target.getTime() - today.getTime()) / MS_PER_DAY)

  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

  if (diffDays === 0) {
    const time = timeFmt.format(date)
    return { key: 'today', label: `${capitalize(getTodayWord(locale))} · ${time}`, tone: 'urgent' }
  }
  if (diffDays === 1) {
    return { key: 'tomorrow', label: capitalize(getTomorrowWord(locale)), tone: 'warning' }
  }
  if (diffDays > 1 && diffDays < 7) {
    return {
      key: 'thisWeek',
      label: `${capitalize(weekdayFmt.format(date))} · ${dateFmt.format(date)}`,
      tone: 'info',
    }
  }
  return { key: 'far', label: dateFmt.format(date), tone: 'info' }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function getTodayWord(locale: string): string {
  return locale.startsWith('en') ? 'today' : 'hoy'
}

function getTomorrowWord(locale: string): string {
  return locale.startsWith('en') ? 'tomorrow' : 'mañana'
}
