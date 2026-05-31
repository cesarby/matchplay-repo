# Landing Brutalismo Lúdico — Design Spec

Fecha: 2026-05-31
Estado: **Implementado** (F0 + F1 cerrados, refinamientos visuales aplicados, `AuthLayout` simplificado, `MobileTabBar` global)
Fuente: `mockups/concept-B-brutalist-desktop.html` y `mockups/concept-B-brutalist-mobile.html`.

> **Base de diseño para nuevas pantallas**: este documento es la referencia canónica del sistema brutalismo lúdico. Cualquier pantalla nueva debe seguir las primitivas (§4), la paleta (§3) y los patrones documentados en **§18 Patrones reutilizables**.

## 1 · Propósito

Documentar **al detalle** el rediseño "Brutalismo lúdico" para que un implementador (humano o agente) pueda llevarlo a producción sin tener que abrir el HTML de mockup.

**Alcance**:
- **Landing pública** — secciones nuevas y restructuración completa de `frontend/src/features/landing/` (objeto principal del spec).
- **Resto de la app** — la **paleta** saturada, las **primitivas brutalistas** (`.brutal*`, `.stamp`, etc.) y la **tipografía** (Bricolage + Inter + Space Mono para etiquetas) se aplican globalmente. Páginas existentes (`/sessions`, `/sessions/:id`, `/profile`, `/login`, `/register`, `SiteHeader`, `MobileMenu`, etc.) se migran al estilo brutal en una iteración posterior (ver §17 *Plan de migración global*). Esta sesión documenta el **cómo**; el rollout por página queda fuera.

## 2 · Decisiones cerradas

| # | Decisión | Justificación |
|---|----------|---------------|
| D1 | Estilo "Brutalismo lúdico": bordes negros 3-4px, sombras sólidas con offset, colores planos saturados, tipografía display extrabold | El estilo de juego de mesa físico (cartas, fichas, dados) se traduce mejor con primitivas brutalistas que con glass/SaaS aséptico. |
| D2 | Paleta saturada: red `#E63946`, yellow `#FFBE0B`, green `#06A77D`, blue `#2E86DE`. **Sustituye** los valores actuales de `tokens.css` (más apagados) para light; dark se ajustará en sesión posterior. | Los colores actuales son cafetería-suave; brutalismo necesita saturación alta para que las cards sólidas no se vean mortecinas. |
| D3 | Tipografía: `Bricolage Grotesque` (display, ya en el proyecto), `Inter` (body, ya en el proyecto), `Space Mono` para etiquetas/meta (nuevo — sustituye a `JetBrains Mono` solo en superficies brutal). | Space Mono tiene más "carácter máquina de escribir" que pega con el tono sticker. Conservar JetBrains Mono en código/admin si aparece. |
| D4 | Fondo body con patrón de dots (radial-gradient 1px @ 22px). | Recuerda al papel de cuaderno/manual de juego sin competir con el contenido. |
| D5 | No hay dark mode en v1 de esta landing. El toggle existente sigue funcional en otras páginas; en `/` se fuerza light. | El sistema de cards de color sólido pierde fuerza en dark. Reservado para iteración futura. |
| D6 | Sticker "Sin registro pa' mirar 👀" SE QUEDA. Sticker "¡100% gratis!" eliminado (decisión del usuario). | Uno solo basta. |
| D7 | **Brutal global**. La paleta saturada y las primitivas brutalistas se aplican a **toda la app**, no solo a la landing. `SiteHeader`, `MobileMenu`, cards de `/sessions`, `/profile`, etc. se migran al estilo brutal. | Decisión del usuario (2026-05-31). Coherencia visual: la landing no puede ser brutal mientras el resto de la app es cafetería suave; rompería la promesa. |
| D8 | **Tokens brutal responsivos**. Border-width y shadow-offset varían por breakpoint vía CSS custom properties — los mockups mobile y desktop usaban valores distintos por diseño. Mobile (<768px): 3px/5-7-3px. Desktop (≥768px): 4px/6-10-4px. Override en media query dentro de `tokens.css`. | Los elementos mobile son visualmente más pequeños; valores desktop quedan "grumosos" en mobile. Match exacto con los mockups originales. |
| D9 | **`animate-fade-up` para contenido asíncrono**, NO `.reveal`. El `IntersectionObserver` solo observa elementos presentes al mount. Cards renderizadas tras una query (TrustStrip stats, futuras listas paginadas, etc.) deben usar `animate-fade-up` para garantizar visibilidad. `useRevealOnScroll` se actualizó con MutationObserver para mitigar pero la regla "async → animate-fade-up" sigue siendo el patrón recomendado. | Bug detectado en TrustStrip: stats invisibles al cargar. Se corrigió con animate-fade-up + MutationObserver. |
| D10 | **`MobileTabBar` global**, montada desde `MainLayout`, no desde `LandingContent`. Aparece en TODAS las pantallas mobile (`md:hidden`). | Coherencia de navegación: el usuario espera la tabbar siempre disponible. |
| D11 | **`AuthLayout` sin SiteHeader**. Login/register son flujos focalizados; un botón "Volver" (←) en esquina superior izquierda permite cancelar y regresar a `/`. | Reduce fricción visual y evita que el usuario "se pierda" en el menú durante un flujo de auth. |

## 3 · Design tokens

### 3.1 Cambios en `frontend/src/styles/tokens.css`

```css
:root,
.light {
  --background: 251 246 232;        /* #FBF6E8 cream — sustituye 250 246 238 */
  --background-alt: 241 233 210;    /* #F1E9D2 paper — sustituye 244 236 220 */
  --foreground: 14 14 12;           /* #0E0E0C ink — más negro, sustituye 31 26 20 */
  --card: 251 246 232;              /* mismo que background — las cards usan colores planos */
  --card-foreground: 14 14 12;
  --muted: 241 233 210;
  --muted-foreground: 90 85 75;     /* #5A554B */
  --border: 14 14 12;               /* ink — los bordes brutalistas son negros, no grises */

  --p-red: 230 57 70;               /* #E63946 — sustituye 200 54 44 */
  --p-blue: 46 134 222;             /* #2E86DE — sustituye 31 111 178 */
  --p-green: 6 167 125;             /* #06A77D — sustituye 47 143 79 */
  --p-yellow: 255 190 11;           /* #FFBE0B — sustituye 232 169 59 */
  /* Los soft variants se mantienen para resto de la app que no es brutal */
}
```

**Variables brutal — mobile-first** (en el bloque `:root` superior, NO en `:root, .light`):

```css
/* Mobile-first: aplican <768px. En md: se sobreescriben con offsets más
 * gruesos (decisión D8). Match exacto con los mockups originales. */
--brutal-border-width: 3px;
--brutal-border-width-lg: 3px;     /* mobile: igual que base; desktop sube a 4 */
--brutal-border-width-sm: 2px;
--brutal-shadow-offset: 5px;       /* mobile: 5; desktop: 6 */
--brutal-shadow-offset-lg: 7px;    /* mobile: 7; desktop: 10 */
--brutal-shadow-offset-sm: 3px;    /* mobile: 3; desktop: 4 */
--brutal-bg-dots: radial-gradient(rgb(14 14 12 / 0.07) 1px, transparent 1px);
--brutal-bg-dots-size: 22px 22px;
```

**Override desktop** (al final de `tokens.css`):

```css
/* `md:` breakpoint de Tailwind (≥768px). */
@media (min-width: 768px) {
  :root {
    --brutal-border-width-lg: 4px;
    --brutal-shadow-offset: 6px;
    --brutal-shadow-offset-lg: 10px;
    --brutal-shadow-offset-sm: 4px;
  }
}
```

**Por qué dos niveles**: los mockups mobile (`concept-B-brutalist-mobile.html`) usaban 3/3/2 border + 5/7/3 shadow porque los elementos pequeños en mobile quedan grumosos con shadows grandes. Los mockups desktop subían a 3/4/2 + 6/10/4 porque los elementos más grandes piden más profundidad. **Cualquier elemento con `.brutal*` adapta automáticamente** — no hay que pensar en breakpoints en el JSX.

### 3.2 Cambios en `frontend/tailwind.config.ts`

Añadir bajo `extend`:

```ts
fontFamily: {
  display: ['var(--font-display)'],     // Bricolage Grotesque (sin cambio)
  body:    ['var(--font-body)'],        // Inter (sin cambio)
  mono:    ['var(--font-mono)'],        // sigue siendo JetBrains Mono globalmente
  // Nueva fuente para etiquetas brutal:
  brutal:  ['"Space Mono"', 'ui-monospace', 'monospace'],
},
boxShadow: {
  // ...existentes
  brutal:    '6px 6px 0 0 rgb(var(--border))',
  'brutal-lg': '10px 10px 0 0 rgb(var(--border))',
  'brutal-sm': '4px 4px 0 0 rgb(var(--border))',
  'brutal-hover': '9px 9px 0 0 rgb(var(--border))',
  'brutal-press': '3px 3px 0 0 rgb(var(--border))',
},
animation: {
  // ...existentes
  'marquee':   'marquee 22s linear infinite',
  'marquee-mobile': 'marquee 18s linear infinite',
  'dice-roll': 'diceRoll 3s ease-in-out infinite',
  'pop-in':    'popIn 0.65s cubic-bezier(.5,1.6,.4,1) both',
  'wiggle':    'wiggle 0.5s ease-in-out',
  'float':     'float 5s ease-in-out infinite',
},
keyframes: {
  // ...existentes
  marquee: {
    from: { transform: 'translateX(0)' },
    to:   { transform: 'translateX(-50%)' },
  },
  diceRoll: {
    '0%, 15%':  { transform: 'rotate(0)' },
    '25%':      { transform: 'rotate(90deg)' },
    '50%':      { transform: 'rotate(180deg)' },
    '75%':      { transform: 'rotate(270deg)' },
    '85%, 100%':{ transform: 'rotate(360deg)' },
  },
  popIn: {
    from: { opacity: '0', transform: 'scale(0.6) rotate(-10deg)' },
    to:   { opacity: '1', transform: 'scale(1) rotate(0)' },
  },
  wiggle: {
    '0%, 100%': { transform: 'rotate(0)' },
    '25%':      { transform: 'rotate(-3deg)' },
    '75%':      { transform: 'rotate(3deg)' },
  },
  float: {
    // Inclina a la derecha (positivo). Si en alguna pantalla la card debe
    // inclinarse al lado contrario, NO toques el keyframe — añade clase
    // `rotate-y-180` o ajusta `rotate-{n}` estática (la animación overridea).
    '0%, 100%': { transform: 'translateY(0) rotate(4deg)' },
    '50%':      { transform: 'translateY(-12px) rotate(2deg)' },
  },
},
```

### 3.3 Cargar Space Mono

Añadir a `frontend/index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

## 4 · Primitivas brutalistas (CSS utilities)

Estas clases viven en `frontend/src/styles/globals.css` dentro de `@layer components` para que se puedan aplicar como utilidades Tailwind.

```css
@layer components {
  /* === Brutalist surfaces === */
  .brutal {
    border: var(--brutal-border-width) solid rgb(var(--border));
    box-shadow: var(--brutal-shadow-offset) var(--brutal-shadow-offset) 0 0 rgb(var(--border));
  }
  .brutal-lg {
    border: var(--brutal-border-width-lg) solid rgb(var(--border));
    box-shadow: var(--brutal-shadow-offset-lg) var(--brutal-shadow-offset-lg) 0 0 rgb(var(--border));
  }
  .brutal-sm {
    border: var(--brutal-border-width-sm) solid rgb(var(--border));
    box-shadow: var(--brutal-shadow-offset-sm) var(--brutal-shadow-offset-sm) 0 0 rgb(var(--border));
  }
  .brutal-inner {
    /* Para inputs/selects dentro de un container brutal — sin shadow */
    border: var(--brutal-border-width) solid rgb(var(--border));
  }

  /* `.brutal-drop` / `.brutal-drop-lg` — variante que usa `filter: drop-shadow()`
   * en lugar de `box-shadow`. Diferencia clave: `drop-shadow` sigue la FORMA
   * del elemento (incluyendo el border-radius), por lo que la esquina exterior
   * de la sombra es REDONDEADA. `box-shadow` con offset siempre genera una
   * esquina exterior cuadrada (es spec).
   *
   * Úsalo cuando el card sea visualmente protagonista (mini-cards, stickers
   * destacados, hero cards) y la esquina cuadrada del box-shadow se note.
   *
   * Tradeoff: NO combinable con `brutal-hover` (que mueve translate + cambia
   * box-shadow al hacer hover). Las clases drop son para elementos estáticos
   * o con `animate-float`. */
  .brutal-drop {
    border: var(--brutal-border-width) solid rgb(var(--border));
    filter: drop-shadow(
      var(--brutal-shadow-offset) var(--brutal-shadow-offset) 0 rgb(var(--border))
    );
  }
  .brutal-drop-lg {
    border: var(--brutal-border-width-lg) solid rgb(var(--border));
    filter: drop-shadow(
      var(--brutal-shadow-offset-lg) var(--brutal-shadow-offset-lg) 0 rgb(var(--border))
    );
  }

  /* === Brutal interaction === */
  .brutal-hover {
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .brutal-hover:hover {
    transform: translate(-3px, -3px);
    box-shadow: 9px 9px 0 0 rgb(var(--border));
  }
  .brutal-press:active {
    transform: translate(3px, 3px);
    box-shadow: 3px 3px 0 0 rgb(var(--border));
  }

  /* === Body background (only on landing page) === */
  .landing-bg {
    background-color: rgb(var(--background));
    background-image: var(--brutal-bg-dots);
    background-size: var(--brutal-bg-dots-size);
  }

  /* === Select chevron with breathing room === */
  select.brutal-inner {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%230E0E0C' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-position: right 14px center;
    background-repeat: no-repeat;
    padding-right: 38px;
  }
  /* En mobile, padding más estrecho */
  @media (max-width: 768px) {
    select.brutal-inner {
      background-position: right 12px center;
      padding-right: 32px;
    }
  }

  /* === Marquee wrapper === */
  .marquee-wrap { overflow: hidden; }
  .marquee {
    display: flex;
    gap: 2rem;
    animation: marquee 22s linear infinite;
  }

  /* === Stamp (yellow blob behind a word) === */
  .stamp {
    position: relative;
    display: inline-block;
  }
  .stamp::before {
    content: '';
    position: absolute;
    inset: -6px -10px;
    background: rgb(var(--p-yellow));
    transform: rotate(-1.2deg);
    z-index: -1;
    box-shadow: 4px 4px 0 0 rgb(var(--border));
  }

  /* === Tag with cut corner (for ID badges) === */
  .tag-cut {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  }

  /* === Dice grid (4×3 for 12-cell, 4×2 for 8-cell) === */
  .dgrid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
  .dcell {
    aspect-ratio: 1 / 1;
    border: 2px solid rgb(var(--border));
    border-radius: 4px;
  }

  /* === Checker pattern (CTA decoration) === */
  .checker {
    background-image:
      linear-gradient(45deg,  rgb(var(--border)) 25%, transparent 25%),
      linear-gradient(-45deg, rgb(var(--border)) 25%, transparent 25%),
      linear-gradient(45deg,  transparent 75%, rgb(var(--border)) 75%),
      linear-gradient(-45deg, transparent 75%, rgb(var(--border)) 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  }

  /* === Reveal on scroll (used by IntersectionObserver) === */
  .reveal {
    opacity: 0;
    transform: translateY(20px) rotate(-1deg);
    transition: opacity 800ms cubic-bezier(.2,.7,.2,1), transform 800ms cubic-bezier(.2,.7,.2,1);
  }
  .reveal.in {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  .marquee,
  .animate-marquee,
  .animate-marquee-mobile,
  .animate-dice-roll,
  .animate-pop-in,
  .animate-float {
    animation: none !important;
  }
  .reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  .brutal-hover { transition: none !important; }
}

/* === Focus visible (sobre-escribe el default para brutal) === */
.brutal :focus-visible,
.brutal-sm :focus-visible,
.brutal-lg :focus-visible,
.brutal-inner:focus-visible {
  outline: 3px solid rgb(var(--p-blue));
  outline-offset: 3px;
  border-radius: 4px;
}
```

## 5 · Estructura de la página

Orden vertical del DOM (idéntico en desktop y mobile, lo que cambia es el layout interno de cada sección):

```
<body class="landing-bg font-body">

  1. <div class="marquee top-strip">          ← banner stats animado
  2. <header>                                  ← navbar
  3. <section id="hero">                       ← H1 + CTAs + QuickSearch + SessionCard
  4. <section aria-label="Estadísticas">       ← TrustStrip (3 cards)
  5. <section id="how">                        ← DiscoveryCards (3 cards)
  6. <div class="marquee games-strip">         ← banner negro con nombres de juegos
  7. <section id="community">                  ← CommunityCarousel
  8. <section class="cta-final">               ← CTA yellow
  9. <footer>                                  ← desktop only (en mobile reemplaza por TabBar)
 10. <nav class="tabbar">                      ← mobile only, sticky bottom

</body>
```

**Regla**: el orden NO cambia entre breakpoints. Mantener consistencia para `<MainLayout>`.

## 6 · Sección por sección

### 6.1 Top strip marquee (banner stats)

| | Desktop | Mobile |
|---|---|---|
| Tag | `<div>` (no semántico — decorativo) | igual |
| Container | `bg-ink text-cream py-2 border-b-4 border-ink` | `py-1.5 border-b-2` |
| Texto | `font-brutal text-xs uppercase tracking-widest` | `text-[10px]` |
| Items | `★ {stat} {●color}` repetidos 5 veces | 4 veces (más cortos) |
| Animación | `animate-marquee` (22s) | `animate-marquee-mobile` (18s) |
| Items por viewport | ~5 visibles | ~3 visibles |
| Duplicación | El bloque interno se renderiza 2 veces (segundo con `aria-hidden="true"`) | igual |
| Stats mostradas | "142 partidas abiertas", "387 jugadores", "24 ciudades activas", "Es gratis. Siempre.", "Tu mesa, tu turno" | sin "Tu mesa, tu turno" (se acorta) |

**Comportamiento**: stats reales del endpoint `/api/v1/stats/public`. Si error → renderizar con valores cacheados o ocultar la banda completa.

### 6.2 Header

| | Desktop | Mobile |
|---|---|---|
| Tag | `<header class="px-6 pt-6">` | `<header class="px-4 pt-4 sticky top-0 bg-cream/95 backdrop-blur z-30 pb-3 border-b-2 border-ink/10">` |
| Container interno | `max-w-7xl mx-auto bg-cream brutal rounded-2xl px-6 py-3 flex items-center justify-between` | sin container interno (header full-width sticky) |
| Logo box | `w-10 h-10 bg-red brutal-sm rounded-md` con "M" | `w-9 h-9 ... text-lg` |
| Wordmark | `font-display font-black text-2xl` "matchplay**.**" (el punto en `text-red`) | `text-xl` |
| Nav | `hidden md:flex gap-8 text-sm font-bold uppercase tracking-wider` con: Explorar, Cómo va, Comunidad, Ayuda. Hover → `text-red` | Reemplazado por **botón hamburger** `w-9 h-9 bg-cream brutal-sm rounded-md` |
| CTAs | Botón "Entrar" (`font-bold px-4 py-2 hover:bg-yellow/40 rounded-md`) + "Crear cuenta" (`bg-red text-white brutal-sm brutal-hover`) | Ocultos en mobile (se accede vía menú hamburger) |

**Sticky desktop**: NO sticky en desktop, sí sticky en mobile. Z-index del mobile header: 30.

### 6.3 Hero

#### Contenedor

```html
<section class="relative px-6 pt-16 pb-24 overflow-hidden">   <!-- desktop -->
<section class="relative px-4 pt-6 pb-8">                      <!-- mobile -->
  <div class="max-w-7xl mx-auto grid grid-cols-12 gap-8 items-center">  <!-- desktop only -->
```

#### Sticker flotante "Sin registro pa' mirar 👀"

- **Solo desktop** (`hidden lg:inline-flex`)
- Posición: `absolute top-10 right-[16%]`
- Estilo: `bg-yellow brutal rounded-full px-4 py-2 font-display font-black text-sm rotate-[8deg] z-20`
- Animación: `animate-pop-in`

#### Eyebrow chip

```html
<div class="reveal inline-flex items-center gap-2 bg-cream brutal-sm rounded-full px-4 py-1.5 font-brutal text-xs font-bold uppercase tracking-wider mb-6">
  <span class="w-2 h-2 rounded-full bg-green animate-pulse"></span>
  Hay 142 mesas abiertas YA
</div>
```

Mobile: `gap-1.5 px-3 py-1 text-[10px] mb-5`, dot `w-1.5 h-1.5`, copy "142 mesas abiertas YA" (sin "Hay").

#### H1

| | Desktop | Mobile |
|---|---|---|
| Wrapper | `font-display font-black leading-[0.95] tracking-tight` | `leading-[0.92]` |
| Línea 1 | `text-[5.5rem] lg:text-[7rem]` "Tira el dado." | `text-[44px]` |
| Línea 2 | igual + `<span class="stamp">ficha</span>` | igual |
| Línea 3 | `text-red` + `<span class="dice inline-block">🎲</span>` con `animate-dice-roll` | `mt-2` añadido |

**Patrón i18n**: usar `<Trans>` de react-i18next como en `landing-spec.md`. La clave tiene placeholders `<1>` (stamp), `<2>` (dice container) y `<3>` (red span). Ejemplo:

```json
{
  "landing.hero.title": "Tira el dado.|Mueve <1>ficha</1>.|<3>Juega <2>🎲</2> ya.</3>"
}
```

#### Subtítulo

```html
<p class="reveal mt-8 text-xl max-w-xl font-medium">
  Partidas de juegos de mesa con gente <span class="bg-yellow px-1.5 rounded font-bold">cerca de ti</span>. Sin grupos privados, sin esperar mensaje de nadie.
</p>
```

Mobile: `mt-5 text-[15px]`, sin `max-w-xl`, copy más corta: "Partidas con gente **cerca de ti**. Sin grupos privados, sin esperar a nadie."

#### CTAs

| | Desktop | Mobile |
|---|---|---|
| Wrapper | `flex flex-wrap gap-4 mt-8` | `flex flex-col gap-2.5 mt-6` |
| CTA primario | `bg-red text-white font-display font-bold text-lg px-7 py-4 rounded-xl brutal brutal-hover brutal-press` + flecha SVG (stroke-width 3) | `text-base py-3.5` full-width |
| CTA secundario | `bg-cream text-ink ... brutal brutal-hover brutal-press` | igual full-width |

Labels (de i18n): `landing.cta.explore` = "Explorar partidas", `landing.cta.register` = "Crear cuenta".

#### QuickSearch

```html
<form class="reveal mt-10 bg-cream brutal-lg rounded-2xl p-4
             grid grid-cols-1 md:grid-cols-[1fr_1fr_1.3fr_auto] gap-3">

  <label class="sr-only" for="prov">Provincia</label>
  <select id="prov" class="bg-white brutal-inner rounded-lg px-4 py-3 font-bold text-sm">…</select>

  <label class="sr-only" for="city">Ciudad</label>
  <select id="city" class="bg-white brutal-inner rounded-lg px-4 py-3 font-bold text-sm">…</select>

  <label class="sr-only" for="game">Juego</label>
  <input id="game" type="text" placeholder="¿A qué te apetece jugar?"
         class="bg-white brutal-inner rounded-lg px-4 py-3 font-bold text-sm
                placeholder:font-medium placeholder:text-mute">

  <button class="bg-ink text-cream rounded-lg px-6 py-3 font-display font-bold
                 brutal-sm brutal-hover brutal-press
                 flex items-center justify-center gap-2">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
    </svg>
    ¡Buscar!
  </button>
</form>
```

Mobile:
```html
<form class="reveal mt-6 bg-cream brutal-lg rounded-2xl p-3 flex flex-col gap-2">
  <div class="flex gap-2">
    <select class="flex-1 bg-white brutal-inner rounded-lg px-3 py-2.5 font-bold text-sm">…</select>
    <select class="flex-1 bg-white brutal-inner rounded-lg px-3 py-2.5 font-bold text-sm">…</select>
  </div>
  <input … class="bg-white brutal-inner rounded-lg px-3 py-2.5 font-bold text-sm">
  <button class="bg-ink text-cream rounded-lg py-3 font-display font-bold brutal-sm brutal-press flex items-center justify-center gap-2">…</button>
</form>
```

**Comportamiento idéntico al landing-spec.md actual**: provincia → ciudad cascada, submit construye query string camelCase y navega a `/sessions?provinceCode=...&cityCode=...&q=...`.

**Chevron del select**: ya cubierto por `select.brutal-inner` global (sección 4).

#### Hero session preview (sticker card)

| | Desktop | Mobile |
|---|---|---|
| Wrapper | `col-span-12 lg:col-span-5 relative z-10` | sección separada `<section class="px-4 pb-8">` después del hero |
| Card | `float bg-cream brutal-lg rounded-2xl p-6 max-w-md mx-auto wiggle` | `float bg-cream brutal-lg rounded-2xl p-5 rotate-[-2deg]` (sin wiggle) |
| Animaciones | `animate-float` + `wiggle` on hover (desktop only) | `animate-float`, rotación fija |
| Badge ID | `bg-ink text-cream font-brutal text-xs uppercase px-3 py-1 rounded-md tag-cut` "Mesa #042" | `text-[10px] px-2.5 py-1 rounded` (sin tag-cut) |
| Badge estado | `bg-green text-white font-brutal text-xs uppercase px-3 py-1 rounded-md brutal-sm` "● Abierto" | `text-[10px]` |
| Dice grid (game image placeholder) | `bg-paper brutal-inner rounded-xl p-3 mb-5` con `.dgrid` 12 celdas | `rounded-lg p-2.5 mb-4` |
| Patrón de colores celdas | `red, yellow, blue, green, yellow, red, green, blue, blue, green, red, yellow` (fijo) | mismo patrón |
| Título | `font-display font-black text-2xl` "Wingspan + Europa" | `text-xl` |
| Meta | `font-brutal text-xs text-mute uppercase tracking-wider` "Mesa Wood · Sáb 15 Jun · 18:00" | `text-[10px]` |
| Avatares | `w-9 h-9 rounded-full brutal-sm` + último con `border-dashed` "+1" | `w-8 h-8 text-xs`, sin slot "+1" |
| Plazas | `font-brutal text-xs font-bold` "3/4 plazas" | `text-[11px]` |
| CTA | `bg-red text-white font-display font-bold text-lg py-3 rounded-lg brutal brutal-hover brutal-press` "¡Apúntame!" | `text-base py-2.5 rounded-lg brutal brutal-press` (sin `brutal-hover` — es táctil) |

**Datos**: hardcoded de i18n (mismo principio que el landing actual). Cuando exista `<SessionCard>` reutilizable, reemplazar.

### 6.4 Trust strip

| | Desktop | Mobile |
|---|---|---|
| Container | `<section aria-label="Estadísticas" class="px-6 pb-24">` `<div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">` | `<section aria-label="Estadísticas" class="px-4 pb-8 flex flex-col gap-3">` |
| Cards | 3 cards lado a lado con rotación alterna `-rotate-1`, `rotate-1`, `-rotate-1` | 3 cards apiladas, misma rotación |
| Card layout | `bg-{color} text-white brutal-lg brutal-hover rounded-2xl p-7` con header (label + icon) + número gigante + caption | `p-4 flex items-center justify-between` (más horizontal) |
| Colores | Card 1 red, Card 2 blue, Card 3 green | igual |
| Etiqueta | `font-brutal text-xs font-bold uppercase tracking-widest` | `text-[10px]` |
| Icon box | `w-10 h-10 bg-white text-{color} brutal-sm rounded-md` con SVG (check, users, pin) | `w-12 h-12` |
| Número | `font-display font-black text-7xl leading-none` | `text-5xl` |
| Caption | `font-medium text-white/85 mt-3` (Hay mesa esperándote / Gente real / Y subiendo) | **ocultar** en mobile |
| Reveal delays | `0`, `.08s`, `.16s` | igual |

**Datos**: `usePublicStatsQuery()` ya existe. Sin cambios al hook. Estados: loading → 3 skeleton cards con `bg-mute brutal-lg rounded-2xl p-7 animate-pulse`. Error → ocultar sección entera.

### 6.5 Discovery cards (sección "Cómo va")

#### Encabezado de sección

```html
<div class="reveal text-center max-w-3xl mx-auto mb-14">   <!-- desktop -->
  <span class="bg-ink text-cream font-brutal text-xs font-bold uppercase tracking-widest
               px-3 py-1 rounded-md brutal-sm inline-block mb-5">
    // Cómo va //
  </span>
  <h2 class="font-display font-black text-5xl lg:text-6xl leading-[0.95]">
    Tres formas. <span class="bg-red text-white px-3 rounded-md">Cero excusas.</span>
  </h2>
</div>
```

Mobile: `mb-5` (no centrado), chip `text-[10px] px-2 py-0.5 mb-3`, h2 `text-3xl px-2 rounded` en el span destacado.

#### Cards (3, una por color)

| Card | Color background | Texto | Icono SVG | Hover icon |
|------|------------------|-------|-----------|------------|
| 01 | `bg-yellow` (text-ink) | "Encuentra jugadores" | **Lucide `users-round`**: `<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>`, `stroke-width="2.2"`, `stroke-linecap="round"`, `stroke-linejoin="round"` | rotate -12deg |
| 02 | `bg-green` (text-white) | "Descubre partidas abiertas" | Grid de pips (rect + 3 circles), `stroke-width="2.5"` | rotate +12deg |
| 03 | `bg-red` (text-white) | "Organiza quedadas" | Plus circle (circle r=10 + path M12 8v8 M8 12h8), `stroke-width="2.5"` | scale 110 |

```html
<article class="reveal bg-yellow brutal-lg brutal-hover rounded-2xl p-7 group">
  <div class="flex items-center justify-between mb-5">
    <span class="font-brutal font-black text-2xl">01.</span>
    <div class="w-14 h-14 bg-cream brutal rounded-xl flex items-center justify-center
                group-hover:rotate-[-12deg] transition-transform">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 21a8 8 0 0 0-16 0"/>
        <circle cx="10" cy="8" r="5"/>
        <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
      </svg>
    </div>
  </div>
  <h3 class="font-display font-black text-2xl leading-tight mb-3">Encuentra jugadores</h3>
  <p class="font-medium leading-relaxed">Filtra por provincia, ciudad y juego favorito. Sin redes sociales. Sin mensajes que nadie lee.</p>
  <!-- NO link al final — eliminado por decisión del usuario -->
</article>
```

Mobile: card `p-5`, icon box `w-11 h-11 rounded-lg`, icon SVG `width=22`, h3 `text-xl`, paragraph `text-sm mt-2`. **No** se aplica `brutal-hover` ni rotación de icono en mobile (es táctil).

Reveal delays cards: `0`, `.08s`, `.16s`.

#### Grid

| | Desktop | Mobile |
|---|---|---|
| Grid | `grid grid-cols-1 md:grid-cols-3 gap-7` | `flex flex-col gap-4` |
| Cards | 3 lado a lado | apiladas |

**Importante**: las cards NO tienen el link "Ver jugadores cerca →" (eliminado del mockup actual). Si en una iteración futura se reintroduce, debería ser `<a>` con `font-bold underline decoration-2 underline-offset-4`.

### 6.6 Marquee de juegos

| | Desktop | Mobile |
|---|---|---|
| Container | `bg-ink text-cream py-5 marquee-wrap border-y-4 border-ink` | `py-3 border-y-2 mb-8` |
| Texto | `font-display font-black text-3xl` | `text-lg` |
| Separador | `text-{red/yellow/green/blue} ✦` (alternar) | igual |
| Juegos listados | Catan, Wingspan, Terraforming Mars, Carcassonne, Dune Imperium, 7 Wonders, Azul, Brass Birmingham (8) | Catan, Wingspan, Terraforming Mars, Carcassonne, Dune (5) |
| Animación | `marquee 22s` | `marquee 18s` |
| Duplicación | bloque interno repetido 2× (segundo `aria-hidden="true"`) | igual |

### 6.7 Community carousel

#### Encabezado

```html
<div class="reveal mb-14">   <!-- desktop -->
  <span class="bg-blue text-white font-brutal text-xs font-bold uppercase tracking-widest
               px-3 py-1 rounded-md brutal-sm inline-block mb-5">
    // La comunidad //
  </span>
  <h2 class="font-display font-black text-5xl lg:text-6xl leading-[0.95] max-w-2xl">
    Mesas que pasan <span class="bg-yellow px-3 rounded-md">ahora</span>.
  </h2>
</div>
```

Mobile: `mb-5`, chip `text-[10px] px-2 py-0.5 mb-3`, h2 `text-3xl`, span destacado `px-2 rounded`.

#### Container del slide actual

| | Desktop | Mobile |
|---|---|---|
| Card outer | `bg-cream brutal-lg rounded-3xl p-8 lg:p-12 relative` | `bg-cream brutal-lg rounded-2xl p-5` |
| Layout interno | `grid grid-cols-12 gap-8 items-center` | flujo vertical normal |
| Bloque izquierdo (col-span-7) | Badge ubicación, h3 quote, párrafo, avatares + nombres, botón CTA | igual pero stack |
| Bloque derecho (col-span-5) | Mini card session con `float bg-paper brutal-lg rounded-2xl p-5 rotate-[3deg]` con dice grid 4×2 (8 celdas) | mini card pero `bg-paper brutal rounded-xl p-4` (sin rotación, sin brutal-lg) |

#### Quote

```html
<span class="bg-ink text-cream font-brutal text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-md">
  Madrid · Hoy 19:00
</span>
<h3 class="font-display font-black text-3xl lg:text-4xl leading-tight mt-5">
  "Empezamos partida casual de Terraforming Mars. Buscamos un cuarto."
</h3>
<p class="mt-4 text-lg">Mesa abierta a nivel intermedio o experto. Snacks. Paciencia. Tiempo. ~3h.</p>
```

Mobile: chip `text-[10px] px-2 py-1`, h3 `text-xl mt-3`, párrafo `text-sm mt-3`.

#### Avatares + CTA del slide

Desktop:
```html
<div class="mt-6 flex items-center gap-4">
  <div class="flex -space-x-1.5">
    <span class="w-11 h-11 rounded-full bg-red text-white font-bold flex items-center justify-center brutal-sm">L</span>
    <span class="w-11 h-11 rounded-full bg-green text-white font-bold flex items-center justify-center brutal-sm">P</span>
    <span class="w-11 h-11 rounded-full bg-yellow text-ink font-bold flex items-center justify-center brutal-sm">R</span>
  </div>
  <p class="font-bold">Lara, Pablo y Rocío te esperan.</p>
</div>
<button class="mt-7 inline-flex items-center gap-2 bg-red text-white font-display font-bold text-lg px-7 py-3.5 rounded-xl brutal brutal-hover brutal-press">
  ¡Apúntame a esta!
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <path d="M5 12h14M13 5l7 7-7 7"/>
  </svg>
</button>
```

Mobile: avatares ocultos (no caben), CTA mantiene "¡Apúntame!" `text-base py-2.5 rounded-lg brutal brutal-press w-full`.

#### Controles del carousel

```html
<div class="mt-10 flex items-center justify-between">   <!-- desktop -->
  <!-- Indicadores -->
  <div class="flex items-center gap-2">
    <span class="h-3 w-10 bg-ink rounded-full"></span>       <!-- activo (elongado) -->
    <span class="h-3 w-3 bg-ink/20 rounded-full"></span>
    <span class="h-3 w-3 bg-ink/20 rounded-full"></span>
  </div>
  <!-- Botones -->
  <div class="flex items-center gap-3">
    <button class="w-12 h-12 bg-cream brutal-sm brutal-hover brutal-press rounded-xl flex items-center justify-center" aria-label="Anterior">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button class="w-12 h-12 bg-ink text-cream brutal-sm brutal-hover brutal-press rounded-xl flex items-center justify-center" aria-label="Siguiente">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M9 6l6 6-6 6"/></svg>
    </button>
  </div>
</div>
```

Mobile: indicadores `h-2.5 w-8` activo, `h-2.5 w-2.5` inactivos; botones `w-10 h-10 rounded-lg` (sin `brutal-hover`, solo `brutal-press`).

**Implementación**: usar `embla-carousel-react` (ya en `landing-spec.md`). Sin auto-advance.

### 6.8 CTA final

```html
<section class="px-6 pb-24">          <!-- desktop -->
  <div class="reveal max-w-5xl mx-auto bg-yellow brutal-lg rounded-3xl p-12 lg:p-16 text-center relative">
    <div class="checker absolute inset-3 rounded-2xl opacity-[0.04] pointer-events-none"></div>
    <div class="relative">
      <h2 class="font-display font-black text-5xl lg:text-6xl leading-[0.95]">
        ¡Tu próxima mesa <br/> está a un <span class="bg-red text-white px-3 rounded-md">clic</span>!
      </h2>
      <p class="mt-5 text-lg font-medium max-w-xl mx-auto">Regístrate gratis y empieza a apuntarte. Sin tarjeta. Sin compromiso. Sin esperas.</p>
      <a href="/register" class="mt-8 inline-flex items-center gap-2 bg-ink text-cream font-display font-bold text-lg px-8 py-4 rounded-xl brutal brutal-hover brutal-press">
        Crear cuenta gratis
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
    </div>
  </div>
</section>
```

Mobile:
```html
<section class="px-4 pb-28">    <!-- pb-28 para dejar espacio al tabbar -->
  <div class="reveal bg-yellow brutal-lg rounded-2xl p-7 text-center">
    <h2 class="font-display font-black text-3xl leading-[0.95]">
      ¡Tu próxima mesa <br/> a un <span class="bg-red text-white px-2 rounded">clic</span>!
    </h2>
    <p class="mt-3 text-sm font-medium">Sin tarjeta. Sin compromiso.</p>
    <a href="/register" class="mt-5 inline-flex items-center justify-center gap-2 bg-ink text-cream font-display font-bold text-base px-6 py-3 rounded-xl brutal brutal-press w-full">
      Crear cuenta gratis
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
    </a>
  </div>
</section>
```

Sin `.checker` en mobile (poco visible, ahorro de complejidad).

### 6.9 Footer (desktop only en esta landing)

```html
<footer class="bg-ink text-cream border-t-4 border-ink">
  <div class="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
    <!-- Brand block -->
    <div class="col-span-2 lg:col-span-1">
      <div class="flex items-center gap-2 mb-3">
        <span class="w-9 h-9 bg-red rounded-md font-display font-black text-lg flex items-center justify-center brutal-sm">M</span>
        <span class="font-display font-black text-xl">matchplay<span class="text-red">.</span></span>
      </div>
      <p class="text-cream/70">Tira el dado. Mueve ficha. Juega ya.</p>
    </div>
    <!-- 3 columnas con headings "Producto", "Empresa", "Legal" -->
    <div>
      <p class="font-display font-bold mb-3 uppercase tracking-wider">Producto</p>
      <ul class="space-y-2 text-cream/70">…</ul>
    </div>
    …
  </div>
  <div class="border-t border-cream/15">
    <div class="max-w-7xl mx-auto px-6 py-5 text-xs text-cream/60 flex items-center justify-between font-brutal uppercase tracking-widest">
      <span>© 2026 Matchplay</span>
      <span>Hecho a mano en España</span>
    </div>
  </div>
</footer>
```

En mobile: el footer **no se renderiza**. Se sustituye por la TabBar (6.10).

### 6.10 Bottom tab bar (mobile only)

```html
<nav class="tabbar px-3 pb-3 pt-2 z-30 bg-transparent" aria-label="Navegación principal">
  <div class="bg-cream brutal-lg rounded-2xl px-2 py-2 flex items-center justify-around">
    <!-- 5 items -->
    <button class="flex flex-col items-center gap-0.5 text-red">          <!-- activo -->
      <svg width="22" height="22" …>…</svg>
      <span class="text-[10px] font-bold uppercase tracking-wider">Inicio</span>
    </button>
    <button class="flex flex-col items-center gap-0.5 text-mute">         <!-- inactivo -->
      …
      <span>Explorar</span>
    </button>
    <button class="flex flex-col items-center -mt-6" aria-label="Crear partida">
      <span class="w-[52px] h-[52px] rounded-xl bg-red text-white flex items-center justify-center brutal-lg">
        <svg width="24" height="24" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
      </span>
    </button>
    <button>… Mis partidas …</button>
    <button>… Cuenta …</button>
  </div>
</nav>
```

CSS:
```css
.tabbar { position: sticky; bottom: 0; }
```

**Items**: Inicio, Explorar, **+** (crear, flotante), Mis partidas, Cuenta. El botón central usa `-mt-6` para asomar por encima del container. Solo visible para **GUEST** dirige a `/register` (los botones inactivos pueden redirigir a `/sessions` el de Explorar, los demás a `/register`).

## 7 · Accesibilidad

| Tema | Implementación |
|------|----------------|
| Focus visible | Outline azul `rgb(var(--p-blue))` 3px con offset 3px en todos los elementos brutal. Definido en globals.css. |
| Etiquetas form | `<label class="sr-only" for="prov">Provincia</label>` etc. — el `sr-only` ya está en globals.css. |
| Botones icon-only | `aria-label` obligatorio en chevrons del carousel, hamburger menu, botón +. |
| Marquees | Container `aria-hidden="true"` en la segunda copia del contenido (la primera mantiene texto leíble). El usuario de lector de pantalla ve los stats UNA vez. |
| Reduced motion | `prefers-reduced-motion: reduce` desactiva marquee, dice-roll, pop-in, float, wiggle y revela todo de golpe. |
| Color como única señal | El badge "Abierto" trae el `●` antes del texto. El sticker "Sin registro" trae 👀. No hay distinción solo por color. |
| Contraste | red/blue/green sobre white pasan WCAG AA en regular text (16px+). Yellow sobre white **NO** — yellow siempre lleva `text-ink` (foreground oscuro), nunca text-white. |
| Touch targets mobile | Todos los botones ≥ 44px (verificado: avatares 32px, pero no son interactivos; CTAs 48-56px). |

## 8 · Responsive y breakpoints

| Breakpoint | Tailwind | Comportamiento |
|------------|----------|----------------|
| `< 768px` | (default) | Mobile layout: stack vertical, header sticky con menu, tabbar visible, footer oculto, sticker hero oculto |
| `≥ 768px` (`md:`) | mid | QuickSearch grid 4-cols, discovery 3-cols, footer 4-cols |
| `≥ 1024px` (`lg:`) | desktop | Hero 2-cols (7/5), TrustStrip 3-cols horizontal, Community 2-cols con mini card, sticker hero visible, H1 `text-[7rem]`, headings `text-6xl`, padding mayores |

**Container max-widths**:
- Header / footer / marquee outer: `max-w-7xl` (1280px)
- Trust strip / discovery / community / CTA: `max-w-6xl` (1152px)
- Hero subtítulo / CTA copy: `max-w-xl` (576px) interno

**Padding horizontal**:
- Mobile: `px-4` (16px)
- Desktop: `px-6` (24px)

**Padding vertical entre secciones**:
- Mobile: `pb-8` (32px) por sección
- Desktop: `pb-24` (96px) por sección, hero `pt-16 pb-24`, community `py-24`

## 9 · Animaciones — resumen

| Animación | Duración | Easing | Uso |
|-----------|----------|--------|-----|
| `marquee` | 22s desktop / 18s mobile | linear, infinite | Top strip, games strip |
| `dice-roll` | 3s | ease-in-out, infinite | Emoji 🎲 en H1 |
| `pop-in` | 0.65s | `cubic-bezier(.5,1.6,.4,1)`, once | Sticker "Sin registro" |
| `wiggle` | 0.5s | ease-in-out, on hover | Card session preview hero (desktop) |
| `float` | 5s | ease-in-out, infinite | Card session preview + community mini card |
| `reveal` | 0.8s | `cubic-bezier(.2,.7,.2,1)`, once | Todas las secciones al entrar viewport |
| `brutal-hover` | 0.18s | ease | Cards / botones (desktop only en cards) |
| `pulse` (tailwind built-in) | 2s | infinite | Dot verde del chip eyebrow |

**Reveal trigger**: `IntersectionObserver` con `threshold: 0.12`, `unobserve` al activar. En mobile el observer usa `root: phoneScreen` (en producción será `root: null` → viewport).

```ts
// frontend/src/features/landing/hooks/useRevealOnScroll.ts
useEffect(() => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  return () => io.disconnect();
}, []);
```

## 10 · Assets

### 10.1 Fuentes Google

```
Bricolage Grotesque (500, 600, 700, 800, 900)   — ya en proyecto
Inter (400, 500, 600, 700)                       — ya en proyecto
Space Mono (400, 700)                            — NUEVA
```

### 10.2 Iconos SVG inline

Todos los iconos son SVG inline (no react-icons / lucide-react). Convención:
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`
- `stroke-width="2.5"` para iconos en cards (más bold, encaja el estilo)
- `stroke-width="2.2"` + `stroke-linecap="round"` + `stroke-linejoin="round"` para `users-round`
- `stroke-width="3"` para chevrons de carousel y flechas de CTA
- Tamaños: 18px (inline en CTAs), 20px (cards stats), 22px (mobile cards), 24px (tabbar +), 28px (desktop cards)

**Catálogo de iconos usados**:

| Uso | SVG d-path |
|-----|------------|
| Lupa (search) | `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>` |
| Flecha derecha (CTAs) | `<path d="M5 12h14M13 5l7 7-7 7"/>` |
| Check circle (partidas activas) | `<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>` |
| Users-round (jugadores) | `<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>` |
| Map pin (ciudades) | `<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/>` |
| Dice/grid (descubre) | `<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="16" r="1.5"/><circle cx="12" cy="12" r="1.5"/>` |
| Plus circle (organiza) | `<circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>` |
| Chevron left / right | `<path d="M15 18l-6-6 6-6"/>` / `<path d="M9 6l6 6-6 6"/>` |
| Hamburger | `<path d="M4 6h16M4 12h16M4 18h16"/>` |
| Home (tabbar) | `<path d="M3 11l9-8 9 8M5 10v10h14V10"/>` |
| Refresh/history (tabbar) | `<path d="M21 11.5a9 9 0 1 1-3.6-7.2L21 6"/><path d="M21 3v5h-5"/>` |
| User (tabbar) | `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>` |
| Plus (tabbar +) | `<path d="M12 5v14M5 12h14"/>` |

### 10.3 Emoji

- `🎲` en H1 dentro de `.dice` (animado)
- `👀` en sticker desktop "Sin registro pa' mirar"

**Sin emojis como iconos de UI**. Solo decorativos en copy.

## 11 · Mapeo a componentes React

Estructura propuesta en `frontend/src/features/landing/components/`:

```
landing/
├── pages/LandingPage.tsx                  # ya existe — sólo cambia el contenido renderizado
├── components/
│   ├── LandingContent.tsx                 # orquestador (ya existe — restructurar)
│   ├── TopStrip.tsx                       # NUEVO — marquee superior con stats
│   ├── SiteHeader.tsx                     # ya existe (header global) — sin cambios estructurales
│   ├── Hero.tsx                           # restructurar a brutalist
│   ├── QuickSearch.tsx                    # restructurar a brutalist
│   ├── HeroSessionPreview.tsx             # restructurar (sticker card + dgrid)
│   ├── TrustStrip.tsx                     # restructurar (3 cards brutal con rotación)
│   ├── DiscoveryCards.tsx                 # restructurar (3 cards brutal yellow/green/red)
│   ├── GamesMarquee.tsx                   # NUEVO — banner negro con marquee de juegos
│   ├── CommunityCarousel.tsx              # restructurar (sin cambios funcionales)
│   ├── CtaFinal.tsx                       # NUEVO — sección amarilla CTA
│   # MobileTabBar.tsx → MOVIDO a `app/layouts/MobileTabBar.tsx` (D10):
│   # es global, no específico de la landing. Se monta desde MainLayout.
├── hooks/
│   ├── usePublicStatsQuery.ts             # ya existe
│   └── useRevealOnScroll.ts               # NUEVO — IntersectionObserver
└── styles/
    └── landing-brutal.css                 # OPCIONAL — si las primitivas no caben en globals.css
```

### Detalles por componente

| Componente | Props | Notas |
|------------|-------|-------|
| `<TopStrip />` | `stats: PublicStats` (opcional, fallback cacheado) | Render condicional: si error y no cache, no renderizar |
| `<Hero />` | sin props | Lee i18n. Monta sticker desktop con `hidden lg:inline-flex` |
| `<QuickSearch />` | sin props | Idéntica lógica a la actual. Estilos brutal en select/input/button |
| `<HeroSessionPreview />` | sin props | Hardcoded de i18n. Detectar `prefers-reduced-motion` para desactivar wiggle desktop |
| `<TrustStrip />` | sin props | Hook `usePublicStatsQuery()`. Loading → 3 skeleton brutal-lg. Error → `null` |
| `<DiscoveryCards />` | sin props | 3 cards estáticas. No links al final. |
| `<GamesMarquee />` | `games?: string[]` (default = 8 hardcoded desktop, 5 mobile) | Renderizar bloque interno duplicado, segundo con `aria-hidden="true"` |
| `<CommunityCarousel />` | sin props | embla-carousel-react. Slides hardcoded de i18n (3). |
| `<CtaFinal />` | sin props | Link a `/register`. Decoración `.checker` solo `lg:` |
| `<MobileTabBar />` | sin props | Tailwind `md:hidden`. Estado activo = `usePathname()` actual |

### Mapeo de display

```tsx
// LandingContent.tsx
export function LandingContent() {
  useRevealOnScroll();
  return (
    <>
      <TopStrip />
      {/* SiteHeader ya está en MainLayout */}
      <Hero />
      <TrustStrip />
      <DiscoveryCards />
      <GamesMarquee />
      <CommunityCarousel />
      <CtaFinal />
      <LandingFooter />
      {/* MobileTabBar NO va aquí: la monta MainLayout (D10) */}
    </>
  );
}
```

**MainLayout responsabilidades**:
- Renderiza `<MobileTabBar />` siempre (todas las rutas) al final del layout.
- Oculta `<SiteHeader>` en `/` (la landing usa `<LandingHeader>` propio).
- Oculta el footer global simple en mobile (`hidden md:block`) — la tabbar ocupa esa zona.

## 12 · i18n — claves nuevas

```json
{
  "landing.topStrip.items": [
    "★ 142 partidas abiertas",
    "★ 387 jugadores",
    "★ 24 ciudades activas",
    "★ Es gratis. Siempre.",
    "★ Tu mesa, tu turno"
  ],
  "landing.hero.eyebrow": "Hay 142 mesas abiertas YA",
  "landing.hero.eyebrowMobile": "142 mesas abiertas YA",
  "landing.hero.title": "Tira el dado.|Mueve <1>ficha</1>.|<3>Juega <2>🎲</2> ya.</3>",
  "landing.hero.subtitle": "Partidas de juegos de mesa con gente <1>cerca de ti</1>. Sin grupos privados, sin esperar mensaje de nadie.",
  "landing.hero.sticker": "Sin registro pa' mirar 👀",
  "landing.cta.explore": "Explorar partidas",
  "landing.cta.register": "Crear cuenta",
  "landing.quickSearch.placeholder": "¿A qué te apetece jugar?",
  "landing.quickSearch.submit": "¡Buscar!",
  "landing.discovery.eyebrow": "// Cómo va //",
  "landing.discovery.heading": "Tres formas. <1>Cero excusas.</1>",
  "landing.discovery.cards.0.title": "Encuentra jugadores",
  "landing.discovery.cards.0.body":  "Filtra por provincia, ciudad y juego favorito. Sin redes sociales. Sin mensajes que nadie lee.",
  "landing.discovery.cards.1.title": "Descubre partidas abiertas",
  "landing.discovery.cards.1.body":  "142 mesas con plazas libres hoy. Pulsa \"Apúntame\" y listo.",
  "landing.discovery.cards.2.title": "Organiza quedadas",
  "landing.discovery.cards.2.body":  "Crea tu mesa, define plazas, juego y fecha. La comunidad se apunta sola.",
  "landing.community.eyebrow": "// La comunidad //",
  "landing.community.heading": "Mesas que pasan <1>ahora</1>.",
  "landing.cta.final.heading": "¡Tu próxima mesa <br/> está a un <1>clic</1>!",
  "landing.cta.final.body": "Regístrate gratis y empieza a apuntarte. Sin tarjeta. Sin compromiso. Sin esperas.",
  "landing.cta.final.button": "Crear cuenta gratis"
}
```

**Regla**: usar `<Trans>` con placeholders `<1>`, `<2>`, `<3>` para los spans destacados. Nunca splitear strings en TypeScript. (Ya documentado en `landing-spec.md` global.)

## 13 · Anti-patrones — qué NO hacer

| ❌ | ✅ |
|----|----|
| Usar `bg-yellow text-white` (yellow + white falla contraste) | `bg-yellow text-ink` siempre |
| Aplicar `brutal-hover` en cards mobile | Solo `brutal-press` en mobile (es táctil, no hay puntero) |
| Apilar `transform` con `rotate-1` + `brutal-hover` sin transition-property explícita | Si combinas rotación + hover, define `transition: transform 180ms ease, box-shadow 180ms ease` y aplica la rotación con CSS no Tailwind para evitar conflicto |
| Emojis como iconos de UI (❌ 🎲 en botones, ⚙️ en menús) | SVG inline, emojis solo decorativos en copy de hero |
| `rgb(var(--p-yellow))` como texto sobre background-alt | El amarillo siempre como background, nunca como texto principal |
| Renderizar 2 marquees idénticos sin `aria-hidden` en el segundo | Primero leíble, segundo `aria-hidden="true"` |
| `rgb(...)` directos en componentes | Usar variables CSS / clases Tailwind del config |
| Aplicar el patrón `.landing-bg` global al `<body>` | Aplicar solo al wrapper de la landing — otras páginas (sessions, profile) NO lo necesitan |

## 14 · Out of scope / próximos pasos

| Tema | Estado |
|------|--------|
| Dark mode brutal | Diferido — requiere repensar las cards de color sólido |
| Auto-advance del community carousel | Decidido NO (accesibilidad) |
| Replace de paleta global afecta otras páginas | **Decisión D7** — aplica globalmente. Ver §17 *Plan de migración global*. |
| Mobile menu (hamburger) overlay | Pendiente — el botón está, falta el panel desplegable. Reutilizar `<MobileMenu>` ya existente si encaja, o crear `<LandingMobileMenu>` con las mismas opciones |
| Animación al hover de los dice grid cells | Diferido (idea: las celdas cambian de color en cascada al hover de la card) |

## 15 · Checklist de implementación

Orden sugerido:

- [ ] **Tokens**: actualizar `frontend/src/styles/tokens.css` con la paleta saturada (sección 3.1). Comprobar en `/sessions` y `/profile` que nada se rompe visualmente.
- [ ] **Tailwind**: extender `tailwind.config.ts` con fontFamily.brutal, boxShadow brutal*, keyframes, animations (sección 3.2).
- [ ] **Space Mono**: añadir el preload de Google Fonts a `index.html` (sección 3.3).
- [ ] **Globals**: añadir las primitivas a `frontend/src/styles/globals.css` dentro de `@layer components` (sección 4). Verificar que `.brutal` se puede usar como utility class.
- [ ] **Hook**: crear `useRevealOnScroll()`.
- [ ] **Componentes** en orden: `TopStrip` → `Hero` → `QuickSearch` → `HeroSessionPreview` → `TrustStrip` → `DiscoveryCards` → `GamesMarquee` → `CommunityCarousel` → `CtaFinal` → `MobileTabBar`.
- [ ] **i18n**: añadir las claves de la sección 12. Pasar `<Trans>` por todos los spans destacados.
- [ ] **LandingContent**: orquestar componentes en orden (sección 11).
- [ ] **MainLayout**: ocultar `<SiteFooter>` con `hidden md:block` y dar `pb-24 md:pb-0` al `<main>` para no chocar con la TabBar mobile.
- [ ] **Tests**: actualizar `LandingPage.test.tsx`, `QuickSearch.test.tsx`, `TrustStrip.test.tsx`, `DiscoveryCards.test.tsx`. Smoke test de `GamesMarquee`, `CtaFinal`, `MobileTabBar`.
- [ ] **A11y**: lighthouse, ojo a contraste yellow + foreground.
- [ ] **Reduced motion**: probar con `Toggle: prefers-reduced-motion` en DevTools.

## 16 · Plan de migración global

Decisión D7: la estética brutal se aplica a **toda** la app. Esto NO se hace en la misma sesión que la landing — se rollouea por capas para minimizar regresiones.

### 16.1 Fases

| Fase | Objetivo | Riesgo |
|------|----------|--------|
| **F0 · Foundations** | Tokens + Tailwind + Space Mono + primitivas en globals.css (§3 y §4). Sin tocar componentes existentes. | Bajo — solo cambian valores de variables; los componentes actuales seguirán renderizando con los colores nuevos (más saturados) pero sin las primitivas `.brutal*` aplicadas todavía. |
| **F1 · Landing** | Rediseño completo de `features/landing/` según este spec. Validar tokens en producción. | Medio — landing es alta visibilidad. |
| **F2 · Shell global** | `SiteHeader`, `SiteFooter`, `MobileMenu`, `UserMenu`, `Avatar`, `Button` (shared) migrados a brutal. | Alto — el header está en todas las pantallas autenticadas. |
| **F3 · Sessions** | `/sessions` list (cards de sesión, filtros, paginación) + `/sessions/:id` (detail page editorial). | Alto — núcleo del producto. Cards de sesión tienen 4 estados visuales que hay que verificar. |
| **F4 · Mis sesiones** | `/sessions/mine` (4 tabs + tabla histórico). | Medio. |
| **F5 · Perfil** | `/profile` (avatar picker, bio, favoritos, ubicación, password). | Medio. |
| **F6 · Auth** | `/login`, `/register`, password reset, verify-email. | Bajo — pantallas simples. |
| **F7 · Cleanup** | Quitar estilos legacy (`shadow-card-hover` antiguo, `bg-card` que ya no se usa, etc.). | Bajo. |

### 16.2 Impacto de F0 en la app actual (preview)

Al cambiar `tokens.css` los colores semánticos `red`, `blue`, `green`, `yellow` cambian:

| Token | Antes | Después | Lugares afectados (no exhaustivo) |
|-------|-------|---------|-----------------------------------|
| `--p-red` | `rgb(200 54 44)` | `rgb(230 57 70)` | Botones primary, badge "Tu Partida", cinta lateral de cards, números de stats |
| `--p-blue` | `rgb(31 111 178)` | `rgb(46 134 222)` | Stats jugadores, links secundarios, badge azul de chat |
| `--p-green` | `rgb(47 143 79)` | `rgb(6 167 125)` | Badge "Abierto", botón éxito, indicador de sesión abierta |
| `--p-yellow` | `rgb(232 169 59)` | `rgb(255 190 11)` | Avatares con inicial, cards discovery |
| `--foreground` | `rgb(31 26 20)` | `rgb(14 14 12)` | Todo el texto principal — más negro |
| `--background` | `rgb(250 246 238)` | `rgb(251 246 232)` | Fondo de la app (cambio sutil, más cálido) |

**Antes de mergear F0** comprobar en local:
- `/sessions` — que las cards de sesión sigan legibles con los nuevos rojos/verdes
- `/profile` — avatares amarillos no deben quedar amarillo-fluorescente sobre el header
- `/sessions/:id` — el botón "Apúntame" y el badge de estado mantienen contraste
- Cualquier sitio donde aparezca `text-yellow` (debería ser cero — yellow es siempre background, ver §13)

Si algo se rompe en F0 (poco probable, solo cambia tonos), ajustar los valores antes de pasar a F1.

### 16.3 Impacto de F1 en `MainLayout`

Cuando se merge F1, `MainLayout` necesita estos ajustes:
- Aplicar `landing-bg` class al wrapper cuando la ruta es `/`.
- Ocultar `<SiteFooter>` con `hidden md:block` (en mobile el footer ya no existe — la TabBar hace su rol).
- `<main>` con `pb-24 md:pb-0` para no chocar con la TabBar mobile.
- Mantener `<SiteHeader>` actual hasta F2 (será reemplazado por el header brutal de la landing una vez F2 cierre).

**Decisión transitoria**: durante F1, la landing usa su **propio** header brutal interno (no `<SiteHeader>`), porque el SiteHeader actual no encaja. En F2 se unifica: el SiteHeader brutal nuevo reemplaza tanto al de la landing como al del resto de la app.

### 16.4 Espera, ¿hay regresión visual?

La paleta saturada puede romper expectativas visuales en algunas pantallas. Mitigaciones:
- Capturas antes/después de cada fase (Storybook o screenshots manuales) — guardar en `docs/visual-regression/` por si hay que volver atrás.
- Si una pantalla queda visualmente fea con los nuevos tonos y no es prioritaria, escope local con `.legacy-soft` (clase wrapper que restaura los rgb antiguos) hasta su fase correspondiente.

## 17 · Patrones reutilizables para nuevas pantallas

Esta sección es la **chuleta canónica** cuando construyas una pantalla nueva. Todos los patrones se basan en las primitivas de §4 y los tokens de §3 — no inventes variantes nuevas sin pasar por el sistema.

### 17.1 Section header (eyebrow + heading)

```jsx
<div className="reveal mb-5 md:mx-auto md:mb-14 md:max-w-3xl md:text-center">
  <span className="brutal-sm mb-3 inline-block rounded-md bg-foreground px-2 py-0.5 font-brutal text-[10px] font-bold uppercase tracking-widest text-background md:mb-5 md:px-4 md:py-1.5 md:text-base">
    // Etiqueta de sección //
  </span>
  <h2 className="font-display text-3xl font-black leading-[0.95] md:text-5xl lg:text-6xl">
    Tu título. <span className="rounded bg-red px-2 text-background md:rounded-md md:px-3">Acento</span>
  </h2>
</div>
```

- Eyebrow: `bg-foreground` (tabbar/secundario), `bg-red` (críticos), `bg-blue` (informativos), `bg-yellow text-foreground` (highlights).
- Heading: `font-display font-black leading-[0.95]` — escalas `text-3xl md:text-5xl lg:text-6xl` (h2) o `text-[44px] md:text-[5.5rem] lg:text-[7rem]` (h1 hero).
- `<span class="rounded bg-{color}">` para resaltar palabra. Si necesita poco más de aire usa `bg-yellow` que activa también el patrón `.stamp` con sombra (ver §4).

### 17.2 Card colorida (TrustStrip-style)

Para cards que muestran datos asíncronos:

```jsx
<div className={`brutal-lg md:brutal-hover relative animate-fade-up rounded-2xl p-4 text-white md:p-7 ${bg}`}>
  {/* Mobile: label+number izda, icon dcha */}
  <div className="flex items-center justify-between md:hidden">…</div>
  {/* Desktop: label+icon arriba, number XXL, caption */}
  <div className="hidden md:block">…</div>
</div>
```

- **`animate-fade-up`** (no `.reveal`) para contenido que llega tras una query — evita el bug de invisibilidad si el observer ya cerró (D9).
- **`text-white`** (no `text-background`) sobre colores saturados — el cream queda apagado y rompe el contraste cartoon-sticker.
- **`bg-white`** (no `bg-background`) para los icon-box internos — mismo motivo.
- Sin `rotate-{n}` estática a menos que el diseño explícitamente lo pida.

### 17.3 Card estática (DiscoveryCards-style)

```jsx
<article className={`reveal brutal-lg group rounded-2xl p-5 md:p-7 md:brutal-hover ${bg} ${textColor}`}>
  <div className="mb-3 flex items-center justify-between md:mb-5">
    <span className="font-brutal text-xl font-black md:text-2xl">01.</span>
    <div className="brutal flex size-11 items-center justify-center rounded-lg bg-background text-foreground transition-transform md:size-14 md:rounded-xl group-hover:-rotate-12">
      <Icon size={22} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </div>
  </div>
  <h3 className="font-display text-xl font-black leading-tight md:mb-3 md:text-2xl">…</h3>
  <p className="mt-2 text-sm font-medium leading-relaxed md:mt-0 md:text-base">…</p>
</article>
```

- **`.reveal`** OK aquí (montaje sincrónico).
- `md:brutal-hover` (no en mobile) — hover táctil no aporta.
- Icon-box con `brutal` (no `brutal-sm`) para que pese visualmente.

### 17.4 Mini-card sticker (Community-mini, Hero-preview)

```jsx
<div className="brutal-drop-lg mx-auto max-w-[280px] animate-float rounded-xl bg-background-alt p-4 md:max-w-none md:rotate-[3deg] md:rounded-2xl md:p-5">
  …
</div>
```

- **`brutal-drop-lg`** (no `brutal-lg`) — esquina exterior del shadow redondeada (§4).
- **`animate-float`** — flota arriba/abajo + inclina derecha (+4°/+2°).
- Mobile constrain con `max-w-[280px]`. Desktop libera + añade rotación estática (la animación overridea pero asegura "salto" mínimo al pausar con reduced-motion).

### 17.5 Botón brutal

```jsx
{/* CTA principal */}
<Link className="brutal brutal-press md:brutal-hover inline-flex items-center justify-center gap-2 rounded-xl bg-red px-7 py-3.5 text-center font-display text-base font-bold text-background md:py-4 md:text-lg">
  Texto del botón
  <ArrowRight size={18} strokeWidth={3} className="md:size-[22px]" />
</Link>

{/* Secundario */}
<Link className="brutal brutal-press md:brutal-hover inline-flex items-center justify-center gap-2 rounded-xl bg-background px-7 py-3.5 text-center font-display text-base font-bold text-foreground md:py-4 md:text-lg">
  Texto
</Link>
```

- Stroke-width SVG: 3 en CTA primario (más bold), 2.5 en secundario.
- `brutal-press` mobile, `brutal-hover` desktop. NUNCA combinar `brutal-drop*` + `brutal-hover` (el hover cambia box-shadow, no filter).

### 17.6 Form fields brutal

```jsx
<form className="brutal-lg rounded-2xl bg-background p-3 md:p-4">
  <select className="brutal-inner w-full rounded-lg bg-white px-3 py-2.5 font-bold text-sm">…</select>
  <input className="brutal-inner w-full rounded-lg bg-white px-3 py-2.5 font-bold text-sm placeholder:font-medium placeholder:text-muted-foreground" />
  <button className="brutal-sm brutal-press md:brutal-hover bg-foreground text-background rounded-lg py-3 font-display font-bold">…</button>
</form>
```

- **`bg-white`** en los fields (no `bg-card`) — el cream queda confuso sobre crema.
- Selects: el chevron custom con padding ya viene en `select.brutal-inner` global (§4).

### 17.7 Section padding rhythm

| Viewport | Sección normal | Hero | Marquees |
|----------|----------------|------|----------|
| Mobile | `px-4 pb-8` | `px-4 pt-6 pb-8` | `py-3 mb-8` (banda completa edge-to-edge) |
| Desktop | `px-6 pb-24` | `px-6 pt-16 pb-12` | `py-5` |

Containers internos: `max-w-7xl` (header/footer/marquee), `max-w-6xl` (resto), `max-w-xl` (subtitles).

### 17.8 Animations cheatsheet

| Animación | Cuándo usar | Cuándo NO |
|-----------|-------------|-----------|
| `animate-fade-up` | Contenido que aparece tras query async (cards de stats, slides paginados, mini-items dinámicos) | Decorativos o componentes pesados — usa `.reveal` |
| `.reveal` | Componentes presentes en mount inicial (heros, secciones estáticas) | Cualquier cosa cuyo DOM se monte tarde — el observer ya cerró |
| `animate-float` | Stickers protagonistas (max 2 por pantalla — más es ruido) | Cualquier elemento con texto largo de leer |
| `animate-dice-roll` | Decoración icónica (🎲 del H1) | Iconos funcionales — distrae |
| `animate-pop-in` | Stickers de entrada (1 vez al cargar) | Loops |
| `animate-wiggle` | Hover desktop opcional (HeroSessionPreview) | Mobile (táctil) |
| `animate-marquee` (22s) | Banners horizontales desktop | — |
| `animate-marquee-mobile` (18s) | Banners horizontales mobile (mismos contenidos, más rápido) | — |

### 17.9 Errores comunes a evitar

1. **`text-background` sobre `bg-red`/`bg-blue`/`bg-green`** → desvaído. Usa `text-white`.
2. **`yellow + text-white`** → contraste fail. Yellow siempre `text-foreground`.
3. **`.reveal` en async data** → cards invisibles. Usa `animate-fade-up`.
4. **`brutal-hover` en mobile** → hover táctil no aporta y choca con `brutal-press`. `md:brutal-hover` solo.
5. **`brutal-drop*` + `brutal-hover`** → el hover cambia `box-shadow` pero la sombra está en `filter`. Conflicto, se ve raro. Sin hover en drop.
6. **`overflow-hidden` envolviendo cards con `brutal-lg`** → el shadow se recorta. Añade `pb-3 pr-3` (o más, depende del offset) al wrapper para dar room.
7. **Rotaciones estáticas + `animate-float`** sin coherencia de signo → al pausar con reduced-motion el card "salta". Si el float es `rotate(4deg)`, la estática debe ser `rotate-{n}` positivo.
8. **Marquee sin duplicación** → al llegar al final aparece corte. El segundo bloque debe llevar `aria-hidden="true"`.

## 18 · Referencias

- Mockup desktop: `mockups/concept-B-brutalist-desktop.html`
- Mockup mobile: `mockups/concept-B-brutalist-mobile.html`
- Spec landing original (estructura de archivos y comportamiento): `docs/frontend/modules/landing-spec.md`
- Tokens actuales: `frontend/src/styles/tokens.css`
- Tailwind config: `frontend/tailwind.config.ts`
- Endpoint stats: `GET /api/v1/stats/public` (sección 6.4)
