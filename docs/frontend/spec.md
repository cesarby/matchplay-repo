# Frontend — Spec Orquestador

> React 18 · Vite 5 · **TypeScript** · Tailwind CSS · shadcn/ui · React Router v6
> · TanStack Query v5 · Zustand · react-i18next · react-helmet-async · Axios

Referencia global: [../spec.md](../spec.md)

---

## Specs de módulos

| Módulo | Archivo | Estado |
|--------|---------|--------|
| Landing pública (`/`) | [modules/landing-spec.md](modules/landing-spec.md) | Definido + implementado |
| Auth (cliente) | [modules/auth-spec.md](modules/auth-spec.md) | Definido + implementado |
| Partidas (sessions) | [modules/sessions-spec.md](modules/sessions-spec.md) | Definido + implementado (Fase 1 + 1.1) |
| Búsqueda de juegos | [modules/games-spec.md](modules/games-spec.md) | Definido + implementado (typeahead BGG) |
| Perfil de usuario | [modules/users-spec.md](modules/users-spec.md) | Pendiente |
| Panel Admin | [modules/admin-spec.md](modules/admin-spec.md) | Pendiente |

---

## Stack y decisiones cerradas

| Área | Decisión | Razón breve |
|------|----------|-------------|
| Lenguaje | **TypeScript estricto** (`strict: true`) | DX, refactor seguro, alineado con backend tipado |
| Bundler / dev server | **Vite 5** | Ya está, no cambia |
| UI base | **shadcn/ui + Tailwind** | Ya en spec original |
| Iconos | **lucide-react** | Tree-shakeable, integrado en shadcn |
| Routing | **React Router v6** (no Remix loaders) | SPA puro, datos vía TanStack Query |
| Estado de servidor | **TanStack Query v5** | Cache + dedupe + retry + sync background |
| Estado de cliente | **Zustand** | Sin providers anidados, tipado, pequeño |
| Formularios | **react-hook-form + zod** | Tipado end-to-end |
| HTTP | **Axios** | Interceptors fáciles, `withCredentials: true` (cookies) |
| i18n | **react-i18next** desde el inicio, **selector manual** de idioma (no detección automática) | Usuario elige idioma |
| Auth storage | **Access token en memoria (Zustand) + refresh token en cookie httpOnly Secure SameSite=Strict** (requiere refactor del backend) | Defensa real contra XSS |
| SEO | **react-helmet-async + pre-rendering en build + JSON-LD + sitemap + robots + Lighthouse CI** | Desde el día 1 |
| Dark mode | **Sí en v1** (Tailwind `dark:` + Zustand `themeStore`) | |
| Estructura | **Feature-based desde el inicio** | Escala sin reorganizar después |
| Testing | **Vitest + React Testing Library + MSW + vitest-axe** desde el día 1 | TDD donde aplique |
| Pre-rendering | **vite-plugin-prerender (o `prerender.io` equivalente)** para rutas públicas | Crawlers no-Google y redes sociales |

---

## Variables de entorno

Vite expone al cliente solo las que empiezan por `VITE_`. **Nunca poner secretos.**

```
frontend/
├── .env                  # base (commitable, valores comunes)
├── .env.development      # commitable, sin secretos
├── .env.production       # commitable, sin secretos
├── .env.local            # gitignored, override local
└── .env.example          # commitable, plantilla
```

Variables:

```
VITE_API_BASE_URL=/api/v1     # en dev usa el proxy de Vite a localhost:8080
VITE_APP_NAME=Matchplay
VITE_APP_URL=http://localhost:5173
VITE_DEFAULT_LOCALE=es
VITE_SUPPORTED_LOCALES=es,en
VITE_ENV=development          # development | staging | production
```

---

## Estructura de carpetas (feature-based)

Cada **feature** es autocontenida: sus componentes, hooks, api client, store, tipos, tests viven juntos. Se mueve sin romper otras.

```
frontend/src/
├── app/                          # Composición de la aplicación
│   ├── App.tsx                   # Root con providers
│   ├── router.tsx                # Definición de rutas + lazy
│   ├── providers/
│   │   ├── QueryProvider.tsx     # TanStack Query
│   │   ├── ThemeProvider.tsx     # dark/light
│   │   ├── I18nProvider.tsx      # react-i18next
│   │   └── HelmetProvider.tsx    # SEO
│   └── layouts/
│       ├── MainLayout.tsx
│       ├── AuthLayout.tsx
│       └── AdminLayout.tsx
│
├── features/                     # Una carpeta por dominio funcional
│   ├── auth/
│   │   ├── api/authApi.ts
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts        # hook que expone authStore
│   │   │   ├── useLoginMutation.ts
│   │   │   └── useCurrentUserQuery.ts
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── store/authStore.ts    # Zustand: usuario actual, accessToken en memoria
│   │   ├── types/auth.types.ts
│   │   ├── guards/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── RoleRoute.tsx
│   │   └── __tests__/
│   │
│   ├── sessions/                 # partidas
│   │   ├── api/sessionsApi.ts
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── types/
│   │   └── __tests__/
│   │
│   ├── games/                    # búsqueda de juegos (BGG)
│   │   └── ...
│   │
│   ├── users/                    # perfil del usuario
│   │   └── ...
│   │
│   └── admin/
│       └── ...
│
├── shared/                       # Reutilizable cross-feature
│   ├── ui/                       # shadcn/ui generados
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── components/               # componentes propios cross-feature
│   │   ├── EmptyState.tsx
│   │   ├── PageHeader.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── SeoHead.tsx
│   ├── hooks/                    # hooks genéricos
│   │   ├── useDebounce.ts
│   │   └── usePagination.ts
│   ├── api/                      # cliente axios base + tipos compartidos
│   │   ├── httpClient.ts         # axios instance con interceptors
│   │   ├── ApiError.ts
│   │   └── PageResponse.ts
│   ├── lib/                      # utilidades
│   │   ├── cn.ts                 # className merge
│   │   ├── dates.ts
│   │   └── formatters.ts
│   ├── i18n/
│   │   ├── i18n.ts               # config react-i18next
│   │   └── locales/
│   │       ├── es.json
│   │       └── en.json
│   └── seo/
│       ├── defaultMeta.ts
│       └── jsonLd.ts             # helpers para structured data
│
├── assets/
│   ├── avatars/                  # avatar_01.png, avatar_02.png ... (servidos como assets)
│   ├── images/                   # decorativas
│   ├── icons/                    # SVGs propios
│   └── og/                       # imágenes Open Graph
│
├── styles/
│   ├── globals.css               # Tailwind directives + variables CSS (light/dark)
│   └── tokens.css                # tokens del design system (color, spacing, radius...)
│
├── types/                        # tipos globales (Window, env...)
│   └── env.d.ts                  # tipado de import.meta.env.VITE_*
│
└── main.tsx                      # entry point
```

**Reglas de la estructura:**

- Una feature **NO importa** de otra feature directamente. Si necesita algo de otra, va en `shared/` o se levanta a `app/`.
- `shared/ui/` = componentes shadcn generados. No tocar a mano salvo customización mínima.
- `shared/components/` = componentes propios reutilizables (no shadcn).
- Tests viven al lado del archivo testeado o en `__tests__/` por feature.
- Cada feature exporta un `index.ts` con su API pública.

---

## Tooling base

### Lenguaje + linter + formatter

| Herramienta | Para qué | Notas |
|-------------|----------|-------|
| **TypeScript** | Tipado | `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true` |
| **ESLint** | Linting | configs: `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-plugin-tailwindcss` |
| **Prettier** | Formato | `eslint-config-prettier` para no pelearse con ESLint |
| **Husky + lint-staged** | Pre-commit | corre `eslint --fix` + `prettier --write` solo sobre lo modificado |
| **EditorConfig** | Coherencia entre editores | LF, UTF-8, 2 espacios, trim trailing |
| **.nvmrc** | Versión Node | Node 20 LTS |

### Reglas ESLint imprescindibles (no negociables)

- `jsx-a11y/alt-text`: `<img>` sin `alt` falla el build.
- `react-hooks/exhaustive-deps`: dependencies completas en hooks.
- `@typescript-eslint/no-explicit-any`: prohibido `any`.
- `@typescript-eslint/no-floating-promises`: promesas sin manejar fallan.
- `react/jsx-key`: key en cada item de lista.
- `import/order`: orden de imports estable.

---

## Routing

### Definición

`app/router.tsx` con `createBrowserRouter`. Cada page es lazy:

```tsx
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
```

### Guards

- `<ProtectedRoute>` → si `!isAuthenticated` → redirige a `/login` guardando `from`.
- `<RoleRoute roles={['ADMIN']}>` → si rol no permitido → redirige a `/` con toast 403.
- Mientras carga `/auth/me` al boot → splash o skeleton (no flash de página de login).

### Lazy + Suspense

Todas las rutas en `<Suspense fallback={<RouteSkeleton />}>`. Code-split automático por ruta.

### Mapa de rutas (heredado del spec previo, sin cambios)

| Ruta | Página | Acceso |
|------|--------|--------|
| `/` | Home / listado de partidas | Público |
| `/login` | Login | Público |
| `/register` | Registro | Público |
| `/sessions/:id` | Detalle de partida | Público |
| `/sessions/new` | Crear partida | USER |
| `/sessions/:id/edit` | Editar partida | USER (propietario) |
| `/profile` | Perfil propio | USER |
| `/admin` | Panel admin | ADMIN |
| `/admin/users` | Gestión usuarios | ADMIN |
| `/admin/sessions` | Gestión partidas | ADMIN |
| `*` | Not found | Público |

---

## State management

### TanStack Query (estado del servidor)

Para **todo** lo que viene/va al backend:

```tsx
// features/sessions/hooks/useSessionsQuery.ts
export function useSessionsQuery(filters: SessionFilters) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => sessionsApi.list(filters),
    staleTime: 30_000,
  })
}

// features/sessions/hooks/useJoinSessionMutation.ts
export function useJoinSessionMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: number) => sessionsApi.join(sessionId),
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['session', sessionId] })
    },
  })
}
```

Convenciones:
- **queryKey** siempre como array, con namespace de feature: `['sessions', filters]`, `['session', id]`, `['games', 'search', query]`.
- **staleTime** por defecto 30s; afinable por hook según volatilidad del dato.
- **gcTime** por defecto 5min.
- Mutations invalidan las queries relacionadas en `onSuccess`.
- **Optimistic updates** solo para acciones rápidas y reversibles (toggle favorito, join/leave).

### Zustand (estado del cliente, no del servidor)

Solo para lo que **no** viene del backend:

| Store | Contenido |
|-------|-----------|
| `authStore` | `accessToken` (memoria), `accessTokenExpiresAt`, `currentUser`, `isAuthenticated`, acciones `login/logout/setAccessToken` |
| `themeStore` | `theme: 'light' \| 'dark'`, action `toggleTheme` (persiste en `localStorage`) |
| `localeStore` | `locale: 'es' \| 'en'`, action `setLocale` (persiste en `localStorage`) |
| `uiStore` | Estado UI puntual: drawer abierto, modales globales |

Persistencia con middleware `persist` de Zustand. `accessToken` **nunca** se persiste.

### Estado de URL

Para filtros, paginación, tabs activos: `useSearchParams` de React Router. Sobrevive a recargas y se comparte vía URL.

---

## Comunicación con la API

### Cliente axios base

`shared/api/httpClient.ts`:

```ts
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,                 // envía cookies (refresh token httpOnly)
  headers: { 'Accept-Language': useLocaleStore.getState().locale },
})

// Request interceptor: inyecta access token + accept-language
httpClient.interceptors.request.use(cfg => {
  const token = useAuthStore.getState().accessToken
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  cfg.headers['Accept-Language'] = useLocaleStore.getState().locale
  return cfg
})

// Response interceptor: refresh en 401 (UNA vez)
httpClient.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true
      const ok = await authApi.refresh()  // POST /auth/refresh (cookie)
      if (ok) return httpClient(original)
      useAuthStore.getState().logoutLocal()
      window.location.assign('/login')
    }
    return Promise.reject(normalizeApiError(error))
  }
)
```

### Tipos de la API

- **Opción adoptada**: tipos a mano alineados con backend, organizados por feature.
- **Futuro** (opcional): generar con `openapi-typescript` desde `/v3/api-docs` para no desincronizar.

### Manejo de errores

`shared/api/ApiError.ts` normaliza `ErrorResponse` del backend:

```ts
export type ApiError = {
  status: number
  code: string          // 'error.auth.invalid.credentials' (i18n key)
  message: string       // ya localizado por el backend
  fieldErrors?: { field: string; message: string }[]
}
```

- Mensajes de error de UI: mostrar `message` directamente (ya viene en idioma del `Accept-Language`).
- Para validaciones de form: mapear `fieldErrors[].field` a campos del `react-hook-form`.

---

## Autenticación (resumen — detalle en `modules/auth-spec.md`)

Esto **requiere refactor del backend** ya construido: el refresh token deja de ir en el body JSON y pasa a `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`.

### Flujo

1. **Boot**: al cargar la app → `POST /auth/refresh` (cookie). Si OK → `GET /auth/me` → hidrata `authStore`. Si falla → estado anónimo.
2. **Login/Register**: backend devuelve `accessToken` en body + setea cookie refresh. Frontend guarda access en `authStore` (memoria).
3. **Refresh proactivo**: setTimeout 60s antes de `accessTokenExpiresAt` → `POST /auth/refresh`.
4. **Refresh reactivo**: interceptor en 401 (ver arriba).
5. **Logout**: `POST /auth/logout` (lee cookie, la borra y revoca el refresh) → limpia `authStore` → redirige a `/`.
6. **Auto-logout**: si refresh inválido en cualquier punto → toast + redirect a `/login`.

### Cambios necesarios en backend (al implementar)

- `AuthController.register/login`: devolver refresh como `Set-Cookie`, no en body. `AuthResponse` pierde `refreshToken` y `refreshTokenExpiresAt`.
- `AuthController.refresh/logout`: leer el refresh de `@CookieValue("refresh_token")`. DTOs `RefreshRequest`/`LogoutRequest` desaparecen.
- `SecurityConfig`: ya tiene `setAllowCredentials(true)` y `Authorization` permitido. Añadir `withCredentials` no toca el back.
- En prod: backend en `api.matchplay.com` y frontend en `app.matchplay.com` (mismo `matchplay.com` registrable) para que `SameSite=Strict` funcione.
- Tests `AuthFlowTest`: leer cookie en vez de campo del JSON.

---

## Forms

- `react-hook-form` + `zod`.
- Un esquema zod por form, tipo TS derivado con `z.infer<typeof schema>`.
- Submit deshabilita botón mientras `mutation.isPending`.
- Errores del backend (`fieldErrors[]`) se mapean a `setError(field, { message })`.
- Mensajes localizados: la regla zod tiene `{ message: t('register.password.weak') }` con `t` de `useTranslation`.

---

## i18n

- **`react-i18next`** desde el inicio.
- Idiomas: **es** (por defecto) y **en**.
- **Selector manual** (no detección por navegador): componente `<LanguageSwitcher>` en el header. Cambio persiste en `localeStore` (Zustand + localStorage).
- En cada request al backend se manda `Accept-Language: <locale>`. El backend ya está preparado.
- **Centralización obligatoria**: claves en `shared/i18n/locales/{es,en}.json`, organizadas por feature: `auth.login.title`, `sessions.create.cta`, etc. **PROHIBIDO** crear `features/<x>/locales/`. Si una feature necesita strings, los añade al JSON central bajo su namespace.
- Convención: claves en inglés (`auth.login.submit`), valores en cada idioma.
- Para mensajes que vienen del backend (`ApiError.message`), se usa el texto tal cual (ya localizado).
- **Resaltado de texto inline** (palabras coloreadas dentro de un H1, H2, párrafo, etc.): usar `<Trans>` de react-i18next con component placeholders, **nunca string-split** en TS.
  ```tsx
  // i18n: "landing.hero.title": "Partidas de juegos de mesa <1>cerca de ti</1>"
  <Trans i18nKey="landing.hero.title" components={{ 1: <span className="text-red"/> }} />
  ```
  El traductor decide en qué palabra cae el resaltado por idioma.

---

## Design system

> Validado visualmente con un mockup HTML en `frontend/mockups/home.html` (light + dark
> lado a lado). Decisiones tomadas con el apoyo de la skill `ui-ux-pro-max` y
> aprobadas por el product owner el 2026-05-24.

### Concepto

**Estilo: board-game-café · Bento Grid + Vibrant Block-based.**

Para audiencia 30+ aficionada a los juegos de mesa. Cálido, multicolor, con
personalidad sin caer en estética esports/cyberpunk. Sensación de "objeto físico"
(papel, madera, fichas de juego, dados).

### Paleta — los 4 colores de tablero

Los 4 primarios **no son decoración**: tienen **convención semántica fija** en toda la app.

| Color | Hex (light) | Hex (dark) | Significado semántico |
|-------|-------------|------------|-----------------------|
| 🔴 Rojo board game | `#C8362C` | `#FF6B5C` | Acción primaria · Partida llena · Featured |
| 🔵 Azul board game | `#1F6FB2` | `#5BA8E0` | En curso · Filtro activo · Info |
| 🟢 Verde ficha | `#2F8F4F` | `#66C079` | Partida abierta (plazas libres) · Success |
| 🟡 Amarillo dado/oro | `#E8A93B` | `#F5C865` | Empieza pronto · CTA secundaria · Warning |

### Tokens CSS completos

Colores como **variables CSS** en `styles/tokens.css`, leídos por Tailwind config.
Estrategia `dark` con clase `.dark` en `<html>` (no `prefers-color-scheme`), para
que el usuario pueda forzar el tema con `themeStore`.

```css
:root {
  --radius: 1.25rem;        /* 20px — radius principal de cards */
  --radius-sm: 0.75rem;     /* 12px — radius interno (covers, inputs) */
  --grid-gap: 1.25rem;      /* 20px gap del Bento */

  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;
}

/* ============ LIGHT — crema/papel ============ */
:root, .light {
  --background:         250 246 238;  /* #FAF6EE crema/papel */
  --foreground:         31 26 20;     /* #1F1A14 tinta cálida */
  --card:               255 252 246;  /* #FFFCF6 pergamino */
  --card-foreground:    31 26 20;
  --muted:              240 234 224;  /* #F0EAE0 */
  --muted-foreground:   110 97 79;    /* #6E614F */
  --border:             229 220 201;  /* #E5DCC9 */

  --p-red:    200 54 44;    /* #C8362C */
  --p-blue:   31 111 178;   /* #1F6FB2 */
  --p-green:  47 143 79;    /* #2F8F4F */
  --p-yellow: 232 169 59;   /* #E8A93B */

  --p-red-soft:    252 232 229;
  --p-blue-soft:   226 240 252;
  --p-green-soft:  226 245 232;
  --p-yellow-soft: 253 243 219;

  --shadow:        0 1px 2px rgba(31,26,20,0.04), 0 4px 16px rgba(31,26,20,0.06);
  --shadow-hover:  0 10px 30px rgba(200,54,44,0.18);
  --shadow-warm:   0 2px 4px rgba(110,97,79,0.10);
}

/* ============ DARK — madera ============ */
.dark {
  --background:         26 22 17;     /* #1A1611 madera oscura */
  --foreground:         242 235 221;  /* #F2EBDD */
  --card:               37 32 26;     /* #25201A */
  --card-foreground:    242 235 221;
  --muted:              47 41 32;     /* #2F2920 */
  --muted-foreground:   181 168 146;  /* #B5A892 */
  --border:             58 51 40;     /* #3A3328 */

  --p-red:    255 107 92;   /* #FF6B5C */
  --p-blue:   91 168 224;   /* #5BA8E0 */
  --p-green:  102 192 121;  /* #66C079 */
  --p-yellow: 245 200 101;  /* #F5C865 */

  --p-red-soft:    64 32 28;
  --p-blue-soft:   30 56 78;
  --p-green-soft:  32 64 41;
  --p-yellow-soft: 66 53 25;

  --shadow:        0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.35);
  --shadow-hover:  0 10px 30px rgba(255,107,92,0.25);
  --shadow-warm:   0 2px 4px rgba(0,0,0,0.35);
}
```

**Importante**: los colores se declaran como **triplete RGB sin `rgb()`** para
componer con opacidad en Tailwind:
`bg-[rgb(var(--p-red)/0.10)]` → rojo al 10%.

### Tipografía

| Uso | Familia | Pesos | Notas |
|-----|---------|-------|-------|
| Display / Headings | **Bricolage Grotesque** | 600, 700, 800 | Letter-spacing `-0.025em` en headings grandes. Moderna con personalidad, no esports. |
| Body | **Inter** | 400, 500, 700 | Legibilidad larga distancia, mantiene la familia ya prevista. |
| Mono | **JetBrains Mono** | 400, 500 | Año del juego (`CATAN · 1995`), contadores (`4/5 plazas`), eyebrow text mayúsculas. |

CSS import (en `index.html` o cargado vía `@import` en `tokens.css`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Patrones visuales clave

| Patrón | Implementación | Dónde se usa |
|--------|----------------|--------------|
| **Cinta lateral de color en card** | `box-shadow: inset 4px 0 0 rgb(var(--p-<color>))` | Cada card de partida lleva la cinta del color de su estado. Anclaje visual inmediato. |
| **Eyebrow text mono** | `font-mono uppercase tracking-widest text-xs text-muted` | Sobre headings importantes ("COMUNIDAD DE JUEGOS DE MESA"). |
| **Dado decorativo** | Grid 3×3 con dots, rotado `-8deg`, sombra cálida | Hero de home. Sutil, no overdecoration. |
| **CTA gradient 4-colores** | `linear-gradient(110deg, red 0%, yellow 33%, green 66%, blue 100%)` | Único en la home: la card "Crea tu partida". Momento "festivo" único, no replicar. |
| **Card lift en hover** | `transform: translateY(-2px); box-shadow: var(--shadow-hover)` | Todas las cards interactivas. Sin scale agresivo. |
| **Status badge pill** | `rounded-full uppercase tracking-wide` con bg soft + color saturado | Estado de partida (ABIERTA / LLENA / EN CURSO / EMPIEZA EN 2H). |

### Bento Grid layout (home)

```
4 columnas (desktop) → 2 (tablet) → 1 (móvil)
auto-rows: 180px

| FEATURED (2×2)              | 1×1  | 1×1  |
|                             |------|------|
|                             | WIDE 2×1            |
|------|------|---------------|---------------------|
| 1×1  | 1×1  |
|------|------|--------------------------------------
| CTA WIDE 2×1 (gradient 4-colores)                  |
```

Reglas:
- Una sola card **featured 2×2** por sección (la más prioritaria).
- Cards **wide 2×1** para listings horizontales con mejor lectura.
- Cards **1×1** para volumen.
- Mobile: todas colapsan a span 1.

### Componentes shadcn/ui base

Button, Card, Badge, Dialog, Form, Input, Select, Avatar, Separator, Skeleton,
Toast, Tooltip, NavigationMenu, DropdownMenu, Tabs, Switch, Sheet (drawer móvil),
ScrollArea.

Cada componente generado por shadcn se **adapta a las variables CSS** anteriores
(no hardcodear hex). El theme JSON de shadcn se configura para leer
`--background`, `--foreground`, `--primary` (= `--p-red` en nuestro caso), etc.

### Reglas UI

- Mínimo **44×44px** en targets táctiles.
- `cursor-pointer` en todo clickable.
- Transiciones **180–220ms** con `cubic-bezier(.2,.7,.2,1)` en hover/focus.
- Sin emojis como iconos — `lucide-react`.
- Contraste mínimo **4.5:1** WCAG AA (verificado en ambos temas).
- Reservar espacio para contenido async (Skeleton screens, no spinners aleatorios).
- **Dark mode**: probar TODOS los componentes en ambos modos. Lighthouse + axe en ambos.
- **Convención semántica de colores**: nunca usar rojo/azul/verde/amarillo para
  decorar; siempre con el significado de la tabla de arriba.

### Mockups de referencia

| Pantalla | Archivo | Estado |
|----------|---------|--------|
| Home / listado de partidas | `frontend/mockups/home.html` | ✅ Aprobado |
| Landing pública (`/`) | `frontend/mockups/landing.html` | ✅ Aprobado (2026-05-25) |
| Datepicker create partida (Opción A/B+D/C) | `frontend/mockups/create-session-datepicker-{A,B-D,C}.html` | ✅ Aprobado C, implementado (2026-05-26) |
| Menú móvil (Opción A/B/C) | `frontend/mockups/mobile-menu-{A-drawer,B-bottomsheet,C-fullscreen}.html` | ✅ Aprobado C, implementado (2026-05-26) |
| Rediseño Crear partida (Opción A/B) | `frontend/mockups/create-session-redesign-{A-cards,B-preview}.html` | ✅ Aprobado B (live preview), implementado (2026-05-26) |
| Login + Registro | — | Pendiente |
| Detalle de partida | — | Pendiente |
| Perfil de usuario | — | Pendiente |

Los mockups son **HTML estático con Tailwind via CDN**, sin build. Sirven para
validar look & feel antes de implementar. Se tiran al finalizar el bootstrap del
proyecto React.

### Layout: `<SiteHeader>` + `<MobileMenu>`

`app/layouts/SiteHeader.tsx` envuelve toda la app. **Dos modos responsive**:

- **Desktop (`md:+`)**: 3 zonas con `flex-1` cada una — logo izquierda, nav central (Partidas pill rojo si activo), acciones a la derecha (username · logout · `<LanguageSwitcher>`).
- **Móvil (`<md`)**: solo logo + botón hamburguesa estilo "dado" (`size-[42px] rounded-xl bg-foreground` con borde interno blanco/20 + `<Dices>` icon) que abre `<MobileMenu>`.

`<MobileMenu>` es fullscreen overlay con personalidad board-game-café:

- Decoración: 2 cuadrados rotados (rojo 220×220 opacity 0.08 top-right, amarillo 180×180 opacity 0.15 bottom-left).
- Header: logo + botón cerrar.
- User block: avatar 64×64 con gradiente rojo→amarillo rotado -3°, saludo `"¡Hola, {username}!"` en font-display, stat pills (rating + puntos) en cápsulas.
- Items grandes (`rounded-2xl border-[1.5px] px-4 py-3.5`) con icon-box coloreado: Partidas (rojo), Crear partida (amarillo), Mis partidas (verde · `Próximamente`), Mi perfil (azul · `Próximamente`). Activo en `bg-foreground text-background`.
- Footer: language toggle `bg-muted` compact + botón logout rojo full-width.
- Cierra con: botón X, Escape, navegación interna o click en cualquier `<Link>` (vía `useEffect` que watch `location.pathname` con guard de mount inicial vía `useRef` — evita el bug de "cierra al abrir").
- A11y: `role="dialog"`, `aria-modal="true"`, scroll del body bloqueado mientras está abierto.

### Reglas de uso de la paleta (contraste y a11y)

| Uso | ¿Permitido? | Notas |
|-----|-------------|-------|
| `text-foreground` sobre cualquier `bg-*-soft` | ✅ AAA | Combinación segura por defecto. |
| Strong color (`text-red`, etc.) sobre `bg-card` / `bg-background` | ✅ AA+ | Ratio ≥4.5 verificado en los 4 colores. |
| Strong color como **icono decorativo** dentro de `bg-*-soft` | ✅ | Icono va con `aria-hidden="true"` y hay texto descriptivo cercano. Lighthouse no evalúa contraste de iconos decorativos. |
| Strong color como **texto** sobre su soft (ej. `text-yellow` sobre `bg-yellow-soft`) | ❌ Prohibido | Contraste insuficiente. Usar `text-foreground` siempre. |
| Texto blanco sobre `bg-red` / `bg-blue` / `bg-green` | ✅ AA | Ratio ≥4.5. |
| Texto blanco sobre `bg-yellow` | ⚠️ Solo bold ≥18px | Yellow es el menos contrastado. Texto pequeño debe ser `text-foreground` sobre yellow. |

Estas reglas aplican a **toda la app**. Cualquier uso fuera de la tabla debe documentarse y verificarse manualmente con un contrast checker.

---

## Imágenes y avatares

### Reglas generales

- **`alt` obligatorio** en todo `<img>`. ESLint (`jsx-a11y/alt-text`) lo fuerza.
- `alt` **descriptivo**, no genérico:
  - MAL: `alt="imagen"`, `alt="avatar"`, `alt=""` (salvo decorativas puras).
  - BIEN: `alt="Avatar de Ana Pérez"`, `alt="Portada del juego Catan, edición 1995"`, `alt="Tablero de Carcassonne con piezas distribuidas"`.
- Para imágenes decorativas puras (no aportan info): `alt=""` + `role="presentation"`.
- `loading="lazy"` y `decoding="async"` en imágenes below-the-fold.
- `width` y `height` siempre presentes para evitar CLS (Cumulative Layout Shift).

### Avatares (locales como assets)

- Carpeta: `frontend/src/assets/avatars/avatar_01.png`, `avatar_02.png`, ..., `avatar_NN.png`.
- El backend devuelve solo el `code` (`"avatar_01"`). El frontend mapea:

```ts
// shared/lib/avatars.ts
import { useTranslation } from 'react-i18next'

const avatars = import.meta.glob('@/assets/avatars/*.png', { eager: true, as: 'url' })

export function avatarUrl(code: string): string {
  const url = avatars[`/src/assets/avatars/${code}.png`]
  if (!url) throw new Error(`Unknown avatar code: ${code}`)
  return url
}

export function avatarAlt(code: string, userName: string): string {
  return `Avatar ${code.replace('avatar_', '')} de ${userName}`
}
```

- Componente `<UserAvatar user={user} />` que usa ambas funciones.
- Si añades avatares nuevos: solo dejarlos en `assets/avatars/` con nombre `avatar_NN.png`. No hace falta tocar código.

### Imágenes de juegos (BGG)

- BGG devuelve URLs absolutas (CDN de BGG). Se renderizan directamente con `<img src={game.imageUrl}>`.
- `alt` con nombre del juego + año: `"Portada de Catan (1995)"`.

---

## SEO

### Decisión

**Desde el día 1**: `react-helmet-async` + pre-rendering + JSON-LD + sitemap + robots + Lighthouse CI. **Sin migrar a Next.js.**

### Por página

Componente `<SeoHead>` reutilizable (en `shared/components/`):

```tsx
<SeoHead
  title={`${session.name} — Matchplay`}
  description={`Partida de ${session.game.name} el ${formatDate(session.scheduledAt)}`}
  image={session.game.imageUrl}
  canonical={`${VITE_APP_URL}/sessions/${session.id}`}
  jsonLd={sessionJsonLd(session)}
/>
```

Internamente compone:
- `<title>`
- `<meta name="description">`
- Open Graph completo (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`).
- Twitter Card (`twitter:card=summary_large_image`, etc.).
- `<link rel="canonical">`.
- `<script type="application/ld+json">` con structured data.

### Structured data (JSON-LD) por tipo

- **Home/listado**: `WebSite` + `SearchAction`.
- **Detalle de partida**: `Event` (schema.org) con `startDate`, `location`, `organizer`, `eventStatus`.
- **Detalle de juego**: `Game` (o `Product` con `Thing`) con `name`, `image`, `description`.
- **Perfil público**: `Person` o `ProfilePage`.

Helpers en `shared/seo/jsonLd.ts`, uno por tipo.

### Pre-rendering en build

- **`vite-plugin-prerender-spa`** (o equivalente moderno tipo `@prerenderer/rollup-plugin`).
- Rutas a pre-renderizar: `/`, `/login`, `/register`, `/sessions/:id` (top N), `/games/:bggId` (top N). Las protegidas (`/profile`, `/admin/*`) **no**.
- Genera HTML estático con meta tags y contenido inicial. El bundle JS sigue tomando control para SPA.

### Sitemap + robots

- **`sitemap.xml`** generado en build a partir de rutas estáticas + listados dinámicos (top N partidas y juegos consultados al backend).
- **`robots.txt`** en `public/`:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /profile
  Disallow: /api
  Sitemap: https://app.matchplay.com/sitemap.xml
  ```

### Core Web Vitals + Lighthouse CI

- Script `npm run lighthouse` con `@lhci/cli` que falla si:
  - Performance < 85
  - Accessibility < 95
  - Best practices < 90
  - SEO < 95
- Incluir en CI (GitHub Actions o equivalente).

### Skills de apoyo (auditoría y diseño SEO)

El proyecto tiene instaladas skills externas para auditar y diseñar SEO en cada cambio.
Instalación y uso: ver [CLAUDE.md](../../CLAUDE.md), sección **Agent Skills**.

| Skill | Cuándo usarla en este frontend |
|-------|-------------------------------|
| `seo-audit` | Cada vez que se toque una página pública: auditoría completa (meta, indexación, CWV, crawl). |
| `schema` | Al añadir o cambiar JSON-LD en `<SeoHead>` o helpers de `shared/seo/jsonLd.ts`. |
| `site-architecture` | Al planificar nuevas secciones públicas y su jerarquía de URLs / breadcrumbs. |
| `ai-seo` | Al optimizar contenido para que LLMs (ChatGPT, Perplexity, Claude) citen Matchplay. |

Convención: antes de aprobar una página pública nueva, **pasarla por `seo-audit`** como
checklist obligatorio antes de merge.

---

## Accesibilidad

- Semántica correcta (`<button>` para acciones, `<a>` para navegación, headings jerárquicos).
- Foco visible siempre (`focus-visible:ring-2`). Nunca remover sin alternativa.
- Atrapar foco en modales/drawers (Radix/shadcn lo hace por defecto).
- `aria-label` en iconos sin texto.
- Contraste WCAG AA mínimo (verificado en ambos temas).
- Skip link al contenido principal (`<a href="#main-content" class="sr-only focus:not-sr-only">Saltar al contenido</a>`).
- `prefers-reduced-motion`: respetar en transiciones (`@media (prefers-reduced-motion: reduce)` o Tailwind `motion-reduce:`).
- Tests automatizados con `vitest-axe` por componente.
- Lighthouse en CI con umbral 95+.

---

## Testing

### Stack

| Capa | Lib | Para qué |
|------|-----|----------|
| Unit | **Vitest** | hooks, utils, stores |
| Componente | **React Testing Library** | render + interacciones |
| Mock HTTP | **MSW (Mock Service Worker)** | mockea el backend sin tocar axios |
| Accesibilidad | **vitest-axe** | violaciones a11y en componentes |
| E2E (a futuro) | Playwright | flujos críticos completos |

### Organización

- Tests al lado del archivo testeado: `LoginForm.tsx` + `LoginForm.test.tsx`.
- Tests de integración por feature en `features/<feature>/__tests__/`.
- Handlers MSW en `shared/api/__mocks__/handlers.ts`.

### Convenciones

- **Arrange / Act / Assert** explícito.
- `screen.getByRole()` antes que `getByTestId()`. `data-testid` solo como último recurso.
- Nombre del test: `whenX_thenY` o `descripción en lenguaje natural`.
- No testar implementación interna — testar comportamiento.

### Cobertura mínima

- Hooks de feature: 80%.
- Componentes shadcn generados: 0% (no tocar).
- Componentes propios: 70%.

---

## Performance

- **Code splitting** por ruta con `React.lazy` + `Suspense`.
- **Bundle analysis** con `rollup-plugin-visualizer` (script `npm run analyze`).
- **Optimización de imágenes**: avatares en formato moderno (PNG optimizado o WebP). Imágenes de BGG vienen de su CDN ya optimizadas.
- **Memoización quirúrgica**: `useMemo`/`useCallback` solo cuando hay un benchmark real que lo justifique.
- **React Query**: `staleTime` adecuado para no refetchear de más.

---

## Scripts npm

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "analyze": "vite build --mode analyze",
    "lighthouse": "lhci autorun",
    "prepare": "husky"
  }
}
```

CI corre (en este orden): `typecheck` → `lint` → `test:run` → `build` → `lighthouse`.

---

## Naming y convenciones

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| Componente | PascalCase, un archivo | `SessionCard.tsx` |
| Hook | camelCase con `use` | `useAuth.ts`, `useSessionsQuery.ts` |
| Store Zustand | camelCase con `Store` | `authStore.ts`, `themeStore.ts` |
| Tipo / interfaz | PascalCase, sin prefijo `I` | `Session`, `SessionFilters` |
| Constante | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE = 50` |
| Archivo test | `.test.tsx` al lado | `SessionCard.test.tsx` |
| Carpetas | kebab-case | `session-detail/` |
| Handlers | `handleX` | `handleSubmit`, `handleClose` |
| Props de evento | `onX` | `onClick`, `onSubmit` |
| Booleanos | `isX`, `hasX`, `canX` | `isLoading`, `hasError` |

---

## Dependencias a instalar (referencia consolidada)

```jsonc
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-query-devtools": "^5.x",
    "zustand": "^5.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "react-i18next": "^14.x",
    "i18next": "^23.x",
    "i18next-browser-languagedetector": "^8.x",
    "react-helmet-async": "^2.x",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "vite": "^5.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "eslint": "^9.x",
    "@typescript-eslint/eslint-plugin": "^8.x",
    "@typescript-eslint/parser": "^8.x",
    "eslint-plugin-react": "^7.x",
    "eslint-plugin-react-hooks": "^5.x",
    "eslint-plugin-jsx-a11y": "^6.x",
    "eslint-plugin-tailwindcss": "^3.x",
    "eslint-config-prettier": "^9.x",
    "prettier": "^3.x",
    "prettier-plugin-tailwindcss": "^0.x",
    "husky": "^9.x",
    "lint-staged": "^15.x",
    "vitest": "^2.x",
    "@vitest/ui": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "jsdom": "^25.x",
    "msw": "^2.x",
    "vitest-axe": "^0.x",
    "@lhci/cli": "^0.x",
    "rollup-plugin-visualizer": "^5.x",
    "@prerenderer/rollup-plugin": "^0.x"
  }
}
```

shadcn/ui se instala con `npx shadcn@latest init` (no es paquete npm).

---

## Cambios fuera del frontend que este spec implica

Listado de impacto en el backend (a hacer cuando se implemente auth en el front):

1. **`AuthController`**: emitir el refresh como `Set-Cookie httpOnly Secure SameSite=Strict`, no en el body. Eliminar `refreshToken` y `refreshTokenExpiresAt` de `AuthResponse`. `RefreshRequest`/`LogoutRequest` desaparecen.
2. **`AuthService`**: aceptar el refresh desde la cookie en `refresh()` y `logout()`.
3. **`AuthFlowTest`**: actualizar para leer la cookie.
4. **`docs/backend/modules/auth-spec.md`**: actualizar la sección de tokens y los endpoints.
5. **CORS**: ya tiene `allowCredentials=true`. ✅
6. **OpenAPI**: documentar que el refresh viaja en cookie.
7. **`SecurityConfig`**: añadir un endpoint público adicional `/api/v1/i18n/messages` si decidimos exponer las claves i18n del backend al frontend (opcional).

Estos cambios se aplicarán al construir el módulo `auth` del frontend, no antes.

---

## Próximos pasos

1. Crear `docs/frontend/modules/auth-spec.md` con el detalle del flujo de auth en frontend + cambios concretos al backend.
2. Crear `docs/frontend/modules/games-spec.md` con la UI de búsqueda contra el endpoint ya construido.
3. Bootstrap del proyecto: migrar a TypeScript, instalar todo, configurar tooling, layouts vacíos, router básico.
4. Implementar auth (cliente + refactor backend a cookie).
5. Resto de módulos.
