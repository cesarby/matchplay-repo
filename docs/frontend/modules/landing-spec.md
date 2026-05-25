# Frontend · Módulo Landing — Spec

> Página de aterrizaje pública (`/`) de Matchplay: hero con quick-search, trust
> strip con stats reales, discovery de propuesta de valor y carousel de
> comunidad. Es la primera impresión del producto y el principal motor de
> conversión a registro.

Referencia capa: [../spec.md](../spec.md) · Mockup validado: [`frontend/mockups/landing.html`](../../../frontend/mockups/landing.html)

---

## Propósito

1. Comunicar la propuesta de valor en menos de 3 segundos (hero).
2. Permitir descubrir partidas sin registrarse (quick-search) → reduce fricción.
3. Mostrar evidencia de actividad real (trust strip) → social proof.
4. Educar sobre las 3 capacidades clave (discovery cards).
5. Servir SEO: la `/` es la página más linkable y la que más tracción orgánica recibe.

No-objetivos:

- No es un dashboard. Si el usuario está autenticado se le redirige a `/sessions` (ver "Comportamiento por estado").
- No incluye listado real de sesiones (deferred a `sessions` feature).
- No incluye blog ni CMS (el carousel de comunidad va con placeholders en v1).

---

## Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Ruta | `/` | Pública. Layout `MainLayout`. |
| Comportamiento si autenticado | Redirect a `/sessions` con `<Navigate replace>` | La landing es para anónimos. Los autenticados ya conocen el producto. |
| Paleta y tipografía | board-game-café (Bricolage Grotesque + 4 colores semánticos) | Aprobado 2026-05-24, ver `spec.md` global. |
| CTAs hero (anónimo) | 🔴 Explorar partidas → `/sessions` · 🟢 Crear cuenta → `/register` | El primario lleva a explorar sin friction. |
| Quick-search en hero | **Sí** | Reusa hooks `useProvincesQuery`/`useCitiesQuery` de `features/geo/`. |
| Trust strip con stats reales | **Sí** | Requiere endpoint nuevo `GET /api/v1/stats/public` (ver "Dependencias bloqueantes"). |
| Discovery cards (3) | Cinta lateral semántica 🟡 / 🟢 / 🔴 | Sin azul porque azul = "en curso" (no aplica a propuesta de valor). |
| Carousel comunidad | **Mantener** con 3 placeholders | Cuando haya blog real, sustituir contenido. v1 con texto de i18n actual. |
| Featured games | **Deferred** a v1.1 | No es bloqueante. |
| Open Sessions strip | **Deferred** hasta tener `sessions` backend | No exponer cards mock que pueden 404 al hacer click. |
| Modales (login/register) | **Eliminados** | Reemplazados por rutas `/login` y `/register` con `?from=`. |
| SEO: noindex | **NO** | La landing tiene que indexar. JSON-LD `WebSite` + `Organization` obligatorios. |
| **i18n** | **Centralizada** en `shared/i18n/locales/{es,en}.json` | Regla del proyecto: **PROHIBIDO** crear `features/<x>/locales/`. Todas las claves viven en los 2 JSON centrales bajo namespaces por feature (`landing.*`, `auth.*`, etc.). |
| **Resaltado del H1** | `<Trans>` de react-i18next con component placeholders | El traductor decide en qué palabra cae la cinta roja por idioma. Sin lógica de string-split en el componente. |
| **Carousel** | `embla-carousel-react` desde v1 | ~5 KB gzip. Swipe gestures, keyboard nav, plugins de auto-advance disponibles. Sin migración futura. |
| **Backend stats** | Schema `game_sessions` creado ya (Flyway + entity + repository, sin controller/service) | El endpoint `stats/public` consulta tabla real desde día 1. El módulo `sessions` futuro extiende con controllers. |
| **OG images** | Generadas por script Puppeteer (`scripts/generate-og.mjs`) | Reproducibles en build. PNGs commiteados en `public/og/`. Sin paso manual. |

---

## Reglas de uso de la paleta board-game-café

Las 4 colores con su variante soft tienen reglas estrictas para mantener AA contraste sin esfuerzo:

| Uso | Permitido | Por qué |
|-----|-----------|---------|
| `text-foreground` (#1F1A14) sobre cualquier `bg-*-soft` | ✅ 15:1+ contrast | Cumple AAA sin pensar |
| Strong color (`text-red`, `text-blue`...) sobre `bg-card` o `bg-background` | ✅ 5+ contrast | AA garantizado |
| Strong color (`text-yellow`) sobre **icono decorativo** dentro de `bg-yellow-soft` | ✅ Decorativo | El icono va con `aria-hidden="true"` y hay texto descriptivo cercano. Lighthouse no evalúa contraste de iconos decorativos. |
| Strong color (`text-yellow`) sobre `bg-yellow-soft` como **texto real** | ❌ Prohibido | Contraste insuficiente. Usar `text-foreground`. |
| Texto en blanco sobre `bg-red` / `bg-blue` / `bg-green` | ✅ Verificado | 5+ contrast en todos los strong. |
| Texto en blanco sobre `bg-yellow` | ⚠️ Solo bold ≥18px | Yellow es el menos contrastado. Para texto pequeño usar `text-foreground` sobre yellow. |

Esta regla aplica a **todo el frontend**, no solo a landing. Documentada también en el `spec.md` global (sección Design system).

---

## Comportamiento por estado del usuario

```
GET /
   │
   ▼
authStore.status === ?
   ├─ 'idle' | 'booting'   →  <AuthBootSplash /> (heredado del App boot)
   ├─ 'authenticated'      →  <Navigate to="/sessions" replace />
   └─ 'anonymous'          →  <LandingPage />  ← este spec cubre esto
```

`<LandingPage>` decide el redirect:

```tsx
export default function LandingPage() {
  const status = useAuthStatus()
  if (status === 'authenticated') return <Navigate to="/sessions" replace />
  if (status === 'idle' || status === 'booting') return <AuthBootSplash />
  return <LandingContent />
}
```

---

## Arquitectura del módulo

```
features/landing/
├── pages/
│   └── LandingPage.tsx              # decide redirect + monta <LandingContent>
├── components/
│   ├── LandingContent.tsx           # orquesta los 5 bloques verticales
│   ├── Hero.tsx                     # eyebrow + H1 + subtitle + CTAs + QuickSearch + visual
│   ├── QuickSearch.tsx              # form con province/city/game (controlled)
│   ├── HeroSessionPreview.tsx       # SessionCard hardcoded (mockup) — luego puede leer 1 sesión real
│   ├── TrustStrip.tsx               # 3 stats con icono coloreado
│   ├── DiscoveryCards.tsx           # 3 cards con cinta semántica
│   └── CommunityCarousel.tsx        # carousel con 3 slides placeholder
├── api/
│   └── statsApi.ts                  # GET /stats/public
├── hooks/
│   └── usePublicStatsQuery.ts       # TanStack Query del trust strip
├── types/
│   └── landing.types.ts             # PublicStats
└── __tests__/
    ├── LandingPage.test.tsx         # redirect + render según status
    ├── QuickSearch.test.tsx         # submit construye query string correcta
    ├── TrustStrip.test.tsx          # loading / error / data
    └── DiscoveryCards.test.tsx      # render + a11y básico
```

**Reglas:**

- `LandingPage` es el único `default export` (lazy-importable desde `router.tsx`).
- Ningún componente de `landing/` importa de otra feature directamente. Para geo usa `@/features/geo/hooks/useGeo`. Para auth usa `@/features/auth/hooks/useAuth`.
- `HeroSessionPreview` vive en `landing/components/` por ahora. Cuando exista `features/sessions/components/SessionCard.tsx`, se reemplaza por `<SessionCard variant="preview" data={mockSession} />`.

---

## Componentes — contratos

### `<LandingContent />`

Sin props. Lee i18n y monta los 5 bloques en orden:

```tsx
<>
  <Hero />
  <TrustStrip />
  <DiscoveryCards />
  <CommunityCarousel />
</>
```

El layout (header/footer) lo provee `MainLayout` desde `app/layouts/`.

### `<Hero />`

Sin props. Renderiza:

- Eyebrow (`landing.hero.eyebrow`)
- H1 con resaltado vía `<Trans>` (ver "Patrón H1 con resaltado" abajo).
- Subtítulo (`landing.hero.subtitle`)
- 2 botones CTA (`<Button>` shared):
  - Primary 🔴 → `<Link to="/sessions">` con label `landing.cta.explore`
  - Success 🟢 → `<Link to="/register">` con label `landing.cta.register`
- `<QuickSearch />`
- `<HeroSessionPreview />`

Layout:
- Desktop ≥1024px: 2 columnas `[1.05fr_0.95fr]`, gap 3rem.
- Mobile <1024px: stack vertical. SessionPreview puede ocultarse o ir reducido (responsive `hidden lg:block` o variante mobile).

Background:
- Cremas (`bg-background`).
- Decoración `<HeroDeco>` con tiles/dots posicionados absolutamente — `aria-hidden="true"`, `opacity 0.4`.
- En mobile, decoración con `opacity 0.2` para no competir con el contenido.

### `<QuickSearch />`

Form controlled (estado local con `useState`, NO `react-hook-form` por simplicidad).

```ts
interface QuickSearchState {
  provinceCode: string
  cityCode: string
  game: string
}
```

- Province `<select>` con `useProvincesQuery()`. `placeholder="Provincia"`.
- City `<select>` con `useCitiesQuery(provinceCode)`. Disabled si `!provinceCode`.
- Game `<input type="text">` libre con `placeholder="Juego (opcional)"`.
- Botón submit construye query string y navega:
  ```ts
  const params = new URLSearchParams()
  // camelCase alineado con backend y con SessionsListPage
  if (provinceCode) params.set('provinceCode', provinceCode)
  if (cityCode) params.set('cityCode', cityCode)
  if (game.trim()) params.set('q', game.trim())
  navigate(`/sessions?${params.toString()}`)
  ```
- Submit por Enter funciona (es un `<form>` real con `onSubmit`).
- A11y: cada control con `<label>` (visualmente oculto si necesario con `sr-only`).

### `<HeroSessionPreview />`

SessionCard hardcoded con datos del i18n (`landing.hero.visual.*`):

- Imagen/render placeholder (4×3 grid de div coloreados como en el mockup), con `role="img"` y `aria-label` descriptivo.
- Badge "Tu Partida" (chip neutro, outlined).
- Badge "Abierto" (chip verde — semántica fija).
- Título, mesa, fecha, hora, plazas (3/4).
- Botón "Unirme a una Partida" → `<Link to="/sessions">`.
- Cinta lateral roja (CSS `::before` 6px ancho).

**Nota**: este componente NO recibe data real. Es marketing copy fijo en i18n. Cuando exista el módulo sessions, se podrá reemplazar por una sesión real destacada (out of scope v1).

### `<TrustStrip />`

```tsx
const { data, isLoading, isError } = usePublicStatsQuery()
```

Renderiza 3 stats:

| Stat | Campo | Color icono |
|------|-------|-------------|
| Partidas activas | `data.activeSessions` | 🔴 rojo |
| Jugadores en la comunidad | `data.activePlayers` | 🔵 azul |
| Ciudades activas | `data.cities` | 🟢 verde |

Estados:
- Loading: skeleton (3 placeholders `bg-muted` animados).
- Error: ocultar el bloque completamente (no es bloqueante para la landing).
- Success: render normal.

A11y: `<section aria-label="Estadísticas de la comunidad">`. Cada stat es un `<div>` con número en `font-display text-2xl` y label debajo en `text-muted`.

### `<DiscoveryCards />`

Header de sección (eyebrow + H2 + subtítulo) seguido de grid de 3 cards.

Cada card es un `<article>` con:
- Cinta lateral CSS (`::before`) con color por card.
- Icono dentro de wrapper `w-12 h-12 rounded-2xl bg-{color}-soft text-{color}`.
- H3 (`landing.discovery.cards.{n}.title`)
- Párrafo (`landing.discovery.cards.{n}.description`)

| Card | Icono lucide | Color cinta |
|------|--------------|-------------|
| 1. Encuentra jugadores | `users` | 🟡 yellow |
| 2. Descubre partidas abiertas | `dice-5` | 🟢 green |
| 3. Organiza quedadas | `plus-circle` | 🔴 red |

Layout:
- Desktop: `grid-cols-3`, gap 1.25rem.
- Mobile: `grid-cols-1`, stack.

Hover: shadow eleva (`hover:shadow-card-hover`), transición 200ms.

### Patrón H1 con resaltado (react-i18next `<Trans>`)

El H1 del hero (y cualquier H2/H3 con palabra resaltada) usa **component placeholders** de react-i18next. El traductor decide dónde poner la cinta roja en cada idioma.

Clave i18n:

```json
"landing.hero.title": "Partidas de juegos de mesa <1>cerca de ti</1>"
```

En inglés el resaltado puede caer en otra palabra:

```json
"landing.hero.title": "Board game sessions <1>near you</1>"
```

Uso en el componente:

```tsx
import { Trans } from 'react-i18next'

<h1 className="font-display text-5xl lg:text-6xl font-bold leading-tight">
  <Trans
    i18nKey="landing.hero.title"
    components={{ 1: <span className="text-red" /> }}
  />
</h1>
```

Regla: **nunca** hacer string-split en TypeScript. Si una clave necesita varios highlights, usar `{ 1: <span/>, 2: <em/> }`. Esto se aplica a TODA la app, no solo a la landing.

---

### `<CommunityCarousel />`

Carousel con **3 slides placeholder** usando `embla-carousel-react`.

```ts
interface Slide {
  eyebrow: string    // i18n
  title: string      // i18n
  description: string // i18n
}
```

**Dependencias**: `embla-carousel-react` (~5 KB gzip). Plugin `embla-carousel-autoplay` opcional para v1.1 si se quiere auto-advance.

Implementación base:

```tsx
import useEmblaCarousel from 'embla-carousel-react'

const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
```

UI por slide:
- Fondo: `bg-blue` con formas decorativas (rotated rounded shapes en `white/10` y `yellow`).
- Eyebrow en píldora translúcida (`bg-white/15 backdrop-blur`).
- H3 grande, blanco.
- Descripción, `text-white/85`.
- Controles prev/next con iconos chevron, fijos abajo-derecha. Wiring: `emblaApi.scrollPrev()` / `emblaApi.scrollNext()`.
- Indicadores de paginación abajo (3 puntos, el activo se elonga). `emblaApi.scrollTo(index)`.

**Auto-advance**: NO en v1 (accesibilidad — usuarios prefieren control manual). Plugin disponible si cambia la decisión.

**Swipe gestures**: incluido de serie por embla en mobile.

A11y (embla lo hace casi todo, complementamos):
- `aria-roledescription="carousel"` en el contenedor.
- Cada slide con `aria-roledescription="slide"` + `aria-label="Slide X de 3"`.
- Botones prev/next con `aria-label` claro.
- Indicadores son `<button>`s, no `<span>`s — clickables para saltar a un slide.
- Keyboard navigation: embla soporta flechas izq/der by default.

### `<HeroDeco />` (decorativo)

3-5 tiles + dots absolutamente posicionados en el fondo del hero. Solo decoración. `aria-hidden="true"`. En mobile reducir cantidad y opacidad.

---

## Endpoint backend

### `GET /api/v1/stats/public`

**Público** (sin auth). Devuelve agregados públicos para el trust strip.

Response 200:

```json
{
  "activeSessions": 142,
  "activePlayers": 387,
  "cities": 24
}
```

Definiciones:

- `activeSessions`: `COUNT(*)` de `game_sessions WHERE status = 'OPEN' AND scheduled_at >= NOW()`.
- `activePlayers`: `COUNT(DISTINCT user_id)` de usuarios registrados o con `last_login_at` en los últimos 30 días.
- `cities`: `COUNT(DISTINCT city_code)` de usuarios o sesiones (lo que dé un número más cercano a la realidad — decidir en service).

Headers:

- `Cache-Control: public, max-age=300` (5 min) — no son datos sensibles ni en tiempo real.

Errores:

- 500 → el frontend oculta el strip. Nunca bloqueante.

**Por qué público**: el trust strip aparece antes de cualquier interacción, no podemos requerir auth. Los números son agregados — no exponen información personal.

### Prerequisito backend — Schema `game_sessions`

Creado **junto con el endpoint** (no espera al módulo sessions completo):

- Migración Flyway: `V2__game_sessions.sql`
  ```sql
  CREATE TABLE game_sessions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      creator_id BIGINT NOT NULL,
      base_game_id BIGINT NOT NULL,
      city_code VARCHAR(8) NOT NULL,
      area_code VARCHAR(16),
      scheduled_at DATETIME NOT NULL,
      max_players INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_scheduled (status, scheduled_at),
      INDEX idx_city (city_code),
      CONSTRAINT fk_session_creator FOREIGN KEY (creator_id) REFERENCES users(id),
      CONSTRAINT fk_session_city FOREIGN KEY (city_code) REFERENCES cities(code)
  );
  ```
- `GameSession` JPA entity en `session/entity/` (extendiendo `BaseAuditingEntity` si existe).
- `SessionStatus` enum: `OPEN`, `FULL`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- `GameSessionRepository` con métodos `countByStatusAndScheduledAtAfter(SessionStatus, Instant)` y similares.
- **NO** se crea controller/service/DTOs todavía — eso llega con el módulo `sessions` completo.

El endpoint `stats/public` queda totalmente funcional desde día 1: si la tabla está vacía devuelve `{0, X, Y}` con `X`/`Y` viniendo de `users`. A medida que se creen sesiones (módulo futuro), los números cobran sentido.

---

## TanStack Query

```ts
// features/landing/hooks/usePublicStatsQuery.ts
export function usePublicStatsQuery() {
  return useQuery({
    queryKey: ['stats', 'public'],
    queryFn: () => statsApi.getPublic(),
    staleTime: 5 * 60_000,  // 5 min — alineado con cache HTTP del backend
    gcTime: 30 * 60_000,
    retry: 0,               // si falla, no insistir; ocultamos el strip
  })
}
```

---

## i18n

**Regla del proyecto (reforzada aquí):** todas las claves viven en `shared/i18n/locales/{es,en}.json`. **NO** existe `features/<x>/locales/`. Cada feature añade su namespace al JSON central.

Claves nuevas en `shared/i18n/locales/{es,en}.json` bajo el namespace `landing`:

```json
{
  "landing": {
    "hero": {
      "eyebrow": "Jugadores, partidas y quedadas cerca de ti",
      "title": "Partidas de juegos de mesa <1>cerca de ti</1>",
      "subtitle": "MatchPlay te ayuda a descubrir partidas abiertas, conectar con jugadores de tu zona y organizar quedadas para tus juegos favoritos.",
      "visual": {
        "ownChip": "Tu Partida",
        "openChip": "Abierto",
        "title": "Noche de Catan",
        "meta": "Mesa de esta Noche · + 1 Expansión",
        "city": "Madrid",
        "date": "Hoy",
        "time": "20:00",
        "spots": "3/4"
      }
    },
    "quickSearch": {
      "label": "Buscar una partida",
      "province": "Provincia",
      "city": "Ciudad",
      "game": "Juego (opcional)",
      "submit": "Buscar"
    },
    "cta": {
      "explore": "Explorar partidas",
      "register": "Crear cuenta",
      "join": "Unirme a una Partida"
    },
    "stats": {
      "ariaLabel": "Estadísticas de la comunidad",
      "activeSessions": "partidas activas",
      "activePlayers": "jugadores en la comunidad",
      "cities": "ciudades activas"
    },
    "discovery": {
      "eyebrow": "Descubre cómo te ayuda",
      "title": "Una forma más fácil de encontrar mesa y comunidad",
      "subtitle": "Si buscas jugadores para juegos de mesa o quieres organizar partidas en tu ciudad, MatchPlay reúne en un mismo sitio el descubrimiento de mesas abiertas, la creación de eventos y la conexión con gente cercana que comparte tus mismos intereses.",
      "cards": {
        "one": {
          "title": "Encuentra jugadores de juegos de mesa en tu zona",
          "description": "Explora perfiles y partidas activas para encontrar gente con la que jugar cerca de ti, tanto si te apetecen eurogames, fillers, cooperativos o clásicos de siempre."
        },
        "two": {
          "title": "Descubre partidas abiertas y únete a la que encaje contigo",
          "description": "Consulta partidas de juegos de mesa ya publicadas, revisa la zona, la fecha y el juego, y apúntate a la mesa que mejor encaje con tu horario y tu grupo ideal."
        },
        "three": {
          "title": "Organiza quedadas para tus juegos favoritos",
          "description": "Publica tus propias quedadas de juegos de mesa, define plazas y ubicación, y deja que otros jugadores de tu comunidad encuentren tu mesa y se unan."
        }
      }
    },
    "community": {
      "eyebrow": "Novedades y actualidad",
      "title": "Descubre noticias, ideas y momentos de la comunidad",
      "prev": "Slide anterior",
      "next": "Slide siguiente",
      "goTo": "Ir al slide {{n}}",
      "slides": {
        "one": {
          "eyebrow": "Comunidad",
          "title": "Historias y novedades para jugadores de mesa",
          "description": "Comparte anuncios, novedades del proyecto y contenidos pensados para quienes disfrutan organizando y descubriendo nuevas mesas."
        },
        "two": {
          "eyebrow": "Actualidad",
          "title": "Noticias, mejoras y vida de la comunidad",
          "description": "Este espacio puede reunir actualizaciones del producto, novedades destacadas y noticias relacionadas con la comunidad de juegos de mesa."
        },
        "three": {
          "eyebrow": "Contenido",
          "title": "Ideas, recomendaciones y temas para compartir",
          "description": "También puede servir para publicar recomendaciones, iniciativas de la comunidad o contenido editorial más allá de las partidas en curso."
        }
      }
    }
  }
}
```

Notas:

- El H1 del hero se renderiza con `<Trans i18nKey="landing.hero.title" components={{ 1: <span className="text-red"/> }} />`. El traductor decide en cada idioma dónde poner el resaltado (componente `<1>`).
- Las claves SEO van en `seo.landing.*` (ver sección SEO).

---

## SEO

### Meta básico

```tsx
<SeoHead
  title={t('seo.landing.title')}
  description={t('seo.landing.description')}
  canonical="/"
  ogImage="/og/landing-es.png"
/>
```

Claves:

```json
{
  "seo": {
    "landing": {
      "title": "Encuentra jugadores y partidas cerca de ti | Matchplay",
      "description": "Descubre partidas abiertas de juegos de mesa, conecta con jugadores de tu zona y organiza tu próxima quedada con Matchplay."
    }
  }
}
```

### JSON-LD

Inyectados con `react-helmet-async` dentro de `<SeoHead jsonLd={...} />`:

```ts
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Matchplay',
  url: import.meta.env.VITE_APP_URL,
  inLanguage: locale,
  description: t('seo.landing.description'),
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${import.meta.env.VITE_APP_URL}/sessions?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Matchplay',
  url: import.meta.env.VITE_APP_URL,
  logo: `${import.meta.env.VITE_APP_URL}/brand/logo.svg`,
}
```

El `SearchAction` enseña a Google que la app tiene buscador interno → rich result "sitelinks searchbox".

### Open Graph

Assets necesarios:

- `/og/landing-es.png` 1200×630
- `/og/landing-en.png` 1200×630
- `/brand/logo.svg`

### Accesibilidad SEO

- H1 único: el del hero. Las secciones siguientes empiezan en H2.
- `<section>` con `aria-labelledby` apuntando a su H2 (`id="discovery-title"` etc.).
- Skip-link al inicio del documento: `<a href="#main" className="sr-only focus:not-sr-only">Saltar al contenido</a>`. El `<main>` del MainLayout tiene `id="main"`.
- Las imágenes decorativas (`HeroDeco`, formas del carousel) con `aria-hidden="true"` y sin `alt`.

---

## Accesibilidad (a11y)

| Requisito | Implementación |
|-----------|----------------|
| Skip-link | `<a href="#main" className="sr-only focus:not-sr-only">Saltar al contenido</a>` en `MainLayout` |
| Contraste texto/fondo | Verificar manualmente: `#1F1A14` sobre `#FAF6EE` (15.8:1 ✓), blanco sobre `#C8362C` (5.4:1 ✓) |
| Focus visible | Hereda de `globals.css`: `:focus-visible { ring-2 ring-blue offset-2 }` |
| Touch targets | CTAs ≥ 44px de alto (botones `py-3` con padding total ≥ 48px) |
| Quick-search keyboard | Submit por Enter, navegación tab natural |
| Carousel | Botones `<button>` reales con `aria-label`. Indicadores también clickables. Sin auto-advance. |
| Decoración | Todos los tiles/shapes con `aria-hidden="true"` |
| Stats | Cada stat con icono `aria-hidden` (el label de texto es suficiente) |
| Imágenes | El render del board en hero preview tiene `role="img"` + `aria-label="Vista previa del tablero de la partida"` |

Tests automáticos:

- `vitest-axe` en `LandingPage.test.tsx`: assert no axe violations.

---

## Performance

| Aspecto | Decisión |
|---------|----------|
| Code-split | `LandingPage` lazy-loaded desde `router.tsx` con `lazy(() => import('@/features/landing/pages/LandingPage'))` |
| Fonts | Preconnect a Google Fonts ya configurado en `index.html` |
| Imágenes | `og` images optimizadas (AVIF + PNG fallback). Sin imágenes raster above-the-fold en v1. |
| LCP candidate | El H1 del hero (texto). No requiere optimización de imagen para LCP. |
| JS budget | El bundle de landing debe quedar < 60kB gzip propio (sin contar vendor). El carousel manual ayuda a no pegar embla. |
| Lighthouse target | Performance ≥ 95, Accessibility 100, SEO 100, Best Practices ≥ 95 en mobile |
| CLS | Trust strip reserva altura mínima en loading (skeleton del mismo tamaño que el contenido) |

---

## Mobile

Breakpoints (Tailwind):

- `<sm` (375-639px): stack vertical full. Sin SessionPreview.
- `sm` (640-1023px): hero en columna única, SessionPreview en card a ancho completo abajo.
- `lg` (≥1024px): 2 columnas hero como en mockup.

Reglas:

- Quick-search en mobile: grid 1 columna, los 3 selects apilados, botón submit full-width.
- Discovery cards: `grid-cols-1` en mobile, `grid-cols-3` en desktop.
- Trust strip: `grid-cols-1` con stats centradas en mobile, `grid-cols-3` en desktop.
- Carousel: aspect-ratio cambia a `16/12` en mobile para que el texto siempre quepa.
- Header: nav links ocultos (`hidden md:flex`) → hamburguesa en mobile (out of scope v1, dejar el menú simple con solo CTAs).

---

## Testing

### Unit / Componentes

| Test | Cubre |
|------|-------|
| `LandingPage.test.tsx` | Redirect a `/sessions` si `authenticated`. Render de `<LandingContent>` si `anonymous`. AuthBootSplash si `idle`/`booting`. |
| `QuickSearch.test.tsx` | Submit con province+city construye `/sessions?provinceCode=X&cityCode=Y`. Submit vacío navega a `/sessions`. City deshabilitada hasta seleccionar provincia. |
| `TrustStrip.test.tsx` | Loading muestra skeleton. Error oculta el strip. Success renderiza los 3 stats. |
| `DiscoveryCards.test.tsx` | 3 cards con cintas correctas. Pasa axe. |
| `CommunityCarousel.test.tsx` | Click en next avanza index. Click en indicador 3 va al slide 3. Prev en slide 1 va al último (wrap). |

### Integración (MSW)

`landingFlow.test.tsx`:

- Render con `status: 'anonymous'` → MSW responde `/stats/public` 200 → trust strip muestra números.
- Render con `status: 'authenticated'` → ver redirect a `/sessions`.
- Click en CTA "Explorar partidas" → navega a `/sessions`.
- Click en CTA "Crear cuenta" → navega a `/register`.
- Quick-search submit → navega con query string correcto.

### A11y

`vitest-axe` corre sobre `LandingPage` con status anónimo: 0 violaciones.

---

## Dependencias bloqueantes

1. **Backend: Schema `game_sessions` + endpoint `GET /api/v1/stats/public`**. Migración Flyway + entity + repository + controller + service. Detalle en sección "Endpoint backend".
2. **`<SeoHead>` shared component**. No existe todavía. Spec mínima:
   ```tsx
   interface SeoHeadProps {
     title: string
     description: string
     canonical?: string
     ogImage?: string
     noindex?: boolean
     jsonLd?: object | object[]
   }
   ```
   Vive en `shared/components/SeoHead.tsx`. Usa `react-helmet-async`. Necesario también para retrofittear las páginas auth.
3. **`<Logo>` shared component**. Lee SVG de `public/brand/`. Props `variant: 'icon' | 'full' | 'text-only'`. Vive en `shared/components/Logo.tsx`.
4. **Dependencia npm nueva**: `embla-carousel-react` para `<CommunityCarousel>`.
5. **Assets**:
   - `public/brand/logo_icon.svg`, `logo_with_slogan.svg`, `logo_without_icon.svg` ✓ (copiados ya).
   - `public/og/landing-es.png` y `public/og/landing-en.png` (1200×630). **Generadas vía script Puppeteer** — ver siguiente punto.
6. **Script de generación de OG images**: `scripts/generate-og.mjs` que carga templates HTML (`mockups/og-landing-{es,en}.html`), abre Puppeteer headless a viewport 1200×630, hace screenshot, guarda en `public/og/`. Se ejecuta vía `npm run og:generate`. Idempotente; commiteamos los PNG resultantes.
7. **Tokens CSS extras** (revisar `styles/tokens.css` y `tailwind.config.ts`):
   - El mockup usa `.bg-red-soft`, `.bg-green-soft`, etc. — ya están definidos en tokens, verificar mapeo en Tailwind config.
8. **Hooks geo ya existen** (`useProvincesQuery`, `useCitiesQuery`) ✓ — sin trabajo extra.

---

## Orden sugerido de implementación

### Backend (~2h)

1. **Migración Flyway `V2__game_sessions.sql`** + entity `GameSession` + enum `SessionStatus` + `GameSessionRepository` con métodos de count.
2. **Endpoint `GET /api/v1/stats/public`**: `PublicStatsController` + `PublicStatsService` + `PublicStatsResponse` record + cache HTTP 5 min + abrir en `SecurityConfig`.
3. **Tests**: `PublicStatsServiceTest` (3 unit) + `PublicStatsControllerTest` (2 MockMvc).

### Frontend — infraestructura compartida (~3h, paralelizable)

4. **`shared/components/SeoHead.tsx`** con react-helmet-async + JSON-LD + noindex flag. Retrofit en `LoginPage`/`RegisterPage`.
5. **`shared/components/Logo.tsx`** leyendo SVG de `public/brand/`.
6. **`scripts/generate-og.mjs`** + `mockups/og-landing-{es,en}.html` + `npm run og:generate` en `package.json` + dep dev `puppeteer`.
7. **Generar PNGs y commitearlos**: `public/og/landing-es.png`, `landing-en.png`.
8. **Instalar `embla-carousel-react`** (`npm i embla-carousel-react`).
9. **Claves i18n** `landing.*` + `seo.landing.*` en `shared/i18n/locales/{es,en}.json`. **Verificar que NO existe `features/<x>/locales/`** anywhere.
10. **Verificar Tailwind tokens**: `bg-{red,blue,green,yellow}-soft` y `text-{red,blue,green,yellow}` resuelven en `tailwind.config.ts`.

### Frontend — feature `landing/` (~5h, orden estricto)

11. `types/landing.types.ts` + `api/statsApi.ts` + `hooks/usePublicStatsQuery.ts`
12. `components/HeroDeco.tsx`
13. `components/QuickSearch.tsx` + test
14. `components/HeroSessionPreview.tsx`
15. `components/Hero.tsx` (usa `<Trans>` para el H1)
16. `components/TrustStrip.tsx` + test
17. `components/DiscoveryCards.tsx` + test
18. `components/CommunityCarousel.tsx` con embla + test
19. `components/LandingContent.tsx` (incluye `<SeoHead>` con JSON-LD)
20. `pages/LandingPage.tsx` + test (redirect según status + render)

### Integración (~1h)

21. **Router**: `/` → `LandingPage` lazy en `app/router.tsx`.
22. **Eliminar `HomePage` placeholder** de `features/sessions/pages/`. Cuando llegue el módulo sessions creará su `SessionsListPage`.
23. **`<Logo>` en `MainLayout`** sustituyendo el texto del header.
24. **Verificación final**: lint + typecheck + test + build, todos verdes.
25. **Smoke manual**: `npm run dev` y validar landing visualmente contra el mockup. Lighthouse mobile ≥95.

---

## Fuera de alcance (deferred)

| Feature | Cuándo | Por qué fuera de v1 |
|---------|--------|---------------------|
| Open Sessions strip con datos reales | Cuando exista módulo `sessions` backend | Sin endpoint sólido es prematuro |
| Featured Games carousel | v1.1 | No esencial para conversión |
| Blog / news real en CommunityCarousel | Cuando exista CMS o tabla `posts` | Placeholders son aceptables a corto plazo |
| Hamburger menu mobile | v1.1 | Header simplificado funciona en mobile (solo CTAs) |
| Toggle de tema (light/dark) en header | Cuando exista `<ThemeToggle />` en `shared/components/` | El boot ya respeta `themeStore`, falta el control UI |
| Auto-advance del carousel | Solo si hay petición explícita | Plugin `embla-carousel-autoplay` listo para instalar. A11y prefiere control manual. |
| A/B testing del hero (variantes copy) | Cuando haya analytics | No hay infra de tracking todavía |
| `sessions` module completo (controllers, services, DTOs) | Próxima feature | El schema ya está creado en esta misma iteración para desbloquear stats |
