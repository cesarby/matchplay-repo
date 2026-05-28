# Perfil de usuario — Design Spec

**Fecha**: 2026-05-28
**Estado**: Aprobado, listo para writing-plans

## Goal

Añadir el **menú de usuario** (dropdown en desktop / drawer en mobile) ancorado al avatar en el header, y la **página de perfil** `/profile` donde el usuario puede personalizar avatar, bio, juegos favoritos y cambiar su contraseña. El sistema de avatares preset (31 PNGs ya provistos en `frontend/src/assets/avatars/`) sustituye al actual fallback letra+color en todos los lugares donde aparece un avatar (header, detail de sesión, sidebar de apuntados, mensajes del chat).

## Decisiones cerradas

| Decisión | Valor |
|----------|-------|
| Items del menú | Mi perfil · Mis mensajes (próx) · Ayuda · Idioma (toggle ES/EN) · Modo oscuro (toggle) · Cerrar sesión |
| Layout de `/profile` | Single page con secciones (sin tabs) — Avatar, Bio, Juegos favoritos, Cuenta |
| Avatar storage | Presets fijos: 31 PNGs en `frontend/src/assets/avatars/avatar_01..31.png`. DB guarda solo `avatar_code` (string `avatar_NN`). |
| Asignación inicial | Aleatoria en signup (`avatar_` + `01..31`) |
| Username editable | No (readonly, helper text "contacta soporte") |
| Email editable | No (readonly) |
| Bio | TEXTAREA max 280 chars, contador visible. Guardar explícito (no auto-save). |
| Juegos favoritos | Max 5. Picker BGG (reusa lógica de `<GameWithExpansionsPicker>`). Sin reorder UI. |
| Cambio de contraseña | `POST /me/password` con `{currentPassword, newPassword}`. No invalida sesión. |
| Dark mode persistence | `localStorage` (`matchplay-theme`). Default `light`. |
| Idioma toggle | Dentro del menú; NO cierra el menú al cambiar. Persistencia `localStorage` (i18n-detector existente). |
| Modo oscuro toggle | Dentro del menú; NO cierra el menú al cambiar. |
| Mobile menu | Una sola superficie: tap en avatar → drawer fullscreen actual (MobileMenu) con los items nuevos. No popover separado. |
| Avatar en SessionDetail | Junto a "organiza @user" en header + SessionPlayerRow apuntados + ChatMessageRow |
| Avatar en SessionCard | NO en este sprint (el listado tiene la portada del juego como protagonista visual). Tampoco enriquecemos `SessionSummaryResponse` con `creatorAvatarCode` — YAGNI; si se necesita en follow-up, se añade entonces. |
| Toasts | NO existe infra de toasts en v1. Para esta feature usar texto inline (success message debajo del botón, errors inline en el input). Refactor a toasts cuando exista la infra (out of scope aquí). |

## Arquitectura

### Componentes nuevos (FE)

- **`<Avatar username, avatarCode?, size>`** — `frontend/src/shared/components/Avatar.tsx`.
  - Si `avatarCode` presente → `<img src={import('@/assets/avatars/${avatarCode}.png')} alt={username}>` redondeado, tamaño según prop.
  - Si null/undefined → fallback letra+color (la lógica actual de `pickAvatarColor` + inicial).
  - Una única fuente de verdad para avatares en todo el sitio.

- **`<UserMenu>`** — `frontend/src/app/layouts/UserMenu.tsx`.
  - Trigger: botón con `<Avatar size=32>` + `<span>{username}</span>` (oculto en `<md`) + chevron.
  - Popover anchored bottom-right, ancho 280px, `bg-white` + `rounded-xl` + `shadow-[0_12px_32px_rgba(0,0,0,0.14)]` + border 1px `rgba(0,0,0,0.06)`.
  - Items con icono lucide plano (sin círculo coloreado), gap 14px, hover `bg-[rgba(31,26,20,0.05)]` (gris 5%, no cream).
  - Logout: `border-t` + `text-[#C8362C]` + hover `bg-red-soft`-like.
  - A11y: `aria-expanded`, `role="menu"`, items con `role="menuitem"`, Esc/click-fuera cierran, Tab/arrow nav básico.

- **`<AvatarPicker>`** — `frontend/src/features/profile/components/AvatarPicker.tsx`.
  - Grid 7 cols × ceil(31/7)=5 rows = 35 slots; 31 ocupados + 4 vacíos al final (o ajustar a 6×6=36 con 5 vacíos).
  - Cada celda: `<button>` con `<img>` 56px, `rounded-full`, ring 2px `border-blue` + box-shadow al estar seleccionado.
  - Click guarda inmediatamente vía `PATCH /me` (optimistic update).

- **`<FavoriteGamesPicker>`** — `frontend/src/features/profile/components/FavoriteGamesPicker.tsx`.
  - 5 slots horizontales. Vacíos = botón dashed "+ Añadir". Llenos = cover BGG + nombre + ✕ para quitar.
  - "+ Añadir" abre modal con buscador BGG (extrae lógica de `<GameWithExpansionsPicker>`).
  - Cualquier cambio dispara `PATCH /me` con la lista completa `favoriteGameBggIds`.

- **`ProfilePage`** — `frontend/src/features/profile/pages/ProfilePage.tsx`.
  - Ruta `/profile`, protegida. Wrapper `.mp-mockup` (bg `#FAF7F2`, rounded-xl, shadow) consistente con `MySessionsPage`.
  - Top bar: `<Avatar size=48>` + `@username` + bio inline (muted italic).
  - Secciones (single scroll, `border-b border-muted` entre ellas):
    1. **Avatar** — `<AvatarPicker>`.
    2. **Bio** — textarea + contador + botón "Guardar".
    3. **Juegos favoritos** — `<FavoriteGamesPicker>`.
    4. **Cuenta** — username readonly, email readonly, formulario de cambio de contraseña.

- **`HelpPage`** — `frontend/src/features/help/pages/HelpPage.tsx`.
  - Stub público (no requiere auth). H1 + párrafo con FAQ placeholder + email de soporte. Contenido se itera después.

- **`useTheme()`** — `frontend/src/shared/hooks/useTheme.ts`.
  - `[theme, setTheme]` con persistencia en `localStorage['matchplay-theme']`. Aplica `class="dark"` al `<html>` cuando theme === 'dark'.
  - Inicialización en `main.tsx` o `App.tsx` antes del render para evitar flash.

### Componentes modificados (FE)

- **`SiteHeader`**: el bloque `{user.username} + LogoutButton + LanguageSwitcher` se reemplaza por `<UserMenu>` (un solo componente). En mobile, el burger se mantiene cuando hay user anónimo; cuando hay user autenticado, el avatar reemplaza al burger (mismo onClick que abre el `MobileMenu` drawer).

- **`MobileMenu`**: añadir items "Mi perfil" (activo, link `/profile`), "Mis mensajes" (disabled, próximamente), "Ayuda" (`/help`), toggle Modo oscuro. El item "Mi perfil" disabled actual se quita (ahora activo). Mantiene Partidas, Mis partidas, Idioma, Cerrar sesión.

- **`SessionPlayerRow`**: cambia el span letra+color por `<Avatar size=28 username avatarCode>`.

- **`SessionDetailPage`**: en el header del detail, añade `<Avatar size=24>` antes de "Organiza @{user}".

- **`ChatMessageRow`**: añade `<Avatar size=20>` antes del nombre del autor del mensaje.

- **`useAuth` / `CurrentUser` type**: el `CurrentUser` que devuelve `GET /me` ahora incluye `avatarCode (nullable)` y `bio (nullable)`. Actualizar el tipo TS para que el header acceda a `user.avatarCode`.

### Backend

**Migración Flyway**: `V_X__user_profile.sql`

```sql
ALTER TABLE users
  ADD COLUMN avatar_code VARCHAR(20) NULL AFTER username,
  ADD COLUMN bio VARCHAR(280) NULL AFTER avatar_code;

CREATE TABLE user_favorite_games (
  user_id      BIGINT       NOT NULL,
  game_bgg_id  BIGINT       NOT NULL,
  position     INT          NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, game_bgg_id),
  CONSTRAINT fk_ufg_user FOREIGN KEY (user_id)    REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_ufg_game FOREIGN KEY (game_bgg_id) REFERENCES games(bgg_id) ON DELETE CASCADE,
  INDEX idx_ufg_user_position (user_id, position)
);
```

(Verificar al implementar el next number `V_X` libre — probablemente V10 o V11.)

**DTOs nuevos** (`com.matchplay.user.dto`):

- `UserProfileResponse` (record): `username (String)`, `email (String)`, `avatarCode (String, nullable)`, `bio (String, nullable)`, `favoriteGames (List<GameSummary>)`. `GameSummary = { bggId, name, thumbnailUrl }`.
- `UpdateProfileRequest` (record con validaciones): `avatarCode (Optional<String>)`, `bio (Optional<String>)`, `favoriteGameBggIds (Optional<List<Long>>)`. Validación a nivel de service según las reglas.
- `ChangePasswordRequest` (record): `currentPassword (String, @NotBlank)`, `newPassword (String, @NotBlank @Size(min=8))`.

**Endpoints nuevos** (todos `authenticated()`):

- `GET /api/v1/me` — ya existe; el response se amplía a `UserProfileResponse`.
- `PATCH /api/v1/me` — body `UpdateProfileRequest`. Reglas:
  - `avatarCode`: si presente, matchea `^avatar_(0[1-9]|[12][0-9]|3[01])$` (1..31). Sino 400 `InvalidAvatarCode`.
  - `bio`: si presente, truncar server-side a 280 (defensa en profundidad).
  - `favoriteGameBggIds`: si presente, `.size() ≤ 5` (sino 400 `TooManyFavorites`); cada `bggId` debe existir en `games` (sino 400 `GameNotFound`). El service hace `DELETE FROM user_favorite_games WHERE user_id = ?` y luego inserta los nuevos con `position = 1..N` según el orden de la lista.
- `POST /api/v1/me/password` — body `ChangePasswordRequest`. Verifica `passwordEncoder.matches(currentPassword, user.passwordHash)` o 400 `WrongPassword`. Encode y persiste. NO invalida sesión.

**Modificaciones en signup**:

`AuthServiceImpl.register` asigna `avatarCode = "avatar_" + String.format("%02d", random.nextInt(31) + 1)` antes de persistir. Random injectado (`SecureRandom` bean) para que el test pueda mockear si hace falta.

**DTOs enriquecidos**:

- `SessionDetailResponse`: añadir `creatorAvatarCode (String, nullable)` después de `creatorUsername` (lo consume el header de detail con `<Avatar size=24>`). **Atención**: regla CLAUDE.md — record posicional, grep `new SessionDetailResponse(` en `**/test/**` y actualizar fixtures.
- `SessionDetailResponse.players`: cada `SessionParticipantResponse` añade `avatarCode (String, nullable)` después de `username` (lo consume `SessionPlayerRow`).
- `ChatMessageResponse`: añadir `authorAvatarCode (String, nullable)` después de `authorUsername` (lo consume `ChatMessageRow`).
- `SessionSummaryResponse` **NO se toca** (decidido out of scope para avatares en cards del listado).

**Jackson**: `avatarCode` puede ser null (usuarios legacy sin avatar). El default `non_null` global lo omite del JSON → FE recibe `undefined` y el `<Avatar>` cae al fallback letra+color. Comportamiento correcto, no necesita `@JsonInclude(ALWAYS)`.

## UX

### Dropdown del avatar (desktop)

Items, orden fijo:

1. **Mi perfil** → `/profile`. Icono `User` (lucide).
2. **Mis mensajes** → disabled, pill "Pronto". Icono `MessageSquare`.
3. **Ayuda** → `/help`. Icono `HelpCircle`.
4. **Idioma** → toggle inline `[ES] [EN]` (chips). Click cambia idioma, no cierra el menú. Icono `Globe`.
5. **Modo oscuro** → toggle switch. Click cambia tema, no cierra el menú. Icono `Moon`/`Sun` según estado.
6. **Cerrar sesión** → ejecuta `logout`. Con separador arriba, icono `LogOut`, todo en `text-[#C8362C]`.

A11y:
- Trigger: `aria-haspopup="menu"`, `aria-expanded={open}`.
- Popover: `role="menu"`, items con `role="menuitem"`.
- Esc → cierra. Click fuera → cierra. Click en item navegable → cierra y navega. Click en toggle → cambia y NO cierra.
- Tab/Shift+Tab navegan ítems en orden. Arrow Down/Up también (deseable, no bloqueante).
- Focus visible (ring) en cada item.

### Página `/profile`

Layout (Layout C aprobado):

```
┌──────────────────────────────────────────────────────────┐
│ ░░ mp-mockup wrapper (bg #FAF7F2, rounded, shadow) ░░░░░ │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [Avatar 48] @Cesarby                               │   │ ← top bar (bg white, border-b)
│ │             "bio inline italic muted"              │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ AVATAR                                             │   │
│ │ [grid 7×5 de 31 PNGs, seleccionado con ring blue] │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ BIO                                                │   │
│ │ [textarea 280ch] + [62/280] + [Guardar]            │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ JUEGOS FAVORITOS (máx 5)                          │   │
│ │ [cover Ark Nova ✕] [cover TFM ✕] [+] [+] [+]      │   │
│ ├────────────────────────────────────────────────────┤   │
│ │ CUENTA                                             │   │
│ │ Username: cesarby (no editable)                    │   │
│ │ Email: cesar@... (no editable)                     │   │
│ │ Cambiar contraseña:                                │   │
│ │   [actual] [nueva] [confirmar] [Cambiar]           │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

Comportamientos:

- **Avatar click**: guarda inmediatamente con `PATCH /me`. Optimistic update + rollback en error con mensaje inline.
- **Bio guardar**: botón explícito. Tras éxito, mensaje inline "Guardado" temporal (3s) o badge junto al botón.
- **Favoritos add/remove**: cada cambio dispara `PATCH /me` con la lista completa. Modal BGG search reutiliza la lógica del create-session picker (refactor a componente compartido si es razonable, sino duplicación contenida).
- **Cambiar contraseña**: validación cliente — `newPassword === confirmPassword` (sino "Las contraseñas no coinciden"), `newPassword.length >= 8` (sino "Mínimo 8 caracteres"). En el submit, `POST /me/password`. Éxito → mensaje inline + limpiar inputs. Error 400 `WrongPassword` → inline "Contraseña actual incorrecta".

### Avatar en SessionDetail

- **Header creador**: `<Avatar size=24>` antes del texto `Organiza @user`.
- **Sidebar Apuntados**: `SessionPlayerRow` usa `<Avatar size=28>` en lugar del span letra+color actual. Fallback letra+color automático si `avatarCode` es null.
- **ChatMessageRow**: `<Avatar size=20>` antes del nombre del autor en cada burbuja. Excepción: si `mine`, la burbuja va alineada a la derecha y el avatar se omite (no se duplica con el avatar del header).

### Mobile

- Header mobile autenticado: el botón hamburguesa se reemplaza por el `<Avatar size=32>` del usuario. Tap → abre el `MobileMenu` drawer fullscreen actual.
- `MobileMenu` añade los items nuevos (Mi perfil, Mis mensajes próx, Ayuda, Modo oscuro) y mantiene los actuales (Partidas, Mis partidas, Idioma, Cerrar sesión). Mismo orden visual que el dropdown desktop.
- Anónimo mobile: mantiene el botón hamburguesa actual.

### Edge cases

- Anónimo en `/profile` → redirect `/login?next=/profile`.
- Anónimo en `/help` → accesible.
- Usuario sin `avatarCode` (legacy o si la migración no se ejecutó en su row) → fallback letra+color en todas partes.
- `bio` puede ser `""` o null — render como vacío (no mostrar "null").
- Sin juegos favoritos → grid de 5 slots vacíos con "+".
- Cambio de contraseña con sesión expirada → 401 normal, redirect a login.

## i18n nuevas keys

Estructura propuesta (validar al implementar contra los archivos `es.json` y `en.json`):

```
nav.{profile, messages, help, language, darkMode}

profile.{title, headingAvatar, headingBio, headingFavorites, headingAccount,
         bioPlaceholder, bioCounter, bioSaveButton, bioSavedInline,
         favoritesAdd, favoritesEmpty, favoritesMax,
         avatarSavedInline,
         usernameLabel, usernameHelp, emailLabel, emailHelp,
         changePasswordHeading, currentPasswordLabel, newPasswordLabel, confirmPasswordLabel,
         changePasswordButton, passwordSuccessInline,
         errorWrongPassword, errorPasswordMismatch, errorPasswordTooShort}

help.{title, intro, contactEmail}

common.{savedInline, errorGeneric}
```

(Inline messages temporales — no usamos toasts en v1 porque no hay infra; ver "Toasts" en decisiones cerradas.)

## Plan de migración (alto nivel)

Para writing-plans:

1. **BE migración + tipo avatarCode + endpoint GET enriquecido**. Sin tocar FE todavía.
2. **BE PATCH /me + POST /me/password + tests**. Sin tocar FE.
3. **BE enriquecer DTOs (Session/Chat) con avatarCode + actualizar fixtures**.
4. **FE `<Avatar>` componente + reemplazar en `SessionPlayerRow`** (visible inmediato en apuntados de detail).
5. **FE `<UserMenu>` + integración en `SiteHeader`** (menú desktop + drawer mobile actualizado).
6. **FE página `/profile`** con AvatarPicker, bio, favoritos picker, change password.
7. **FE `<Avatar>` en `SessionDetailPage` header + `ChatMessageRow`**.
8. **FE `useTheme()` + toggle dark mode integrado en menú**.
9. **FE página `/help` stub**.
10. **Docs**: actualizar `docs/backend/modules/auth-spec.md` o crear `users-spec.md`, y `docs/frontend/modules/profile-spec.md` (o sección en auth-spec).

Orden permite ir verificando incrementos visibles (apuntados con avatares es el primer impacto visual con poca infra).

## Out of scope

- Upload de avatares custom por el usuario (no requerido — usamos presets).
- Cambio de username / email (readonly).
- Verificación de email para cambios.
- Notificaciones / "Mis mensajes" (solo placeholder próximamente).
- Settings de notificaciones (depende del módulo de notificaciones no implementado).
- Reorder UI de juegos favoritos (orden = orden de añadido).
- Avatares en `SessionCard` del listado público (decidido NO en este sprint).
- Tooltip para items "Próximamente".
- `prefers-color-scheme` automático para dark mode (default fijo light).
- Sub-rutas dentro de `/profile` (todo en single scroll).

## Open questions

Ninguna pendiente — todas las decisiones cerradas en el brainstorm.

## Referencias

- Mockups de brainstorm: `.superpowers/brainstorm/342-1779966664/content/dropdown-v3.html`, `.superpowers/brainstorm/956-1779960099/content/section-2-v2.html` (layout C aprobado).
- 31 PNGs de avatar: `frontend/src/assets/avatars/avatar_01..31.png` (~40-50KB cada uno, hechos por el equipo).
- Tokens del proyecto: `frontend/src/styles/tokens.css` (cream/Bricolage palette light + dark).
- Regla del proyecto: records Java posicionales (CLAUDE.md) — al añadir `creatorAvatarCode` a `SessionSummaryResponse` y `authorAvatarCode` a `ChatMessageResponse`, grep y actualizar fixtures.
