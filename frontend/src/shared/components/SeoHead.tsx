import { Helmet } from 'react-helmet-async'

export interface SeoHeadProps {
  title: string
  description: string
  /** Path relativo (e.g. "/") o URL absoluta. Si es relativo se antepone VITE_APP_URL. */
  canonical?: string
  /** Path o URL de la imagen OG (1200×630). */
  ogImage?: string
  /** Si true, añade <meta name="robots" content="noindex, nofollow">. */
  noindex?: boolean
  /** Objeto(s) JSON-LD. Se emiten como <script type="application/ld+json">. */
  jsonLd?: object | object[]
}

/**
 * Inyecta meta SEO con react-helmet-async.
 *
 * Uso básico:
 *   <SeoHead title="…" description="…" canonical="/" ogImage="/og/landing-es.png" />
 *
 * Con noindex (páginas auth):
 *   <SeoHead title="…" description="…" noindex />
 *
 * Con JSON-LD (landing):
 *   <SeoHead … jsonLd={[websiteSchema, orgSchema]} />
 */
export function SeoHead({
  title,
  description,
  canonical,
  ogImage,
  noindex = false,
  jsonLd,
}: SeoHeadProps) {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? ''

  const canonicalUrl = canonical
    ? canonical.startsWith('http')
      ? canonical
      : `${appUrl}${canonical}`
    : undefined

  const ogImageUrl = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : `${appUrl}${ogImage}`
    : undefined

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {ogImageUrl && <meta property="og:image" content={ogImageUrl} />}
      {ogImageUrl && <meta property="og:image:width" content="1200" />}
      {ogImageUrl && <meta property="og:image:height" content="630" />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}

      {/* JSON-LD */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
