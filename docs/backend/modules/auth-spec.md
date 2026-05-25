# Módulo Auth — Spec

> Autenticación (JWT access + refresh), autorización por rol y base de
> row-level security para Matchplay.

Referencia capa: [../spec.md](../spec.md) · Global: [../../spec.md](../../spec.md)

---

## Propósito

Este módulo cubre **tres cosas a la vez** que se sostienen mutuamente:

1. **Autenticación** — registrar usuarios, iniciar sesión, renovar token, cerrar sesión. JWT firmado HS512 con refresh rotativo persistido en BD.
2. **Autorización por rol** (role-based security) — `@PreAuthorize` sobre la capa **service**, basada en el enum `Role { ADMIN, SHOP, USER }`. Bloqueo por defecto: todo lo que no esté en la lista pública requiere JWT válido.
3. **Row-level security base** — infraestructura para que cada usuario solo opere sobre sus propios recursos cuando aplique: `CurrentUserProvider`, `AuditorAware<Long>` con `@EnableJpaAuditing`, y helper `assertOwner`.

---

## Decisiones tomadas

| Decisión | Valor | Motivo |
|----------|-------|--------|
| Identificador de login | **email** | `User.getUsername()` ya devuelve email. Username queda como display name. |
| Algoritmo JWT | HS512 | Ya definido en el spec del backend. |
| Vida del access token | 24 h | Ya en `app.jwt.expiration-ms`. |
| Vida del refresh token | 7 días | Ya en `app.jwt.refresh-expiration-ms`. |
| Storage refresh | Tabla `refresh_tokens` | Permite revocar. Era una entidad existente que se borró: hay que rehacerla. |
| Rotación refresh | **Sí** | Cada `/refresh` invalida el anterior y emite uno nuevo. |
| Logout | Revocación del refresh token actual | Sin estado en servidor (access token sigue vivo hasta expirar). |
| Hash de password | BCrypt strength 12 | Ya en el spec del backend. |
| Mínimo password | 8 caracteres, al menos una letra y un número | Validación en DTO. |
| Email verification | **No** en v1 | Out of scope, fuera del MVP. |
| Reset password | **No** en v1 | Out of scope, fuera del MVP. |
| Rate limit en `/auth/*` | Sí | Necesario contra fuerza bruta. Implementación con bucket en memoria (Bucket4j o equivalente). |
| Lockout por fallos | **No** en v1 | Rate limit es suficiente. |
| Refresh token transporte | **Cookie `refresh_token` httpOnly Secure SameSite=Strict Path=`/api/v1/auth`** | Defensa frontal contra XSS. Cambió desde "body JSON" el 2026-05-24. |
| Access token transporte | Header `Authorization: Bearer <token>` | Estándar. |

## Decisiones cerradas (input del usuario)

| Decisión | Valor final |
|----------|-------------|
| Registro: `provinceCode` / `cityCode` / `areaCode` | **Obligatorios** (NOT NULL en la entidad). |
| `selectedAvatar` en registro | **No se elige**: se asigna `avatar_01` por defecto. Formato del code: `avatar_NN`. |
| Rate limit | **Bucket4j**: añadido `bucket4j-core` al pom. |

---

## Endpoints

Base: `/api/v1/auth`

### `POST /api/v1/auth/register` — Registro

**Auth:** público.

Body (`RegisterRequest`):
```json
{
  "email": "ana@example.com",
  "username": "anagamer",
  "password": "Secreta1",
  "name": "Ana Pérez",
  "provinceCode": "08",
  "cityCode": "08019",
  "areaCode": "08019-001"
}
```

Validaciones:
- `email`: `@Email`, `@NotBlank`, único en BD.
- `username`: `@NotBlank`, `@Size(min=3, max=50)`, único en BD.
- `password`: `@NotBlank`, `@Pattern("^(?=.*[A-Za-z])(?=.*\\d).{8,}$")`.
- `name`: `@NotBlank`, `@Size(max=100)`.
- `provinceCode` / `cityCode` / `areaCode`: existir en BD.

Respuesta `201 Created` (`AuthResponse`, body):
```json
{
  "userId": 42,
  "email": "ana@example.com",
  "username": "anagamer",
  "role": "USER",
  "accessToken": "eyJ...",
  "accessTokenExpiresAt": "2026-05-24T18:00:00Z"
}
```

Cabecera adicional:

```
Set-Cookie: refresh_token=<plain>; Max-Age=604800; Path=/api/v1/auth; Secure; HttpOnly; SameSite=Strict
```

(`Secure` se omite en perfil dev/test porque `http://localhost` no la admite.)

Side effects: crea `User` con `role=USER`, `active=true`, `deleted=false`, `selectedAvatar=<default>`, emite access token (en body) + refresh token (en cookie httpOnly, almacenado hasheado en BD).

Errores:
| HTTP | code |
|------|------|
| 400 | validación estándar (`error.validation`) |
| 409 | `error.auth.email.duplicate` |
| 409 | `error.auth.username.duplicate` |
| 404 | `error.geo.province.not.found` / `error.geo.city.not.found` / `error.geo.area.not.found` |

---

### `POST /api/v1/auth/login` — Login

**Auth:** público.

Body (`LoginRequest`):
```json
{ "email": "ana@example.com", "password": "Secreta1" }
```

Respuesta `200 OK`: mismo `AuthResponse` (body recortado + `Set-Cookie`) que register.

Errores:
| HTTP | code |
|------|------|
| 400 | `error.validation` |
| 401 | `error.auth.invalid.credentials` (mismo mensaje para email no existe / password incorrecto / usuario inactivo / borrado) |
| 429 | `error.auth.rate.limited` |

---

### `POST /api/v1/auth/refresh` — Renovar tokens

**Auth:** público (la cookie `refresh_token` actúa de credencial).

**Sin body.** El refresh viaja en la cookie httpOnly que el cliente envió automáticamente. El cliente debe llamar con `credentials: 'include'` (axios `withCredentials: true`).

Lógica:
1. Leer `@CookieValue("refresh_token")`. Si falta / vacía → `401 error.auth.refresh.invalid`.
2. Buscar token en `refresh_tokens` por `token_hash`.
3. Si no existe, ha expirado, o está revocado → `401 error.auth.refresh.invalid`.
4. **Rotación**: marcar el actual como revocado, emitir uno nuevo.
5. Emitir access token nuevo.
6. Devolver `Set-Cookie` con el refresh nuevo (sobrescribe el anterior).

Respuesta `200 OK` (`RefreshResponse`, body):
```json
{
  "accessToken": "eyJ...",
  "accessTokenExpiresAt": "2026-05-24T18:01:00Z"
}
```

Cabecera adicional:

```
Set-Cookie: refresh_token=<plain-rotado>; Max-Age=604800; Path=/api/v1/auth; HttpOnly; SameSite=Strict[; Secure]
```

---

### `POST /api/v1/auth/logout` — Cerrar sesión

**Auth:** público (lee la cookie).

**Sin body.** Lee la cookie igual que refresh.

Lógica:
1. Si la cookie existe → revocar el refresh (idempotente, no falla si ya estaba revocado o no existe en BD).
2. Devolver `204 No Content` + `Set-Cookie` con `Max-Age=0` (instruye al browser a borrar la cookie).

Sin cookie → también `204` + cookie expirada (operación idempotente desde cualquier estado).

---

### `GET /api/v1/auth/me` — Usuario actual

**Auth:** requerido (rol cualquiera).

Respuesta `200 OK`:
```json
{
  "userId": 42,
  "email": "ana@example.com",
  "username": "anagamer",
  "name": "Ana Pérez",
  "role": "USER",
  "ratingAvg": 4.5,
  "rewardPoints": 120,
  "selectedAvatarCode": "av-001"
}
```

---

## Entidades

### `RefreshToken` (a recrear)

Tabla: `refresh_tokens`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | `Long` PK identity | |
| `user_id` | FK → users | NOT NULL, indexado |
| `token_hash` | `varchar(255)` | SHA-256 del token plano. Único. NUNCA guardar el plano. |
| `expires_at` | `timestamp` | NOT NULL |
| `revoked` | `boolean` | default false |
| `revoked_at` | `timestamp` | nullable |
| `replaced_by_token_id` | FK → refresh_tokens.id | nullable, para auditar la cadena de rotación |
| `created_at` | `timestamp` | `@CreationTimestamp` |
| `user_agent` | `varchar(500)` | nullable, capturado en login para diagnóstico |
| `ip_address` | `varchar(45)` | nullable, IPv6-safe |

Cleanup: tarea programada (futuro) que borra tokens con `expires_at < now() - 30d`.

---

## DTOs

Todos como `record`, inmutables, con Bean Validation. Mensajes referencian claves i18n.

- `RegisterRequest` (entrada)
- `LoginRequest` (entrada)
- `AuthResponse` (salida register/login): `userId`, `email`, `username`, `role`, `accessToken`, `accessTokenExpiresAt`. **No expone el refresh** (viaja en cookie).
- `RefreshResponse` (salida refresh): solo `accessToken` + `accessTokenExpiresAt`.
- `CurrentUserResponse` (salida `/me`)

**Borrados** en el refactor a cookie (2026-05-24): `RefreshRequest`, `LogoutRequest`. El refresh ya no se transporta en body.

**Records internos del service** (no expuestos al cliente):

- `AuthIssuance`: lleva el refresh plain del service al controller (para meterlo en cookie).
- `RefreshIssuance`: idem para rotación.

## Cookie de refresh

`RefreshCookieProperties` (`@ConfigurationProperties("app.auth.refresh-cookie")`):

| Property | Default | Notas |
|----------|---------|-------|
| `name` | `refresh_token` | Nombre de la cookie. |
| `path` | `/api/v1/auth` | Restringida a endpoints de auth (principio de menor privilegio). |
| `same-site` | `Strict` | Bloquea cross-site. Requiere mismo dominio registrable front↔back en prod. |
| `secure` | `true` (configurable por perfil) | Dev/test: `false` porque `http://localhost`. Prod: `true`. |
| `max-age-seconds` | `604800` (7 días) | Coincide con `app.jwt.refresh-expiration-ms`. |

Helper `RefreshCookieFactory` con `create(plainToken)` y `clear()` (Max-Age=0).

---

## Configuración Security

Cadena de filtros en `SecurityConfig`:

```
HttpRequest
    │
    ▼
CorsFilter
    │
    ▼
JwtAuthenticationFilter (OncePerRequestFilter)
    │ - Lee Authorization: Bearer <token>
    │ - Si falta → continúa sin autenticación
    │ - Si presente: valida firma + expiración
    │ - Carga User por id del claim 'sub'
    │ - Setea SecurityContextHolder
    ▼
ExceptionTranslationFilter
    │
    ▼
AuthorizationFilter (anyRequest authenticated)
```

Endpoints públicos (explícitos):

```java
.requestMatchers(
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout"
).permitAll()
.requestMatchers(HttpMethod.GET, "/api/v1/games/**").permitAll()
.requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
.requestMatchers("/error").permitAll()
.anyRequest().authenticated()
```

Session policy: `STATELESS`. CSRF: deshabilitado (API JSON). Form login + basic: deshabilitados.

---

## Autorización por rol — uso de `@PreAuthorize`

Se aplica en la capa **service** (no controller, no entity). Spring traduce el rol `Role.ADMIN` a `ROLE_ADMIN` vía `User.getAuthorities()` (ya implementado).

```java
@Service
public class SessionService {

    @PreAuthorize("hasRole('USER')")
    public SessionResponse createSession(SessionRequest req) { ... }

    @PreAuthorize("hasRole('ADMIN')")
    public void forceCancel(Long sessionId) { ... }

    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public List<SessionResponse> listMine() { ... }
}
```

Cuando falla, Spring lanza `AccessDeniedException`. El `GlobalExceptionHandler` ya lo traduce a `403 error.unauthorized`.

---

## Row-level security base

### CurrentUserProvider

```java
@Component
public class CurrentUserProvider {

    public Optional<Long> getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return Optional.empty();
        }
        if (auth.getPrincipal() instanceof User user) {
            return Optional.of(user.getId());
        }
        return Optional.empty();
    }

    public Long requireCurrentUserId() {
        return getCurrentUserId()
                .orElseThrow(() -> new UnauthorizedActionException("error.unauthorized"));
    }
}
```

### AuditorAware<Long> + @EnableJpaAuditing

Para que entidades futuras puedan usar `@CreatedBy private Long createdBy;` y se rellene solo:

```java
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<Long> auditorAware(CurrentUserProvider currentUser) {
        return () -> currentUser.getCurrentUserId();
    }
}
```

### Helper `assertOwner`

Patrón estándar reutilizable en services que tocan recursos con dueño:

```java
public static void assertOwner(Long resourceOwnerId, Long currentUserId) {
    if (!Objects.equals(resourceOwnerId, currentUserId)) {
        throw new UnauthorizedActionException("error.unauthorized");
    }
}
```

Uso típico:
```java
Session session = repo.findById(id).orElseThrow(...);
assertOwner(session.getCreator().getId(), currentUserProvider.requireCurrentUserId());
```

### Qué NO se hace en v1

- **No** se instalan filtros Hibernate `@Filter` globales: no hay services todavía que los necesiten, y añaden complejidad.
- **No** se hace multi-tenant separation a nivel BD.

---

## Excepciones e i18n

Nuevas excepciones en `com.matchplay.auth.exception/`:

- `InvalidCredentialsException` → 401 `error.auth.invalid.credentials`
- `RefreshTokenInvalidException` → 401 `error.auth.refresh.invalid`
- `EmailAlreadyExistsException` → 409 `error.auth.email.duplicate`
- `UsernameAlreadyExistsException` → 409 `error.auth.username.duplicate`
- `RateLimitedException` → 429 `error.auth.rate.limited`

Claves nuevas en `messages_es.properties` / `messages_en.properties`:

```properties
error.auth.email.duplicate=Ya existe una cuenta con ese email
error.auth.username.duplicate=Ya existe una cuenta con ese nombre de usuario
error.auth.refresh.invalid=El token de refresco es inválido o ha expirado
error.auth.rate.limited=Demasiados intentos. Inténtalo de nuevo más tarde
error.geo.province.not.found=La provincia con código {0} no existe
error.geo.city.not.found=La localidad con código {0} no existe
error.geo.area.not.found=La zona con código {0} no existe
```

(Las claves `error.auth.invalid.credentials`, `error.auth.token.expired`, `error.auth.token.invalid`, `error.unauthorized` ya existen.)

Handlers nuevos en `GlobalExceptionHandler`: uno por excepción custom.

---

## Estructura de paquetes

```
com.matchplay.auth/
├── controller/
│   └── AuthController.java
├── service/
│   ├── AuthService.java
│   ├── AuthServiceImpl.java
│   ├── AuthIssuance.java            ← record interno (datos register/login)
│   ├── RefreshIssuance.java         ← record interno (datos rotación)
│   ├── JwtTokenProvider.java
│   ├── RefreshTokenService.java
│   └── UserDetailsServiceImpl.java
├── filter/
│   └── JwtAuthenticationFilter.java
├── ratelimit/
│   └── AuthRateLimitFilter.java     ← Bucket4j en memoria
├── security/
│   ├── RefreshCookieProperties.java
│   ├── RefreshCookieFactory.java
│   └── RestAuthenticationEntryPoint.java
├── entity/
│   └── RefreshToken.java
├── repository/
│   ├── RefreshTokenRepository.java
│   └── (UserRepository va en user/repository/ — pertenece a Usuarios)
├── dto/
│   ├── RegisterRequest.java
│   ├── LoginRequest.java
│   ├── AuthResponse.java
│   ├── RefreshResponse.java
│   └── CurrentUserResponse.java
├── exception/
│   ├── InvalidCredentialsException.java
│   ├── RefreshTokenInvalidException.java
│   ├── EmailAlreadyExistsException.java
│   ├── UsernameAlreadyExistsException.java
│   └── RateLimitedException.java
└── mapper/
    └── UserAuthMapper.java
```

Componentes que viven fuera del módulo pero los toca este spec:

- `com.matchplay.user.repository.UserRepository` (módulo Usuarios)
- `com.matchplay.config.SecurityConfig` (update: filtro + reglas)
- `com.matchplay.config.JpaAuditingConfig` (nuevo)
- `com.matchplay.security.CurrentUserProvider` (nuevo, paquete `security/` compartido)

---

## Testing

- **JwtTokenProvider**: unit, genera y valida tokens, expira correctamente, firma incorrecta rechazada.
- **RefreshTokenService**: unit con Mockito, rotación correcta, no permite usar token revocado, hash determinista.
- **AuthService.register**: unit, valida email/username únicos, persiste user, devuelve par de tokens.
- **AuthService.login**: unit, devuelve 401 con misma key para email inexistente y password incorrecto (no leakea cuál falla), 401 para usuario `!active` o `deleted`.
- **JwtAuthenticationFilter**: integración ligera con MockMvc, request con Bearer válido → autenticado, sin header → no autenticado pero permite pasar a endpoints públicos.
- **AuthController**: MockMvc — happy path register/login/refresh/logout/me, 400 validación, 401 credenciales, 409 duplicados, 429 rate limit.
- **CurrentUserProvider**: unit con SecurityContext mockeado, devuelve userId, vacío sin auth.
- **Smoke de cadena completa**: integración con `@SpringBootTest(webEnvironment=RANDOM_PORT)` que llama register → login → endpoint protegido `/me` → refresh → logout → 401 en `/me`.

---

## Fuera de alcance

- Email verification.
- Password reset / "olvidé mi contraseña".
- OAuth2 / login social.
- 2FA.
- Sesiones concurrentes y devices: tabla `refresh_tokens` lo permitiría pero no se expone UI todavía.
- Multi-tenant separation a nivel BD.
- Filtros Hibernate `@Filter` por owner.

---

## Cambios fuera del módulo Auth pero necesarios

- **SecurityConfig** (`config/`): añadir `JwtAuthenticationFilter` antes de `UsernamePasswordAuthenticationFilter`, cambiar `anyRequest().permitAll()` por la lista explícita de arriba.
- **pom.xml**: añadir `com.bucket4j:bucket4j-core` (rate limit).
- **GlobalExceptionHandler**: 5 handlers nuevos.
- **i18n**: 7 claves nuevas (`error.auth.*` + `error.geo.*`).
- **UserRepository** (módulo `user/repository/`): crear si no existe. Necesario para `UserDetailsServiceImpl`.
- **JpaAuditingConfig** + `CurrentUserProvider`: en `config/` y `security/`.
