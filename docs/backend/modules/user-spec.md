# Módulo Usuarios — Perfil — Spec

> Perfil de usuario: avatar preset (31 PNGs), bio breve, juegos favoritos,
> cambio de contraseña. Endpoints `/api/v1/me/profile` complementarios al
> `GET /api/v1/me` ligero del módulo Auth.

Referencia capa: [../spec.md](../spec.md) · Global: [../../spec.md](../../spec.md)
· Auth (autenticación, registro, `/me` ligero): [auth-spec.md](auth-spec.md)

---

## Propósito

Este módulo cubre la "identidad pública del usuario" más allá del email/username
de signup:

1. **Avatar visual** — 31 PNGs preset elegibles desde `ProfilePage`. Se asigna
   uno aleatorio en signup. El `code` (`avatar_NN`) viaja en los DTOs de
   `sessions`, `chat` y `/me` para que el FE pinte el `<Avatar>` unificado.
2. **Bio breve** — texto libre máximo 280 caracteres, mostrada en cabecera del
   perfil. Nullable (vacía = sin bio).
3. **Juegos favoritos** — hasta 5 juegos del catálogo BGG cacheado, expuestos
   en perfil. Estrategia "replace": cada PATCH borra y vuelve a insertar.
4. **Cambio de contraseña** — endpoint dedicado que verifica la contraseña
   actual, sin invalidar la sesión.

Lo que **no** está en este módulo:

- Registro / login / refresh / logout → [auth-spec.md](auth-spec.md).
- Email verification, reset password, OAuth, 2FA → fuera de v1.
- Cambio de username/email → fuera de v1 (readonly en el FE).

---

## Decisiones cerradas

| Decisión | Valor | Motivo |
|----------|-------|--------|
| Storage de avatar | **Presets PNG** (`avatar_01`…`avatar_31`) servidos desde `frontend/src/assets/avatars/` | Sin upload de imágenes (out of MVP). Tabla `avatars` cacheada en BD con `code`, `name`, `required_points`, `display_order`, `active`. |
| Asignación inicial | Aleatoria entre los avatares con `active=true` y `required_points <= 0` | Cada signup arranca con identidad visual única, no todos con `avatar_01`. |
| Email | **Readonly** en el FE, sin endpoint para cambiarlo | Fricción / verificación pendiente. |
| Username | **Readonly** en el FE, sin endpoint para cambiarlo | Misma fricción + integridad de menciones futuras. |
| Bio | Máx 280 chars, **truncate server-side** además del `@Size` | Defensa en profundidad: si el FE no respeta el contador, BBDD no se rompe. |
| Favoritos | Máx 5, FK al catálogo `games` (bggId debe existir) | Limita listado a juegos conocidos por BGG. |
| Estrategia PATCH favoritos | **Replace** (`deleteByUserId` + inserts en orden) | Más simple que diffs; idempotente; la cardinalidad es ≤ 5. |
| Cambio de password | Verifica `passwordEncoder.matches(current, hash)`, NO invalida sesión | UX: el usuario sigue logueado tras cambiar password. |
| URL base profile | `/api/v1/me/profile` | No choca con `GET /api/v1/me` (ligero del módulo Auth). |
| Serialización `avatarCode` | Jackson global `non_null` lo omite si null | FE lo tipa como opcional (`avatarCode?: string`). Coherente con regla del proyecto en CLAUDE.md. |
| `favoriteGames` en response | `@JsonInclude(ALWAYS)` a nivel de `UserProfileResponse` | El FE necesita la lista vacía explícita (`[]`) para renderizar los 5 slots vacíos del picker. |

---

## Schema (Flyway)

### Pre-existentes en V1 (baseline)

Las tablas/columnas siguientes ya existían cuando arrancó este módulo (creadas
por el baseline V1 que no está en git):

- `avatars` — `code VARCHAR(20) PK`, `name`, `required_points INT`, `display_order INT`, `active BOOLEAN`.
- `users.selected_avatar_code` — FK NOT NULL a `avatars(code)`.
- `users.bio` — `VARCHAR(280)` NULL.
- `user_favorite_games` — `(id, user_id, bgg_game_id, created_at)`, UNIQUE `(user_id, bgg_game_id)`.

### `V12__avatars_seed.sql`

Seed de los 31 avatares preset que corresponden 1:1 a los PNGs en
`frontend/src/assets/avatars/avatar_NN.png`.

```sql
INSERT IGNORE INTO avatars (code, name, required_points, display_order, active) VALUES
  ('avatar_01', 'Avatar 1',  0,  1, true),
  -- ...
  ('avatar_31', 'Avatar 31', 0, 31, true);
```

- `INSERT IGNORE` para no romper si alguno ya estaba seedado manualmente
  (ej. `avatar_01` que servía de default).
- `required_points = 0` en todos → elegibles desde el día 1, sin gating por
  el sistema de rewards (que existe en la tabla pero no se usa todavía).
- Tests usan H2 con `ddl-auto=create-drop` y **NO ejecutan Flyway** — los
  tests que tocan `avatars` seedean explícitamente en `@BeforeEach`
  (ver `AuthFlowTest`).

---

## Asignación aleatoria de avatar en signup

En `AuthServiceImpl.register()`, sustituido el `findById("avatar_01")` por:

```java
List<Avatar> eligibleAvatars =
    avatarRepository.findByActiveTrueAndRequiredPointsLessThanEqual(0);
if (eligibleAvatars.isEmpty()) {
    throw new IllegalStateException("No avatars available for signup. Seed V12.");
}
Avatar randomAvatar = eligibleAvatars.get(
    new SecureRandom().nextInt(eligibleAvatars.size()));
user.setSelectedAvatar(randomAvatar);
```

`AvatarRepository.findByActiveTrueAndRequiredPointsLessThanEqual(int)` es
nuevo. `SecureRandom` (no `Random`) por defensa: previene predictibilidad de
qué avatar tocó a cada usuario (irrelevante de seguridad, pero coste cero).

`AuthFlowTest` seedea solo `avatar_01` en `@BeforeEach`, así el random
siempre cae en él y la aserción del test sigue siendo determinista.

---

## Endpoints

Base: `/api/v1/me/profile`. Todos requieren JWT (cubiertos por
`anyRequest().authenticated()` en `SecurityConfig`).

### `GET /api/v1/me/profile` — Perfil completo

**Auth:** JWT requerido.

Respuesta `200 OK` — `UserProfileResponse`:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "avatarCode": "avatar_07",
  "bio": "Aficionada a euros pesados.",
  "favoriteGames": [
    { "bggId": 13, "name": "Catan", "thumbnailUrl": "https://cf.geekdo-images.com/..." },
    { "bggId": 169786, "name": "Scythe", "thumbnailUrl": "..." }
  ]
}
```

- `avatarCode`: nullable. Si null se omite del JSON (Jackson `non_null` global
  para el record — el campo se queda en sus límites por defecto). El FE lo
  trata como opcional.
- `bio`: nullable. Omitido del JSON si null.
- `favoriteGames`: **siempre presente** (lista vacía si no hay) gracias al
  `@JsonInclude(JsonInclude.Include.ALWAYS)` a nivel de record. Esto permite
  al FE pintar los 5 slots vacíos del picker sin defensas adicionales.

### `PATCH /api/v1/me/profile` — Actualizar avatar / bio / favoritos

**Auth:** JWT requerido.

Body — `UpdateProfileRequest` (todos los campos opcionales; `null` = no se toca):

```json
{
  "avatarCode": "avatar_15",
  "bio": "Nuevo lema.",
  "favoriteGameBggIds": [13, 169786, 174430]
}
```

Validaciones Bean Validation:

- `avatarCode`: `@Pattern("^avatar_(0[1-9]|[12][0-9]|3[01])$")` → solo `avatar_01`…`avatar_31`. Si no matchea → 400 `error.profile.invalid.avatar.code`.
- `bio`: `@Size(max = 280)` → si excede → 400 `error.profile.bio.too.long`. **Además** truncate server-side a 280 antes de persistir (defensa en profundidad: el `@Size` rechaza el request entero, el truncate evita que un payload borderline llegue a la BBDD con basura).
- `favoriteGameBggIds`: sin `@Size` explícito; el service valida `<= 5` y lanza `TooManyFavoritesException`.

Reglas del service:

1. Si `avatarCode != null` → `avatarRepository.findById(code).orElseThrow(InvalidAvatarCodeException)` y `user.setSelectedAvatar(avatar)`.
2. Si `bio != null` → truncate a 280 chars. String vacío → `null` (no se persiste basura).
3. Si `favoriteGameBggIds != null`:
   - Tamaño > 5 → `TooManyFavoritesException`.
   - `favoriteRepository.deleteByUserId(userId)` (replace strategy).
   - Para cada `bggId` en orden, `gameRepository.findByBggId(id).orElseThrow(...)` y persiste `UserFavoriteGame(user, game, createdAt=now())`.

Respuesta `200 OK` con el `UserProfileResponse` refrescado (llama a
`getCurrent()` internamente para devolver el estado consistente).

Errores:

| HTTP | i18n key | Cuándo |
|------|----------|--------|
| 400 | `error.validation` | `@Pattern` o `@Size` falla |
| 400 | `error.profile.invalid.avatar.code` | code válido en regex pero no existe en `avatars` |
| 400 | `error.profile.too.many.favorites` | > 5 favoritos |
| 404 | (de `games`) | `bggId` no está en el catálogo |

### `POST /api/v1/me/profile/password` — Cambiar contraseña

**Auth:** JWT requerido.

Body — `ChangePasswordRequest`:

```json
{ "currentPassword": "Secreta1", "newPassword": "MasSegura2" }
```

Validaciones:

- `currentPassword`: `@NotBlank`.
- `newPassword`: `@NotBlank`, `@Size(min = 8)`.

Lógica del service:

1. `passwordEncoder.matches(currentPassword, user.passwordHash)` — si false → `WrongPasswordException` (400 `error.profile.password.wrong`).
2. `user.setPasswordHash(passwordEncoder.encode(newPassword))` + `userRepository.save(user)`.
3. **No invalida la sesión actual** ni revoca refresh tokens — el usuario sigue logueado con los mismos tokens. (Trade-off conocido: si el caso de uso es "alguien me robó la cuenta y quiero cerrar todas las sesiones", el flujo a usar es el de reset password — out of scope v1.)

Respuesta `204 No Content`.

---

## DTOs

Todos como `record` inmutables.

| DTO | Tipo | Notas |
|-----|------|-------|
| `UserProfileResponse` | salida `GET /PATCH` | `@JsonInclude(ALWAYS)`. Campos: `username`, `email`, `avatarCode`, `bio`, `favoriteGames: List<FavoriteGameSummary>`. |
| `FavoriteGameSummary` | nested | `bggId`, `name`, `thumbnailUrl`. |
| `UpdateProfileRequest` | entrada `PATCH` | `avatarCode` con `@Pattern`, `bio` con `@Size(max=280)`, `favoriteGameBggIds: List<Long>`. Todos nullable. |
| `ChangePasswordRequest` | entrada `POST /password` | `currentPassword @NotBlank`, `newPassword @NotBlank @Size(min=8)`. |

---

## Excepciones e i18n

Todas en `com.matchplay.user.exception`, heredando de `RuntimeException` (consistente con el resto del proyecto que NO usa una base común `MatchplayException` para excepciones de dominio — `GlobalExceptionHandler` mapea por tipo):

| Excepción | HTTP | i18n key |
|-----------|------|----------|
| `WrongPasswordException` | 400 | `error.profile.password.wrong` |
| `InvalidAvatarCodeException` | 400 | `error.profile.invalid.avatar.code` |
| `TooManyFavoritesException` | 400 | `error.profile.too.many.favorites` |

Claves nuevas en `messages.properties` / `messages_en.properties`:

```properties
error.profile.invalid.avatar.code=Código de avatar inválido
error.profile.bio.too.long=La biografía supera el máximo de 280 caracteres
error.profile.too.many.favorites=Máximo 5 juegos favoritos
error.profile.password.wrong=Contraseña actual incorrecta
error.profile.password.too.short=La nueva contraseña debe tener al menos 8 caracteres
```

Mapeo en `GlobalExceptionHandler`: un `@ExceptionHandler` por cada una.

---

## DTOs enriquecidos con `avatarCode`

Para que el FE pinte el `<Avatar>` unificado en sidebar, header de detail y
chat, los DTOs existentes de `session/chat` se enriquecieron:

| DTO | Campo nuevo | Posición |
|-----|-------------|----------|
| `SessionSummaryResponse` | `creatorAvatarCode: String` | **último** campo del record |
| `SessionPlayerResponse` | `avatarCode: String` | **después de** `username` |
| `SessionMessageResponse` | `authorAvatarCode: String` | **después de** `username` (autor) |

Mappers actualizados:

- `SessionMapper.toSummary(session)` — pasa `session.getCreator().getSelectedAvatar().getCode()` (null-safe).
- `SessionMapper.toPlayer(participant)` — pasa `participant.getUser().getSelectedAvatar().getCode()` (null-safe).
- `SessionChatServiceImpl.toResponse(message)` — pasa `message.getAuthor().getSelectedAvatar().getCode()` (null-safe).

> **Nota Jackson `non_null` global**: si el usuario no tiene avatar
> (escenario improbable: signup falló a mitad, datos antiguos), el campo se
> omite del JSON y el FE lo recibe como `undefined`. Coherente con regla
> CLAUDE.md ("avatarCode nullable → omitido → FE recibe undefined"). El FE
> lo tipa como `avatarCode?: string` (no `string | null`) y el componente
> `<Avatar>` cae al fallback letra+color cuando es `undefined`.

> **Trampa de records posicionales**: los tests construyen estos records
> con `new SessionSummaryResponse(...)` posicional. Al añadir el campo, hay
> que `grep` todas las invocaciones en `**/test/**` y añadir el argumento
> nuevo (en general `null` o `"avatar_07"`). Ver el helper `detail()` en
> `GameSessionServiceImplTest`.

---

## Estructura de paquetes

```
com.matchplay.user/
├── controller/
│   └── MeController.java                    (GET /, PATCH /, POST /password)
├── service/
│   ├── ProfileService.java                  (interface)
│   └── ProfileServiceImpl.java              (@Transactional, lee/escribe user + favoritos)
├── repository/
│   └── UserFavoriteGameRepository.java      (findByUserIdOrderByCreatedAtAsc, deleteByUserId, countByUserId)
├── dto/
│   ├── UserProfileResponse.java             (@JsonInclude ALWAYS)
│   ├── FavoriteGameSummary.java
│   ├── UpdateProfileRequest.java
│   └── ChangePasswordRequest.java
└── exception/
    ├── WrongPasswordException.java
    ├── InvalidAvatarCodeException.java
    └── TooManyFavoritesException.java
```

Componentes que viven fuera pero los toca este spec:

- `com.matchplay.avatar.repository.AvatarRepository` — añadido método `findByActiveTrueAndRequiredPointsLessThanEqual(int)`.
- `com.matchplay.auth.service.AuthServiceImpl` — random avatar en `register()`.
- `com.matchplay.auth.dto.CurrentUserResponse` — añadido campo `bio` al final del record.
- `com.matchplay.session.dto.*` + mappers — campos `avatarCode` (ver sección anterior).
- `com.matchplay.exception.GlobalExceptionHandler` — 3 handlers nuevos.

---

## Seguridad

```java
// SecurityConfig.java — sin reglas dedicadas, todos los /me/profile/** caen en:
.anyRequest().authenticated()
```

No hay `@PreAuthorize` en los métodos del service: el `CurrentUserProvider`
resuelve el usuario actual desde el `SecurityContextHolder` (lo pone
`JwtAuthenticationFilter`). Sin autenticación → el filtro de autorización
de Spring devuelve 401 antes de llegar al controller.

---

## Testing

- `ProfileServiceImplTest` (Mockito): `getCurrent` con/sin favoritos, `update` cambia avatar / bio / favoritos / lanza `TooManyFavoritesException`, `update` trunca bio a 280, `changePassword` happy path y `WrongPasswordException`.
- `MeControllerTest` (MockMvc standalone): GET 200, PATCH 200, PATCH 400 con avatar inválido, POST /password 204, POST /password 400 con password corta.
- `AuthFlowTest` (smoke completo): registro asigna avatar (única opción seedada = avatar_01) → login → `GET /me` devuelve `selectedAvatarCode` y `bio` nullable.

---

## Fuera de alcance

- Upload de avatares custom (S3 / Cloudinary).
- Cambio de email / username.
- Reset password / "olvidé mi contraseña".
- Invalidación de refresh tokens al cambiar password.
- Notificaciones (al añadir/quitar favorito, al editar perfil).
- Privacidad granular (qué del perfil ve cada rol).
