# Frontend · Módulo Auth — Spec

> Autenticación en el cliente: register/login/refresh/logout/me, guards de rutas
> por rol, y refactor necesario en el backend para mover el refresh token a
> cookie httpOnly Secure SameSite=Strict.

Referencia capa: [../spec.md](../spec.md) · Módulo backend correspondiente: [../../backend/modules/auth-spec.md](../../backend/modules/auth-spec.md)

---

## Propósito

Cubre toda la experiencia de identidad del usuario en el frontend:

1. Pantallas de **login** y **registro**.
2. **Persistencia de sesión**: access token en memoria + refresh token en cookie httpOnly.
3. **Refresco automático** (proactivo y reactivo en 401).
4. **Logout** explícito y **auto-logout** ante invalidez del refresh.
5. **Guards** de rutas: `<ProtectedRoute>` y `<RoleRoute>` para gating por autenticación y por rol.
6. **Boot de la app**: rehidratar la sesión si hay refresh válido.
7. **Multi-pestaña**: sincronizar login/logout entre pestañas abiertas.
8. **Mensajes de error** y validaciones alineadas con el backend (i18n).
9. **Refactor del backend** (mismo doc, sección dedicada).

---

## Decisiones cerradas

| Decisión | Valor | Notas |
|----------|-------|-------|
| Access token storage | **Memoria (Zustand)** | Nunca persistido. Se reemite en cada refresh. |
| Refresh token storage | **Cookie `refresh_token` httpOnly Secure SameSite=Strict Path=/api/v1/auth** | Set por el backend. Frontend nunca la lee ni la escribe (no puede). |
| Transporte refresh | **Cookie en cada request a `/api/v1/auth/refresh` y `/logout`** | Axios con `withCredentials: true`. |
| Cookie `Secure` | **true en prod, false en dev** (perfil) | En dev usamos http://localhost; `Secure=true` impediría su envío. |
| Cookie `SameSite` | **Strict** | Requiere que `app.matchplay.com` y `api.matchplay.com` compartan dominio registrable. |
| Boot sequence | `POST /auth/refresh` → si OK, `GET /auth/me` → hidrata `authStore` | Si falla → estado anónimo. |
| Refresh proactivo | setTimeout 60s antes de `accessTokenExpiresAt` | Cancelar al logout o si se vuelve a refrescar. |
| Refresh reactivo | Interceptor 401 → reintenta UNA vez tras `/refresh` | Si vuelve a fallar → logout. |
| Multi-pestaña | **BroadcastChannel API** (`matchplay-auth`) | Eventos: `login`, `logout`, `refreshed`. |
| Recordar usuario | Por defecto sí (cookie 7 días) | No hay opción "remember me / forget me" en v1. |
| Verificación email | **No en v1** | Out of scope, ya documentado en backend. |
| Reset password | **No en v1** | Out of scope. |
| Login social (OAuth) | **No en v1** | Out of scope. |

---

## Cambios necesarios en el backend

Esta sección **debe aplicarse antes** de implementar el frontend de auth.
Cuando se implemente, actualizar también [../../backend/modules/auth-spec.md](../../backend/modules/auth-spec.md) en consecuencia.

### Endpoints — cambios concretos

#### `POST /api/v1/auth/register`

- **Sigue devolviendo** `AuthResponse` JSON.
- **NUEVO**: además, emite `Set-Cookie: refresh_token=<plain>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800`.
- **CAMBIO**: `AuthResponse` ya **no** incluye `refreshToken` ni `refreshTokenExpiresAt`. Solo:
  ```json
  {
    "userId": 42,
    "email": "ana@example.com",
    "username": "anagamer",
    "role": "USER",
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-05-24T20:00:00Z"
  }
  ```

#### `POST /api/v1/auth/login`

- Idéntico a register en cuanto a cookie + body recortado.

#### `POST /api/v1/auth/refresh`

- **NO** recibe body. El refresh viaja en la cookie.
- Lee con `@CookieValue("refresh_token") String refreshToken`.
- Si la cookie falta o es inválida → 401 `error.auth.refresh.invalid`.
- Rota: revoca el actual, emite uno nuevo, lo setea como `Set-Cookie` (sobreescribe el anterior).
- Devuelve solo el access token nuevo:
  ```json
  {
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-05-24T20:01:00Z"
  }
  ```
- `RefreshRequest` se borra del proyecto.

#### `POST /api/v1/auth/logout`

- **NO** recibe body. Lee la cookie igual que refresh.
- Revoca el refresh actual si existe (idempotente, no falla si ya está revocado).
- Devuelve `204 No Content` + `Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0` (borra la cookie).
- `LogoutRequest` se borra del proyecto.

#### `GET /api/v1/auth/me`

- **Sin cambios**. Requiere access token en `Authorization: Bearer`.

### Configuración

- Property nueva: `app.auth.refresh-cookie.secure=${REFRESH_COOKIE_SECURE:true}`.
  - En `application-dev.properties`: `app.auth.refresh-cookie.secure=false`.
  - En prod / por defecto: `true`.
- Property: `app.auth.refresh-cookie.name=refresh_token`.
- Property: `app.auth.refresh-cookie.path=/api/v1/auth`.
- Property: `app.auth.refresh-cookie.same-site=Strict`.
- En `SecurityConfig`: ya `setAllowCredentials(true)` y `Authorization` permitido en `setAllowedHeaders`. ✓ No requiere cambios.

### Tests del backend

`AuthFlowTest` cambia:

- En register/login: ya no leer `refreshToken` del JSON; leer **cookie** del response con `mockMvc.perform(...).andReturn().getResponse().getCookie("refresh_token")`.
- En refresh/logout: enviar la cookie con `.cookie(new Cookie("refresh_token", value))` en lugar de body.
- Asserts nuevos: la cookie debe tener `httpOnly=true`, `secure` según perfil, `sameSite="Strict"`, `path="/api/v1/auth"`.
- Test nuevo: tras `/refresh`, debe llegar **nueva cookie** con valor distinto al anterior.
- Test nuevo: tras `/logout`, debe llegar cookie con `Max-Age=0`.

### Implicaciones en prod

- Frontend en `app.matchplay.com`, backend en `api.matchplay.com`. **Mismo registrable domain** `matchplay.com` → `SameSite=Strict` funciona.
- Si fueran dominios distintos (`matchplay.com` y `api-matchplay.io`), `SameSite=Strict` bloquea la cookie. Habría que bajar a `Lax` o reorganizar dominios.
- HTTPS obligatorio en prod por `Secure`.

---

## Arquitectura del módulo (frontend)

```
features/auth/
├── api/
│   └── authApi.ts                # cliente axios contra /api/v1/auth/*
├── components/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── AuthBootSplash.tsx        # spinner mientras /refresh + /me al boot
├── hooks/
│   ├── useAuth.ts                # selector del store
│   ├── useLoginMutation.ts
│   ├── useRegisterMutation.ts
│   ├── useLogoutMutation.ts
│   └── useCurrentUserQuery.ts
├── pages/
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── store/
│   └── authStore.ts              # Zustand: usuario, accessToken, expiraciones
├── guards/
│   ├── ProtectedRoute.tsx
│   └── RoleRoute.tsx
├── lib/
│   ├── refreshScheduler.ts       # programa refresh proactivo
│   ├── authBroadcast.ts          # BroadcastChannel('matchplay-auth')
│   └── errorMapping.ts           # ApiError.code → i18n keys de form
├── types/
│   └── auth.types.ts
├── index.ts                      # API pública del módulo
└── __tests__/
    ├── authStore.test.ts
    ├── refreshScheduler.test.ts
    ├── LoginForm.test.tsx
    ├── ProtectedRoute.test.tsx
    └── authFlow.test.tsx         # integración con MSW
```

---

## `authStore` (Zustand)

```ts
type AuthState = {
  accessToken: string | null
  accessTokenExpiresAt: number | null   // epoch ms
  currentUser: CurrentUser | null
  status: 'idle' | 'booting' | 'authenticated' | 'anonymous'
}

type AuthActions = {
  setAuthenticated: (user: CurrentUser, token: string, expiresAt: number) => void
  setAccessToken: (token: string, expiresAt: number) => void
  setCurrentUser: (user: CurrentUser) => void
  clear: () => void                     // limpia todo (logout local)
  markBooting: () => void
  markAnonymous: () => void
}

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  currentUser: null,
  status: 'idle',
  setAuthenticated: (user, token, expiresAt) =>
    set({ accessToken: token, accessTokenExpiresAt: expiresAt, currentUser: user, status: 'authenticated' }),
  setAccessToken: (token, expiresAt) =>
    set({ accessToken: token, accessTokenExpiresAt: expiresAt }),
  setCurrentUser: (user) => set({ currentUser: user }),
  clear: () => set({ accessToken: null, accessTokenExpiresAt: null, currentUser: null, status: 'anonymous' }),
  markBooting: () => set({ status: 'booting' }),
  markAnonymous: () => set({ status: 'anonymous' }),
}))
```

**Reglas:**
- **Sin `persist`**: el access token nunca toca `localStorage`. Tras un refresh duro del browser, se rehidrata vía `/refresh` (cookie).
- Selectores derivados:
  - `useIsAuthenticated()` → `useAuthStore(s => s.status === 'authenticated')`
  - `useCurrentUser()` → `useAuthStore(s => s.currentUser)`
  - `useUserRole()` → `useAuthStore(s => s.currentUser?.role)`

---

## `authApi.ts`

```ts
export const authApi = {
  register: (body: RegisterPayload) =>
    httpClient.post<AuthResponse>('/auth/register', body),

  login: (body: LoginPayload) =>
    httpClient.post<AuthResponse>('/auth/login', body),

  // Sin body — la cookie viaja sola gracias a withCredentials: true.
  refresh: () =>
    httpClient.post<RefreshResponse>('/auth/refresh'),

  logout: () =>
    httpClient.post<void>('/auth/logout'),

  me: () =>
    httpClient.get<CurrentUserResponse>('/auth/me'),
}
```

Tipos:

```ts
export type CurrentUser = {
  userId: number
  email: string
  username: string
  name: string
  role: 'USER' | 'ADMIN' | 'SHOP'
  ratingAvg: number
  rewardPoints: number
  selectedAvatarCode: string
}

export type RegisterPayload = {
  email: string
  username: string
  password: string
  name: string
  provinceCode: string
  cityCode: string
  areaCode: string
}

export type LoginPayload = { email: string; password: string }

export type AuthResponse = {
  userId: number
  email: string
  username: string
  role: 'USER' | 'ADMIN' | 'SHOP'
  accessToken: string
  accessTokenExpiresAt: string   // ISO
}

export type RefreshResponse = {
  accessToken: string
  accessTokenExpiresAt: string
}
```

---

## Flujos detallados

### Boot (al cargar la app)

```
main.tsx renderiza
   │
   ▼
authStore.status = 'idle'
   │
   ▼
<App> useEffect(boot, []):
   │
   ├─ authStore.markBooting()
   │
   ├─ try authApi.refresh()
   │    ├─ OK → authStore.setAccessToken(...)
   │    │       └─ try authApi.me()
   │    │            ├─ OK → authStore.setAuthenticated(user, token, exp)
   │    │            │       └─ refreshScheduler.schedule()
   │    │            └─ FAIL → authStore.clear()
   │    └─ FAIL → authStore.markAnonymous()
   │
   ▼
render `<RouterProvider>` (oculto tras `<AuthBootSplash>` mientras status === 'booting')
```

**`<AuthBootSplash>`**: spinner discreto. Evita flash de página de login para usuarios que sí tienen sesión válida.

### Register

1. `<RegisterForm>` valida con `zod`.
2. `useRegisterMutation` llama `authApi.register(payload)`.
3. Backend devuelve `AuthResponse` + setea cookie.
4. `onSuccess`:
   - `authStore.setAuthenticated(...)` con `userId`, `email`, `username`, `role` del response. Para el resto del perfil (`name`, `ratingAvg`, `rewardPoints`, `selectedAvatarCode`) → llamar `authApi.me()` y `setCurrentUser`.
   - `refreshScheduler.schedule()`.
   - `authBroadcast.publish('login')`.
   - Redirect a `/` (o a `from` si venía de un deep link).
5. `onError` → mapear `ApiError.code` a mensaje en form (ver "Mensajes de error").

### Login

Igual que register pero llamando `authApi.login`.

### Refresh proactivo

```ts
// lib/refreshScheduler.ts
let timerId: number | null = null
const LEAD_TIME_MS = 60_000

export const refreshScheduler = {
  schedule() {
    this.cancel()
    const expiresAt = useAuthStore.getState().accessTokenExpiresAt
    if (!expiresAt) return
    const delay = Math.max(0, expiresAt - Date.now() - LEAD_TIME_MS)
    timerId = window.setTimeout(async () => {
      try {
        const { data } = await authApi.refresh()
        useAuthStore.getState().setAccessToken(
          data.accessToken,
          Date.parse(data.accessTokenExpiresAt),
        )
        authBroadcast.publish('refreshed')
        this.schedule()  // re-encolar
      } catch {
        // el interceptor reactivo se encargará si hay un request en vuelo
      }
    }, delay)
  },
  cancel() {
    if (timerId !== null) {
      clearTimeout(timerId)
      timerId = null
    }
  },
}
```

### Refresh reactivo (interceptor)

```ts
httpClient.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthEndpoint(original.url)         // evita bucle en /login, /refresh, /logout
    ) {
      original._retry = true
      try {
        const { data } = await authApi.refresh()
        useAuthStore.getState().setAccessToken(
          data.accessToken,
          Date.parse(data.accessTokenExpiresAt),
        )
        refreshScheduler.schedule()
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return httpClient(original)
      } catch {
        useAuthStore.getState().clear()
        refreshScheduler.cancel()
        authBroadcast.publish('logout')
        window.location.assign('/login?reason=session-expired')
        return Promise.reject(error)
      }
    }
    return Promise.reject(normalizeApiError(error))
  }
)
```

### Logout

1. Usuario click en "Cerrar sesión".
2. `useLogoutMutation` llama `authApi.logout()`.
3. Backend revoca + borra cookie. Pase lo que pase con la red:
   - `authStore.clear()`.
   - `refreshScheduler.cancel()`.
   - `qc.clear()` (TanStack QueryClient: vacía toda la cache).
   - `authBroadcast.publish('logout')`.
   - Redirect a `/`.
4. Errores de red en logout → ignorar visualmente y limpiar local igualmente.

### Auto-logout

Disparado cuando:
- El interceptor reactivo recibe 401 en `/auth/refresh` (refresh inválido/revocado/expirado).
- El backend devuelve 401 en cualquier endpoint y el `/refresh` también falla.

Acción:
- Limpiar estado local (igual que logout normal).
- Toast: `t('auth.session.expired')`.
- Redirect a `/login?reason=session-expired&from=<currentPath>`.

### Multi-pestaña

```ts
// lib/authBroadcast.ts
const channel = new BroadcastChannel('matchplay-auth')

export const authBroadcast = {
  publish(event: 'login' | 'logout' | 'refreshed') {
    channel.postMessage({ type: event, ts: Date.now() })
  },
  subscribe(handler: (msg: { type: string }) => void) {
    channel.addEventListener('message', e => handler(e.data))
    return () => channel.removeEventListener('message', e => handler(e.data))
  },
}
```

**Comportamiento esperado:**
- Pestaña A hace login → pestaña B recibe `'login'` → ejecuta el boot sequence → se autentica.
- Pestaña A hace logout → pestaña B recibe `'logout'` → ejecuta `authStore.clear()` + redirect a `/`.
- Pestaña A hace refresh → pestaña B recibe `'refreshed'` → re-ejecuta boot sequence para coger el nuevo access (su cookie es la misma, solo cambia el access local).

Fallback en navegadores sin `BroadcastChannel`: storage event sobre un flag en `localStorage` con timestamp.

---

## Guards de rutas

### `<ProtectedRoute>`

```tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore(s => s.status)
  const location = useLocation()

  if (status === 'booting' || status === 'idle') return <AuthBootSplash />
  if (status === 'anonymous') {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }
  return <>{children}</>
}
```

### `<RoleRoute>`

```tsx
export function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const status = useAuthStore(s => s.status)
  const role = useAuthStore(s => s.currentUser?.role)

  if (status === 'booting' || status === 'idle') return <AuthBootSplash />
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (!role || !roles.includes(role)) {
    toast.error(t('auth.forbidden'))
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
```

### Uso en `router.tsx`

```tsx
const router = createBrowserRouter([
  { path: '/', element: <MainLayout />, children: [
    { index: true, element: <HomePage /> },
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
    { path: 'sessions/:id', element: <SessionDetailPage /> },
    { path: 'sessions/new', element: <ProtectedRoute><CreateSessionPage /></ProtectedRoute> },
    { path: 'profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
    { path: 'admin', element: <RoleRoute roles={['ADMIN']}><AdminLayout /></RoleRoute>, children: [
      { index: true, element: <AdminHomePage /> },
      { path: 'users', element: <AdminUsersPage /> },
    ]},
    { path: '*', element: <NotFoundPage /> },
  ]},
])
```

---

## Páginas

### `LoginPage`

- Path: `/login`.
- Layout: `AuthLayout` (centrado, sin nav).
- Componente: `<LoginForm>`.
- Lee `?from=...` y `?reason=...` de la URL. Si `reason=session-expired`, muestra un banner.
- Link a `/register`.
- SEO: `<SeoHead title="Iniciar sesión — Matchplay" description="Inicia sesión en Matchplay..." noindex />`. (Sí `noindex`, no queremos esta página en Google.)

### `RegisterPage`

- Path: `/register`.
- Layout: `AuthLayout`.
- Componente: `<RegisterForm>` con campos `email`, `username`, `password`, `name`, `provinceCode` (dropdown async), `cityCode` (dropdown dependiente de provincia), `areaCode` (dropdown dependiente de city).
- Carga las opciones geo bajo demanda. Endpoints geo NO existen aún en backend → **dependencia bloqueante**: hay que exponer `GET /api/v1/geo/provinces`, `/cities?provinceCode=X`, `/areas?cityCode=X` (públicos).
- Link a `/login`.
- SEO: `noindex`.

> **Out of spec (asumido como ya implementado o por implementar)**: módulo `geo` del backend con endpoints públicos de listado. Si no existe, el `RegisterPage` no puede renderizarse — añadir como prerequisito.

---

## Forms

### Esquema zod de login

```ts
const loginSchema = z.object({
  email: z.string().min(1, { message: 'auth.email.required' }).email({ message: 'auth.email.invalid' }),
  password: z.string().min(1, { message: 'auth.password.required' }),
})
type LoginFormValues = z.infer<typeof loginSchema>
```

### Esquema zod de register

Refleja exactamente las validaciones del backend (`RegisterRequest`):

```ts
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const registerSchema = z.object({
  email: z.string().email({ message: 'auth.email.invalid' }).max(150),
  username: z.string().min(3, { message: 'auth.username.min' }).max(50),
  password: z.string().regex(passwordRegex, { message: 'auth.password.weak' }),
  name: z.string().min(1, { message: 'auth.name.required' }).max(100),
  provinceCode: z.string().min(1, { message: 'auth.province.required' }),
  cityCode: z.string().min(1, { message: 'auth.city.required' }),
  areaCode: z.string().min(1, { message: 'auth.area.required' }),
})
```

### Mostrar errores

- Errores de validación del **frontend** (zod): se renderizan inline bajo el campo usando `t(key)`.
- Errores **del backend** (`ApiError`):
  - Si `fieldErrors` viene → mapear cada `{ field, message }` a `setError(field, { message })`.
  - Si no hay `fieldErrors` pero hay `code` (ej. `error.auth.invalid.credentials`) → toast con `message` (ya viene localizado por el backend) **o** banner inline si es relevante para todo el form.

### Mapeo `ApiError.code` → comportamiento UI

```ts
// lib/errorMapping.ts
export const authErrorAction: Record<string, 'toast' | 'banner' | 'field'> = {
  'error.auth.invalid.credentials': 'banner',
  'error.auth.email.duplicate':      'field',  // → setError('email', ...)
  'error.auth.username.duplicate':   'field',  // → setError('username', ...)
  'error.geo.province.not.found':    'field',
  'error.geo.city.not.found':        'field',
  'error.geo.area.not.found':        'field',
  'error.auth.rate.limited':         'banner',
  'error.auth.refresh.invalid':      'toast',  // sale del flujo auto-logout
}
```

---

## i18n

Claves nuevas en `shared/i18n/locales/{es,en}.json`, bajo el namespace `auth`:

```json
{
  "auth": {
    "login": {
      "title": "Iniciar sesión",
      "submit": "Entrar",
      "submitting": "Entrando...",
      "noAccount": "¿No tienes cuenta?",
      "registerCta": "Regístrate"
    },
    "register": {
      "title": "Crear cuenta",
      "submit": "Crear cuenta",
      "submitting": "Creando...",
      "haveAccount": "¿Ya tienes cuenta?",
      "loginCta": "Inicia sesión"
    },
    "logout": "Cerrar sesión",
    "forbidden": "No tienes permisos para acceder a esta página",
    "session": {
      "expired": "Tu sesión ha expirado. Vuelve a iniciar sesión."
    },
    "email": { "label": "Email", "required": "El email es obligatorio", "invalid": "Email inválido" },
    "password": { "label": "Contraseña", "required": "La contraseña es obligatoria", "weak": "Mínimo 8 caracteres con letras y números" },
    "username": { "label": "Nombre de usuario", "min": "Mínimo 3 caracteres" },
    "name": { "label": "Nombre", "required": "El nombre es obligatorio" },
    "province": { "label": "Provincia", "required": "Selecciona una provincia" },
    "city": { "label": "Localidad", "required": "Selecciona una localidad" },
    "area": { "label": "Zona", "required": "Selecciona una zona" }
  }
}
```

---

## Testing

### Unit

- **`authStore.test.ts`**: `setAuthenticated/clear/markBooting` cambian status correctamente. `clear` borra todo.
- **`refreshScheduler.test.ts`**: `schedule` calcula bien el `delay` (con vi.useFakeTimers). `cancel` cancela. Re-programación al disparar.
- **`errorMapping.test.ts`**: mapeo de cada code conocido.

### Componente

- **`LoginForm.test.tsx`**: valida con zod, deshabilita submit mientras pending, muestra error inline tras 401, mapea `email.duplicate` a setError.
- **`RegisterForm.test.tsx`**: idem + dropdowns geo dependientes (mock MSW).
- **`ProtectedRoute.test.tsx`**: redirige si anónimo (con `from`), muestra splash si booting, renderiza si autenticado.
- **`RoleRoute.test.tsx`**: 403 toast + redirect si rol incorrecto. Render si rol correcto.

### Integración (MSW)

`authFlow.test.tsx` con `MemoryRouter` y `MSW`:

| Caso | Escenario |
|------|-----------|
| Boot anónimo | sin cookie → `/refresh` devuelve 401 → status `anonymous`. |
| Boot con sesión | cookie válida → `/refresh` 200 → `/me` 200 → status `authenticated`. |
| Login OK | submit form → `/login` 200 → status `authenticated` → redirect a `/`. |
| Login 401 | submit → banner con mensaje del backend. |
| Login 409 email duplicado | submit → setError en `email`. |
| Refresh proactivo | `vi.advanceTimersByTime` hasta justo antes del lead time → `/refresh` se dispara. |
| Refresh reactivo en 401 | request a `/sessions` 401 → `/refresh` 200 → request original 200. |
| Refresh reactivo falla | request 401 → `/refresh` 401 → status `anonymous` + redirect login. |
| Logout | `/logout` 204 → status `anonymous` → cache TanStack limpia. |
| Multi-tab logout | publish `'logout'` → otra "pestaña" mockeada limpia su store. |
| Deep link | navegar a `/profile` sin auth → redirect a `/login?from=/profile`. |

### A11y

Cada form pasa `vitest-axe` sin violaciones.

---

## Casos edge a considerar

| Caso | Comportamiento esperado |
|------|------------------------|
| Cambio de idioma con sesión activa | El header `Accept-Language` cambia. No requiere logout. Próxima respuesta de error viene en el nuevo idioma. |
| Browser bloquea cookies de terceros | En prod (mismo registrable domain) NO son terceros → no afecta. Si el deploy queda en dominios distintos → fallback a `SameSite=Lax` o cookie de terceros. |
| Reloj del cliente desfasado | El `accessTokenExpiresAt` viene del servidor. El cálculo de delay se basa en `Date.now()` cliente; si está adelantado, refresh proactivo dispara antes — sin problema. Si está atrasado, dispara tarde → el interceptor reactivo cubre. |
| Refresh paralelo | Si dos requests reciben 401 a la vez, se dispararían dos `/refresh`. Mitigación: **deduplicar** mediante una promesa en vuelo única (`pendingRefreshPromise`). |
| Tab abierto durante días | Cookie de 7 días. Si pasa más, refresh falla → auto-logout. |
| Submit duplicado de login | Botón disabled mientras `mutation.isPending`. |
| Logout offline | `authStore.clear()` igualmente. Cuando vuelva la red, la cookie sigue válida hasta que el usuario llame login otra vez. Documentado como deuda menor. |
| Página `/login` con sesión activa | Si ya está autenticado, redirige a `/`. Componente `<RedirectIfAuthed>`. |
| Cambio de rol mientras navega | `RoleRoute` reacciona a cambios del store. Si un admin pierde el rol (futuro endpoint admin), automáticamente redirige. |

---

## SEO de las páginas auth

- `LoginPage`, `RegisterPage` → `<SeoHead noindex>` (no queremos que Google indexe estas páginas).
- Página `/profile`, `/admin/**` → también `noindex`. Lo dejo documentado en `shared/seo/defaultMeta.ts`: helper `noIndexMeta()` que el `<SeoHead>` aplica si se le pasa `noindex`.
- `robots.txt` además bloquea estos paths como segunda capa de defensa.

---

## Accesibilidad

- Cada `<input>` con `<label>` asociado (`htmlFor`/`id`).
- Errores asociados con `aria-describedby` y `role="alert"`.
- `<form>` con `noValidate` (delegamos a zod) pero respetando `aria-invalid` cuando hay error.
- Submit por Enter funciona.
- Foco inicial en primer campo al montar.
- Tras error de form, foco al primer campo con error.
- Banner de sesión expirada con `role="status"` y `aria-live="polite"`.

---

## Fuera de alcance (deferred)

- Email verification.
- Reset password.
- Login social / OAuth.
- 2FA / TOTP.
- "Recordarme" opcional (cookie persistente vs sesión).
- Listado de sesiones activas y revocación selectiva (`/auth/sessions` + endpoint backend).
- Cambio de contraseña desde perfil.
- Idle timeout (cerrar sesión tras N min de inactividad).

---

## Dependencias bloqueantes

Antes de implementar este módulo:

1. **Refactor del backend** (sección "Cambios necesarios en el backend"). Sin esto, el flujo de cookie no funciona.
2. **Módulo `geo` del backend**: `GET /api/v1/geo/provinces`, `/cities?provinceCode=X`, `/areas?cityCode=X` públicos. Sin esto, `RegisterPage` no puede pintar los dropdowns. → Crear `docs/backend/modules/geo-spec.md`.
3. **Bootstrap del proyecto frontend**: migrar a TypeScript + instalar deps + estructura `features/`/`shared/` + providers (`QueryProvider`, `I18nProvider`, etc.). Sin esto, no hay donde alojar el código.

---

## Orden sugerido de implementación

1. Bootstrap del proyecto frontend (TypeScript, deps, layouts vacíos, router básico, providers).
2. Refactor backend a cookie httpOnly + actualizar `AuthFlowTest` + actualizar `docs/backend/modules/auth-spec.md`.
3. Crear módulo `geo` en backend (entidades ya existen; solo controller + service de lectura).
4. Implementar `features/auth/` en orden:
   1. `authApi.ts` + tipos.
   2. `authStore.ts` + tests.
   3. `refreshScheduler.ts` + interceptor + tests.
   4. `authBroadcast.ts` + tests.
   5. `<ProtectedRoute>`, `<RoleRoute>` + tests.
   6. `<LoginForm>` + `LoginPage` + tests.
   7. `<RegisterForm>` + `RegisterPage` (con dropdowns geo) + tests.
   8. `<AuthBootSplash>` + boot sequence en `<App>`.
   9. Integración `authFlow.test.tsx`.
5. Documentar en `frontend/README.md` cómo arrancar con backend levantado.
