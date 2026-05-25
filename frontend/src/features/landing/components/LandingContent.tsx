import { useTranslation } from 'react-i18next'

import { SeoHead } from '@/shared/components/SeoHead'

import { CommunityCarousel } from './CommunityCarousel'
import { DiscoveryCards } from './DiscoveryCards'
import { Hero } from './Hero'
import { TrustStrip } from './TrustStrip'

const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) ?? ''

/**
 * Orquesta los 5 bloques verticales de la landing.
 * Incluye SeoHead con JSON-LD WebSite + Organization.
 * Layout: MainLayout (header/footer) lo provee el router.
 */
export function LandingContent() {
  const { t, i18n } = useTranslation()

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
    <>
      <SeoHead
        title={t('seo.landing.title')}
        description={t('seo.landing.description')}
        canonical="/"
        ogImage={ogImage}
        jsonLd={[websiteJsonLd, organizationJsonLd]}
      />
      <Hero />
      <TrustStrip />
      <DiscoveryCards />
      <CommunityCarousel />
    </>
  )
}
