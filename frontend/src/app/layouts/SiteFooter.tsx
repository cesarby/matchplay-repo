import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Footer brutal global. Visible en desktop y mobile, en TODAS las rutas.
 *
 * Estructura:
 *  - Bloque marca (col-span-1 desktop, full-width mobile) — logo + slogan.
 *  - 3 columnas de enlaces (Producto, Empresa, Legal).
 *  - Barra inferior con copyright + claim.
 *
 * En mobile el padding inferior (`pb-28`) deja sitio a la MobileTabBar
 * sticky que se monta encima de los últimos pixels del footer. Sin esto
 * la copyright bar quedaría tapada por la tabbar.
 *
 * Lo monta MainLayout para que aparezca en todas las pantallas. Antes
 * vivía en `features/landing/` (LandingFooter) — fue promocionado a
 * shell global como parte de F2 (D7).
 */
export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t-4 border-foreground bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 text-sm md:gap-8 md:px-6 md:py-12 lg:grid-cols-4">
        {/* Marca */}
        <div className="col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="brutal-sm flex size-9 items-center justify-center rounded-md bg-red font-display text-lg font-black text-background">
              M
            </span>
            <span className="font-display text-xl font-black">
              matchplay<span className="text-red">.</span>
            </span>
          </div>
          <p className="text-background/70">{t('landing.footer.tagline')}</p>
        </div>

        {/* Columnas de links */}
        <FooterColumn
          title={t('landing.footer.product.title')}
          links={[
            { to: '/sessions', label: t('landing.footer.product.explore') },
            { to: '/sessions/new', label: t('landing.footer.product.create') },
            { to: '/#community', label: t('landing.footer.product.community') },
          ]}
        />
        <FooterColumn
          title={t('landing.footer.company.title')}
          links={[
            { to: '/about', label: t('landing.footer.company.about') },
            { to: '/contact', label: t('landing.footer.company.contact') },
          ]}
        />
        <FooterColumn
          title={t('landing.footer.legal.title')}
          links={[
            { to: '/terms', label: t('landing.footer.legal.terms') },
            { to: '/privacy', label: t('landing.footer.legal.privacy') },
          ]}
        />
      </div>

      {/* Barra inferior — `pb-28` mobile da espacio a la MobileTabBar sticky
          que se monta encima de los últimos pixels del footer. */}
      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 pb-28 pt-4 font-brutal text-[10px] uppercase tracking-widest text-background/60 md:flex-row md:items-center md:gap-0 md:px-6 md:py-5 md:text-xs">
          <span>© {year} Matchplay</span>
          <span>{t('landing.footer.madeWith')}</span>
        </div>
      </div>
    </footer>
  )
}

interface FooterColumnProps {
  title: string
  links: Array<{ to: string; label: string }>
}

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <p className="mb-3 font-display text-xs font-bold uppercase tracking-wider">{title}</p>
      <ul className="space-y-2 text-background/70">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className="transition-colors hover:text-yellow">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
