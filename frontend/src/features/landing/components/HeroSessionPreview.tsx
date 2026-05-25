import { Calendar, MapPin, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * SessionCard "mock" del visual del hero. Hardcoded desde i18n: el contenido
 * es marketing copy controlado, NO una sesión real de BD. Decisión consciente:
 * si fuera real, podría 404 al hacer click o quedar desactualizada constantemente.
 *
 * Diseñado para verse igual que un <SessionCard> real (cinta lateral por status,
 * chips de status, meta con iconos) pero más compacto: sin board grid decorativo,
 * paddings reducidos.
 */
export function HeroSessionPreview() {
  const { t } = useTranslation()

  return (
    <article
      className="relative overflow-hidden rounded bg-card shadow-[var(--shadow)]"
      style={{
        // Cinta lateral verde (status OPEN) — mismo patrón que SessionCard real.
        borderLeft: '6px solid rgb(var(--p-green))',
      }}
    >
      <div className="flex flex-col gap-3 p-4">
        {/* Chips: status + "tu partida" */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-green-soft px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {t('landing.hero.visual.openChip')}
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {t('landing.hero.visual.ownChip')}
          </span>
        </div>

        {/* Título + juego */}
        <div>
          <h3 className="font-display text-lg font-bold leading-tight text-foreground">
            {t('landing.hero.visual.title')}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('landing.hero.visual.meta')}</p>
        </div>

        {/* Meta inline con iconos a la izquierda */}
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Calendar size={14} aria-hidden="true" className="shrink-0" />
            <span>
              {t('landing.hero.visual.date')} · {t('landing.hero.visual.time')}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin size={14} aria-hidden="true" className="shrink-0" />
            <span>{t('landing.hero.visual.city')}</span>
          </li>
          <li className="flex items-center gap-2">
            <Users size={14} aria-hidden="true" className="shrink-0" />
            <span>{t('landing.hero.visual.spots')} plazas</span>
          </li>
        </ul>

        {/* CTA */}
        <Link
          to="/sessions"
          className="mt-1 inline-flex w-full items-center justify-center rounded-sm bg-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t('landing.cta.join')}
        </Link>
      </div>
    </article>
  )
}
