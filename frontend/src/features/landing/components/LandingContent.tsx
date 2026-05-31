import { useTranslation } from 'react-i18next'

import { SeoHead } from '@/shared/components/SeoHead'

import { useRevealOnScroll } from '../hooks/useRevealOnScroll'

import { CommunityCarousel } from './CommunityCarousel'
import { CtaFinal } from './CtaFinal'
import { DiscoveryCards } from './DiscoveryCards'
import { GamesMarquee } from './GamesMarquee'
import { Hero } from './Hero'
import { HeroSessionPreview } from './HeroSessionPreview'
import { TopStrip } from './TopStrip'
import { TrustStrip } from './TrustStrip'

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? ''

/**
 * Orquesta los bloques verticales de la landing brutalista.
 * Incluye SeoHead con JSON-LD WebSite + Organization.
 *
 * Layout:
 * - El padding base / banda dots viene de la clase .landing-bg aplicada a
 *   este wrapper.
 * - El SiteHeader global se OCULTA en la ruta `/` (se sustituye por el
 *   header propio de la landing — pendiente F2). De momento se renderiza
 *   sobre la banda top strip.
 * - El SiteFooter global se OCULTA en mobile (md:hidden) — su sitio lo
 *   ocupa la MobileTabBar sticky.
 * - La MobileTabBar la monta MainLayout (es global, no solo de la landing).
 *
 * Spec: docs/superpowers/specs/2026-05-31-landing-brutalist-design.md
 */
export function LandingContent() {
  const { t, i18n } = useTranslation()
  useRevealOnScroll()

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Matchplay',
    url: APP_URL,
    inLanguage: i18n.language === 'es' ? 'es-ES' : 'en',
    description: t('seo.landing.description'),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_URL}/sessions?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Matchplay',
    url: APP_URL,
    logo: `${APP_URL}/brand/logo_with_slogan.svg`,
  }

  const ogImage = i18n.language === 'es' ? '/og/landing-es.png' : '/og/landing-en.png'

  return (
    <div className="landing-bg">
      <SeoHead
        title={t('seo.landing.title')}
        description={t('seo.landing.description')}
        canonical="/"
        ogImage={ogImage}
        jsonLd={[websiteJsonLd, organizationJsonLd]}
      />

      <TopStrip />
      <Hero />

      {/* Session preview — visible inline solo en mobile (en desktop ya va en el Hero) */}
      <section className="px-4 pb-8 lg:hidden">
        <HeroSessionPreview />
      </section>

      <TrustStrip />
      <DiscoveryCards />
      <GamesMarquee />
      <CommunityCarousel />
      <CtaFinal />
      {/* SiteFooter lo monta MainLayout (global) — antes vivía aquí como LandingFooter (F2.3) */}
    </div>
  )
}
