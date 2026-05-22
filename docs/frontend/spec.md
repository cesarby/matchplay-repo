# Frontend — Spec Orquestador

> React 18 · Vite 5 · Tailwind CSS · shadcn/ui · React Router v6 · Axios

Referencia global: [../spec.md](../spec.md)

---

## Specs de módulos

| Módulo | Archivo | Estado |
|--------|---------|--------|
| Auth | [modules/auth-spec.md](modules/auth-spec.md) | Pendiente |
| Partidas | [modules/sessions-spec.md](modules/sessions-spec.md) | Pendiente |
| Perfil de usuario | [modules/users-spec.md](modules/users-spec.md) | Pendiente |
| Panel Admin | [modules/admin-spec.md](modules/admin-spec.md) | Pendiente |

---

## Estructura de carpetas

```
frontend/src/
├── api/              # Clientes Axios por módulo (authApi.js, sessionsApi.js...)
├── assets/           # Imágenes, iconos estáticos
├── components/       # Componentes reutilizables (UI genérico)
│   └── ui/           # Componentes shadcn/ui generados
├── hooks/            # Custom hooks (useAuth, useSessions...)
├── layouts/          # Layouts base (MainLayout, AuthLayout, AdminLayout)
├── pages/            # Una carpeta por módulo
│   ├── auth/
│   ├── sessions/
│   ├── users/
│   └── admin/
├── router/           # Definición de rutas (router.jsx)
├── store/            # Estado global (Context API o Zustand)
├── lib/              # Utilidades (cn(), formatDate()...)
└── main.jsx
```

---

## Design System

Basado en los datos del skill `ui-ux-pro-max`:

**Estilo principal:** Vibrant & Block-based + Bento Box Grid
- Energético, social y visual — ideal para una plataforma de comunidad gaming.
- Cards de partidas en grid asimétrico tipo Bento (tamaños variados).

**Paleta de colores:**
```
Primary:    #7C3AED  (Violet-700) — identidad Matchplay
Secondary:  #F59E0B  (Amber-500)  — acción / destacado
Success:    #22C55E  (Green-500)
Danger:     #EF4444  (Red-500)
Background: #F5F5F7  (Apple grey — Bento)
Card bg:    #FFFFFF
Text:       #1E1B4B  (Indigo-950)
Muted:      #6B7280  (Gray-500)
```

**Tipografía:**
```
Heading: Inter (700-900) — moderno, legible, gaming-friendly
Body:    Inter (400-500)
Mono:    JetBrains Mono — para códigos / IDs de partida
```

**Componentes shadcn/ui a usar:**
- `Button`, `Card`, `Badge`, `Dialog`, `Form`, `Input`, `Select`
- `Avatar`, `Separator`, `Skeleton`, `Toast`, `Tooltip`
- `NavigationMenu`, `DropdownMenu`

**Reglas UI (del skill):**
- Mínimo 44×44px en targets táctiles.
- `cursor-pointer` en todos los elementos clickables.
- Transiciones 150-300ms en hover/focus.
- Sin emojis como iconos — usar Lucide React (ya incluido en shadcn/ui).
- Contraste mínimo 4.5:1 (WCAG AA).
- Reservar espacio para contenido async (Skeleton screens).

---

## Rutas

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

---

## Estado global

- **Auth state**: usuario autenticado, token JWT, rol. Almacenado en `AuthContext` + `localStorage`.
- **UI state**: notificaciones toast, modales. Manejado localmente o con Context.
- No se usa Redux — Context API es suficiente para el MVP.

---

## Comunicación con la API

- Cliente base Axios con `baseURL=/api/v1` e interceptor que inyecta el JWT en cabeceras.
- Interceptor de respuesta que redirige a `/login` si recibe 401.
- Cada módulo tiene su propio archivo en `src/api/` (e.g. `sessionsApi.js`).

```js
// Patrón de api client
const sessionsApi = {
  getAll: (params) => api.get('/sessions', { params }),
  getById: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`),
  join: (id) => api.post(`/sessions/${id}/join`),
  leave: (id) => api.post(`/sessions/${id}/leave`),
}
```

---

## Reglas de desarrollo

1. Un componente = un archivo. No exportar múltiples componentes por archivo.
2. Custom hooks para lógica reutilizable (`useSessions`, `useAuth`).
3. Las páginas solo componen — sin lógica de negocio inline.
4. Validación de formularios con `react-hook-form` + `zod`.
5. Rutas protegidas mediante `<PrivateRoute>` que verifica el rol.
6. Loading states siempre con `Skeleton` de shadcn/ui, nunca spinners genéricos.
7. Errores de API mostrados con `Toast` de shadcn/ui.

---

## Dependencias a instalar

```json
{
  "dependencies": {
    "react-router-dom": "^6.x",
    "axios": "^1.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "@hookform/resolvers": "^3.x",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

shadcn/ui se instala mediante su CLI (`npx shadcn@latest init`), no como paquete npm directo.
