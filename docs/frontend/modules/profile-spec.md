# Frontend · Módulo Perfil — Spec

> Página `/profile` (avatar picker, bio, juegos favoritos, cambio de
> contraseña), `<UserMenu>` (dropdown desktop + drawer mobile) anclado al
> avatar del header, y `<Avatar>` unificado en sidebar de partidas, header
> de detail y chat.

Referencia capa: [../spec.md](../spec.md) · Backend: [../../backend/modules/user-spec.md](../../backend/modules/user-spec.md)

---

## Propósito

Cubre cuatro bloques que se sostienen mutuamente:

1. **`<Avatar>` unificado** — un solo componente para mostrar la identidad
   visual del usuario en cualquier sitio: PNG preset si hay `avatarCode`,
   fallback letra+color determinístico si no. Reemplaza el círculo letra+color
   que pintaban a mano `SessionPlayerRow` y `ChatMessageRow`.
2. **`<UserMenu>`** — dropdown desktop / drawer mobile lanzado por click en el
   avatar del header. Items: Mi perfil · Mis mensajes (próx) · Ayuda · Idioma
   (toggle ES/EN) · Modo oscuro (toggle) · Cerrar sesión.
3. **`/profile`** (Layout C aprobado) — página single-scroll envuelta en card
   `.mp-mockup` con cabecera (avatar + @username + bio inline) y 4 secciones:
   Avatar / Bio / Juegos favoritos / Cuenta (incluye cambio de password).
4. **`/help`** — página stub pública (placeholder de FAQ). Linkada desde
   `<UserMenu>`.

Lo que **no** está en este módulo:

- Edición de email / username (readonly; sin endpoint backend).
- Upload de avatares custom (sin endpoint backend).
- Reset password / "olvidé mi contraseña" (out of MVP).

---

## Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Storage de avatar | 31 PNGs preset en `frontend/src/assets/avatars/avatar_NN.png` (NN = 01..31) | `import.meta.glob` eager para resolver URLs en build-time, sin 31 imports estáticos. |
| Fallback `<Avatar>` | Círculo letra+color via `pickAvatarColor(username)` (helper ya existente para sidebar / chat) | Cubre `avatarCode` undefined o code desconocido. |
| Tipo `avatarCode` en TS | `avatarCode?: string` (opcional, no `string \| null`) | Jackson global `non_null` lo omite → llega `undefined`. Tipar como nullable rompería las comparaciones (ver CLAUDE.md). |
| Estado del tema | `useThemeStore` zustand persist preexistente (`matchplay.theme`) — NO hook nuevo | El plan original mencionaba `useTheme()`, en implementación se reutilizó el store existente. |
| Layout `/profile` | **Layout C** (single-scroll, sin sidebar nav) | Aprobado en spec de diseño. Mockup `.mp-mockup` con bg `#FAF7F2` + `rounded-xl` + `shadow-warm`. |
| Grid avatar picker | 7 columnas × 5 filas en desktop (cabe los 31 con 4 huecos vacíos) | Click sobre cualquiera dispara save optimista. |
| Bio | Textarea 280 chars + contador `n/280` + botón "Guardar" explícito | Sin save on blur — el usuario controla. |
| Favoritos | Max 5 slots fijos. Si hay 3 favoritos → 3 cards + 2 slots vacíos clicables. Click slot → modal `GameSearchModal` con `<GameTypeahead>`. | Replace strategy en backend; el FE envía la lista entera tras cada add/remove. |
| Cambio de password | 3 inputs (current / new / confirm). Validación cliente (min 8, match). Error inline genérico (`profile.account.errorWrongPassword`). | El backend no diferencia códigos de error 4xx — siempre mismo texto. |
| Avatar en sessions | `SessionPlayerRow`, `SessionDetailPage` (header organizador, size 20) y `ChatMessageRow` (size 24, solo para mensajes ajenos) | El sidebar usa size 28; el header de creador 20 (compacto); el chat 24. |
| Avatar como trigger del menú | Reemplaza burger en `SiteHeader` mobile autenticado | Anónimo sigue con burger. Desktop autenticado: avatar a la derecha del nav. |
| i18n | Bajo `profile.*`, `nav.*`, `common.*` en `shared/i18n/locales/{es,en}.json` | **Prohibido** crear `features/profile/locales/`. |

---

## Estructura de paquetes

```
features/profile/
├── pages/
│   └── ProfilePage.tsx
├── components/
│   ├── AvatarPicker.tsx
│   ├── BioForm.tsx
│   ├── FavoriteGamesPicker.tsx      # 5 slots + modal de búsqueda
│   ├── AccountSection.tsx           # username/email readonly + ChangePasswordForm
│   └── ChangePasswordForm.tsx
├── api/
│   └── profileApi.ts                # getProfile, updateProfile, changePassword
├── hooks/
│   └── useProfile.ts                # useProfileQuery, useUpdateProfileMutation, useChangePasswordMutation
└── types/
    └── profile.types.ts             # alineado con DTOs Java

features/help/
└── pages/
    └── HelpPage.tsx                 # stub público

shared/components/
└── Avatar.tsx                       # componente unificado preset PNG | letra+color
```

Componentes app/layout que cambian:

- `app/layouts/UserMenu.tsx` — nuevo. Dropdown desktop / drawer mobile.
- `app/layouts/SiteHeader.tsx` — `<UserMenu>` reemplaza el bloque previo de usuario; en mobile autenticado, avatar reemplaza burger.
- `app/layouts/MobileMenu.tsx` — añade items nuevos cuando `isAuthenticated`.

---

## `<Avatar>` (`shared/components/Avatar.tsx`)

```tsx
interface AvatarProps {
  username: string
  avatarCode?: string | null
  size?: number       // px, default 32
  className?: string
}
```

**Resolución de la URL del preset**:

```ts
const avatarUrls = import.meta.glob<{ default: string }>(
  '@/assets/avatars/avatar_*.png',
  { eager: true },
)
function urlForCode(code: string): string | null {
  const path = `/src/assets/avatars/${code}.png`
  return avatarUrls[path]?.default ?? null
}
```

- Si `avatarCode` está y matchea un PNG → `<img>` con `object-cover` y `width/height` inline.
- Si no (undefined o code no encontrado) → `<span>` con `pickAvatarColor(username)` + inicial mayúscula.
- `aria-hidden="true"` en el fallback (decorativo, el nombre del usuario va al lado en texto).
- Test en `__tests__/Avatar.test.tsx` cubre: inicial sin code, inicial con code desconocido, imagen con code válido, tamaño en píxeles.

**Usos**:

| Sitio | size | Notas |
|-------|------|-------|
| `SessionPlayerRow` (sidebar de detail) | 28 | Reemplaza el span letra+color manual. |
| `SessionDetailPage` header — "Organiza @creator" | 20 | Compacto, junto al texto. Solo renderiza si el FE tiene el avatarCode (puede no estar si el usuario aún no tiene avatar persistido — se hace fallback). |
| `ChatMessageRow` mensaje ajeno | 24 | Solo si `!mine`. Mensaje propio NO muestra avatar (alineado a la derecha). |
| `UserMenu` trigger | 36 | Avatar del header. |
| `ProfilePage` cabecera | 64 | El más grande, junto al @username. |
| `AvatarPicker` grid | 56 | Cada celda. |

---

## `<UserMenu>` (`app/layouts/UserMenu.tsx`)

Trigger: botón con `<Avatar size={36}>` + caret. Anclaje:

- **Desktop (`sm+`)**: dropdown popover anclado al avatar, ancho ~280px.
- **Mobile**: full-width drawer desde la derecha.

Items (en orden):

1. **Mi perfil** → `<Link to="/profile">` con icono `User`.
2. **Mis mensajes** → texto + pill "Próximamente" (clave `common.comingSoon`). Sin link.
3. **Ayuda** → `<Link to="/help">` con icono `HelpCircle`.
4. **Idioma** — fila con label "Idioma" + pill toggle ES / EN. Click cambia `i18n.changeLanguage` (no cierra el menú — feedback inmediato).
5. **Modo oscuro** — fila con label "Modo oscuro" + switch. Click llama `useThemeStore.setState({ theme })` (toggle entre `light` y `dark`). Persiste en localStorage `matchplay.theme`.
6. **Cerrar sesión** — botón rojo, `useLogoutMutation` + `navigate('/')`.

Cierre del menú:

- Click fuera (overlay invisible en desktop, backdrop visible en mobile).
- Escape.
- Click sobre un `<Link>` (auto cierra vía React Router navigation).
- Excepción: el toggle de idioma y el switch de tema NO cierran (feedback en sitio).

Test (`UserMenu.test.tsx`): trigger renderiza username + avatar, dropdown muestra todos los items, click en Cerrar sesión dispara `logout`.

---

## Integración con `useThemeStore`

Store zustand preexistente (módulo de auth/landing). No se crea un hook nuevo.

```ts
// src/shared/stores/themeStore.ts (preexistente)
interface ThemeState { theme: 'light' | 'dark' }
useThemeStore = create(persist<ThemeState>(..., { name: 'matchplay.theme' }))
```

`UserMenu` lee `useThemeStore(s => s.theme)` y llama `useThemeStore.setState(...)`
para alternar. La aplicación de la clase `dark` al `<html>` ya la hace un
efecto que vive en `main.tsx` (preexistente) — el menú solo cambia el valor
del store.

---

## `ProfilePage` (`/profile`)

Layout C aprobado:

```
┌────────────────────────────────────────────────────────────┐
│ .mp-mockup  (bg #FAF7F2, rounded-xl, shadow-warm)          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  [Avatar 48]   @alice                                  │ │  ← top bar
│ │                Aficionada a euros pesados.             │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ ## Avatar                                              │ │  ← AvatarPicker
│ │ [grid 7x5 con 31 PNGs]                                 │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ ## Bio                                                 │ │  ← BioForm
│ │ [textarea 280 + contador + Guardar]                    │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ ## Juegos favoritos                                    │ │  ← FavoriteGamesPicker
│ │ [5 slots con card / vacío]                             │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ ## Cuenta                                              │ │  ← AccountSection
│ │ username (readonly) · email (readonly)                 │ │
│ │ [ChangePasswordForm]                                   │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- Wrapper `.mp-mockup`: bg `#FAF7F2`, `rounded-xl`, `shadow-[0_6px_20px_rgba(0,0,0,0.08)]`, `overflow-hidden`.
- Top bar: `<Avatar size={48}>` + `@username` en `font-display` + bio inline en muted. Si bio vacía, placeholder "Sin biografía aún".
- 4 secciones separadas por `divide-y border-border` (sin border en la última).
- Cada sección con título `font-display uppercase tracking-wide` + bloque de contenido.

---

## `<AvatarPicker>`

- Grid `grid-cols-7` desktop, `grid-cols-5` mobile.
- Cada celda: botón con `<Avatar size={56} avatarCode={code} username={user.username}>` + borde `border-2 border-transparent`. Si es el seleccionado → `border-red`.
- Click → optimistic save: `useUpdateProfileMutation.mutate({ avatarCode })`. Si falla → revert + toast error.
- Sin "Guardar" explícito (cambio inmediato).

---

## `<BioForm>`

- `<textarea>` con `maxLength={280}` (límite hard del browser) + contador `${value.length}/280` que pasa a `text-red` si supera 250.
- Botón "Guardar" explícito (no auto-save) — submit → `useUpdateProfileMutation.mutate({ bio })`.
- Mientras `isPending` → "Guardando…" + disable.
- Tras success → toast `common.savedToast`.

---

## `<FavoriteGamesPicker>`

5 slots en grid:

- Cada slot ocupado: card con thumbnail + nombre + botón `✕` para quitar.
- Cada slot vacío: card dashed + icono `+` + texto "Añadir juego". Click → abre modal `<GameSearchModal>` (interno al componente).

Modal:

- Reutiliza `<GameTypeahead>` (de `features/games/`) en modo búsqueda libre.
- Click en un resultado → cierra modal + dispara `useUpdateProfileMutation` con la nueva lista `[...favoritos, nuevoBggId]`.
- Sin focus trap ni cierre por ESC (limitación conocida, mismo nivel que `EditSessionModal` — ver follow-ups).

Quitar favorito:

- Click `✕` en card → `useUpdateProfileMutation.mutate({ favoriteGameBggIds: filtered })`.

---

## `<ChangePasswordForm>`

3 inputs:

- `currentPassword` — type=password.
- `newPassword` — type=password, helper text "Mínimo 8 caracteres".
- `confirmPassword` — type=password.

Validación cliente (RHF + zod):

- Los 3 son `@NotBlank`.
- `newPassword`: min 8 chars.
- `confirmPassword`: debe igualar `newPassword` (zod `refine`).

Submit:

- `useChangePasswordMutation.mutate({ currentPassword, newPassword })`.
- En success → reset form + toast `profile.account.passwordChanged`.
- En error 4xx → inline error genérico `profile.account.errorWrongPassword` (el FE no diferencia códigos — ver follow-ups).

---

## `<AccountSection>`

- Username (readonly), email (readonly) en filas con label + valor en muted.
- `<ChangePasswordForm>` debajo.

No hay botón "Editar username/email" — el backend no expone endpoints para ello (decisión de producto v1).

---

## Avatar en SessionDetailPage y ChatMessageRow

### Header de detail — antes del "Organiza @{username}"

```tsx
<Link to={`/users/${creatorId}`} className="inline-flex items-center gap-2">
  <Avatar username={creatorUsername} avatarCode={creatorAvatarCode} size={20} />
  <span>{t('sessions.detail.organizes', { username: creatorUsername })}</span>
</Link>
```

(La ruta `/users/:id` no existe todavía — el link va a `/profile` solo para el creador actual, o sin link para otros. Ver follow-ups.)

### `<ChatMessageRow>` — solo mensajes ajenos

```tsx
{!mine && (
  <Avatar
    username={message.username}
    avatarCode={message.authorAvatarCode}
    size={24}
    className="mt-1 shrink-0"
  />
)}
```

Reemplaza el `<span>` con `pickAvatarColor(username)` que pintaba la inicial — ahora `<Avatar>` lo hace internamente como fallback.

### `<SessionPlayerRow>` — sidebar

```tsx
<Avatar username={player.username} avatarCode={player.avatarCode} size={28} />
```

Reemplaza el `<span className="inline-flex size-7 ...">` antiguo.

---

## `<MobileMenu>` — items nuevos

Cuando `isAuthenticated`, además de los items existentes ("Partidas", "Crear partida", "Mis partidas"), añade:

- **Mi perfil** → `/profile`.
- **Mis mensajes** → texto + pill "Próximamente". Sin link.
- **Ayuda** → `/help`.
- **Idioma** → toggle ES/EN inline.
- **Modo oscuro** → switch inline (lee/escribe `useThemeStore`).
- **Cerrar sesión** → al final, separado por divider.

El avatar del `SiteHeader` mobile autenticado es el trigger del MobileMenu (en vez del burger). Anónimo sigue con burger.

---

## `HelpPage` (`/help`)

Stub público (no requiere auth). Página simple con:

- Hero "Centro de ayuda" + subtítulo.
- 3 secciones placeholder: "Preguntas frecuentes", "Contacto", "Términos y condiciones". Cada una con `<p>` placeholder.
- Link "Volver al inicio".

Sin lógica, sin API. Existe para que el item del `<UserMenu>` no quede colgando.

---

## Routing (`app/router.tsx`)

```ts
{
  path: '/profile',
  element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
},
{
  path: '/help',
  element: <HelpPage />,                  // pública
},
```

`/profile` declarada **antes** de las rutas dinámicas para evitar matches inesperados. Anónimos → `/login?next=/profile`.

---

## Types

```ts
// features/profile/types/profile.types.ts

export interface FavoriteGame {
  bggId: number
  name: string
  thumbnailUrl: string | null
}

export interface UserProfile {
  username: string
  email: string
  avatarCode?: string         // opcional — Jackson omite si null
  bio?: string                // opcional
  favoriteGames: FavoriteGame[]   // siempre presente (backend @JsonInclude ALWAYS)
}

export interface UpdateProfileRequest {
  avatarCode?: string
  bio?: string
  favoriteGameBggIds?: number[]
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
```

En `auth.types.ts` se enriquece `CurrentUser` con `avatarCode?` y `bio?`. En `session.types.ts`:

```ts
SessionSummary.creatorAvatarCode?: string
SessionPlayer.avatarCode?: string
ChatMessage.authorAvatarCode?: string
```

Todos opcionales (no `string | null`) — el backend omite el campo cuando es null (Jackson `non_null`), llega como `undefined`.

---

## API client (`features/profile/api/profileApi.ts`)

```ts
profileApi.get()                  // GET    /me/profile        → UserProfile
profileApi.update(body)           // PATCH  /me/profile        → UserProfile
profileApi.changePassword(body)   // POST   /me/profile/password (204)
```

Paths relativos a `baseURL` (que ya incluye `/api/v1`).

---

## TanStack Query (`features/profile/hooks/useProfile.ts`)

```ts
profileKeys = { all: ['profile'], current: () => [...all, 'current'] }

useProfileQuery()                  // staleTime 60s
useUpdateProfileMutation()         // onSuccess: setQueryData(current, response)
useChangePasswordMutation()        // sin invalidación (no cambia estado visible)
```

`useUpdateProfileMutation.onSuccess` actualiza el cache de `profileQuery` con la respuesta, pero **no** sincroniza `authStore.currentUser.avatarCode`. Tras cambiar avatar, el header sigue mostrando el avatar viejo hasta refrescar `/me` manualmente o recargar la página. Ver follow-ups.

---

## i18n

Claves bajo `profile.*`, `nav.*`, `common.*` en `shared/i18n/locales/{es,en}.json`:

```
profile.title
profile.avatar.{heading, hint, savingError}
profile.bio.{heading, placeholder, save, saving, charCount, savedToast}
profile.favorites.{heading, hint, addSlot, removeAria, modalTitle, searchPlaceholder}
profile.account.{heading, username, email, passwordHeading,
                 currentPassword, newPassword, confirmPassword,
                 passwordHint, passwordMismatch,
                 submit, submitting, passwordChanged, errorWrongPassword}

nav.profile           # Mi perfil
nav.messages          # Mis mensajes
nav.help              # Ayuda
nav.language          # Idioma
nav.darkMode          # Modo oscuro
nav.logout            # Cerrar sesión

common.comingSoon     # Próximamente
common.savedToast     # Guardado
common.errorGeneric   # Ha ocurrido un error. Inténtalo de nuevo.

help.{title, subtitle, faq, contact, terms, backHome}
```

---

## Tests

| Archivo | Cobertura |
|---------|-----------|
| `shared/components/__tests__/Avatar.test.tsx` | inicial sin code, inicial con code desconocido, imagen con code válido, tamaño px (4 tests) |
| `app/layouts/__tests__/UserMenu.test.tsx` | trigger renderiza avatar + username, dropdown abre con items, click logout dispara mutation |
| `features/profile/__tests__/ProfilePage.test.tsx` | render con datos, AvatarPicker selección, BioForm submit, FavoriteGamesPicker add/remove, ChangePasswordForm validación cliente |

---

## Accesibilidad

- `<Avatar>` fallback letra+color tiene `aria-hidden="true"` (decorativo). El nombre del usuario va al lado en texto.
- `<UserMenu>` trigger es un `<button>` con `aria-label` que incluye el username. Dropdown con `role="menu"` (o equivalente de Radix/headless).
- `ProfilePage` headings: H1 "Mi perfil", H2 por sección.
- `ChangePasswordForm`: error inline con `role="alert"`.
- `AvatarPicker`: cada avatar es un `<button aria-label="Avatar N">`. El seleccionado lleva `aria-pressed="true"`.
- Contraste: borders y fallback colors elegidos del sistema de diseño (AA garantizado).

---

## Pendientes / follow-ups conocidos

- **`useUpdateProfileMutation.onSuccess` no sincroniza `authStore.currentUser.avatarCode`** — al cambiar avatar en `ProfilePage`, el avatar del header sigue siendo el antiguo hasta refresh manual. Cuando se documente UP10, se decidirá entre (a) invalidar `currentUser` query en el `onSuccess`, o (b) llamar a una acción del authStore para mergear el campo. Hoy: refresh manual.
- **Modal de favoritos sin focus trap ni cierre por ESC** — mismo nivel que `EditSessionModal`. Aceptable en MVP; mejorar cuando se introduzca una infra de `<Dialog>` (probablemente Radix UI) en todo el proyecto.
- **`useChangePasswordMutation` no diferencia códigos de error 4xx** — siempre muestra `profile.account.errorWrongPassword`. Si el backend en el futuro distingue entre "password actual incorrecta" y "validación falló por longitud", habría que mapear con `mapProfileError` (no existe todavía).
- **Ruta `/users/:id` para perfil de otros usuarios** — referenciada como link del creador en `SessionDetailPage` pero no implementada. Hoy: link solo si es el usuario actual (apunta a `/profile`); para otros, sin link.
- **Toast de éxito** — `common.savedToast` se prepara pero la infra de toasts no existe en v1 (ver `sessions-spec.md`). Por ahora el feedback de "guardado" es solo el spinner desapareciendo.
- **`useThemeStore` ya existía** — el plan original mencionaba crear `useTheme()` hook nuevo (UP9). En la implementación se reutilizó el store. Esta spec refleja la realidad.
