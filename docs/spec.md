# Matchplay — Spec Global (Orquestador)

> Plataforma para juntar gente que quiere jugar a juegos de mesa: alguien crea una partida (juego, lugar, fecha, cupos) y otros se apuntan.

---

## Índice de specs

| Capa | Archivo | Estado |
|------|---------|--------|
| Backend | [docs/backend/spec.md](backend/spec.md) | Activo |
| Frontend | [docs/frontend/spec.md](frontend/spec.md) | Activo |

---

## Stack tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Backend | Spring Boot | 3.4.x (actualizar desde 3.3.0) |
| Lenguaje | Java | 21 |
| Build | Maven | 3.9+ |
| Base de datos | MySQL | 8.x |
| ORM | Spring Data JPA + Hibernate | (incluido en Boot) |
| Seguridad | Spring Security + JWT | (incluido en Boot) |
| Frontend | React | 18.x |
| Bundler | Vite | 5.x |
| Estilos | Tailwind CSS + shadcn/ui | latest |
| Router | React Router | v6 |
| HTTP client | Axios | latest |
| Node | Node.js | 20+ |

---

## Arquitectura general

```
Browser (React SPA)
    │  HTTP/JSON  /api/v1/*
    ▼
Spring Boot REST API  :8080
    │
    ▼
MySQL 8  (tabla: matchplay)
```

- **SPA + REST API**: frontend desacoplado del backend.
- El frontend (Vite dev server :5173) proxea `/api/*` al backend `:8080` en desarrollo.
- En producción, el frontend se sirve como estáticos (o servidor dedicado).

---

## Roles y autenticación

| Rol | Descripción | Scope |
|-----|-------------|-------|
| `USER` | Usuario registrado. Crea y gestiona partidas, se apunta a partidas de otros. | MVP |
| `ADMIN` | Acceso total: gestión de usuarios, partidas y configuración. | MVP |
| `SHOP` | Rol para tiendas/locales que acojan partidas. | **Futuro** |

- Autenticación via **JWT** (stateless).
- Token enviado en cabecera `Authorization: Bearer <token>`.
- Refresh token para sesiones largas.

---

## Convenciones globales

### API REST
- Prefijo: `/api/v1/`
- Respuestas siempre en JSON.
- Códigos HTTP estándar: 200, 201, 400, 401, 403, 404, 500.
- Errores con estructura uniforme:
  ```json
  { "status": 400, "error": "Bad Request", "message": "...", "timestamp": "..." }
  ```

### Naming
| Ámbito | Convención |
|--------|-----------|
| Endpoints REST | `kebab-case` (`/game-sessions`) |
| Java clases | `PascalCase` |
| Java campos / métodos | `camelCase` |
| Componentes React | `PascalCase` |
| Hooks / utils React | `camelCase` |
| Ficheros React | `PascalCase.jsx` para componentes |
| Variables CSS / Tailwind | `kebab-case` |

### Base de datos
- Tabla principal: `matchplay` (ya existente en MySQL).
- Nuevas tablas: `snake_case`.
- PKs: `id` (BIGINT auto-increment).
- Timestamps: `created_at`, `updated_at` en todas las tablas.

---

## Módulos principales (MVP)

| Módulo | Backend spec | Frontend spec |
|--------|-------------|---------------|
| Auth (login/registro) | [backend/modules/auth-spec.md](backend/modules/auth-spec.md) | [frontend/modules/auth-spec.md](frontend/modules/auth-spec.md) |
| Partidas (game sessions) | [backend/modules/sessions-spec.md](backend/modules/sessions-spec.md) | [frontend/modules/sessions-spec.md](frontend/modules/sessions-spec.md) |
| Usuarios | [backend/modules/users-spec.md](backend/modules/users-spec.md) | [frontend/modules/users-spec.md](frontend/modules/users-spec.md) |
| Panel Admin | [backend/modules/admin-spec.md](backend/modules/admin-spec.md) | [frontend/modules/admin-spec.md](frontend/modules/admin-spec.md) |

> Los specs de módulo se crean conforme se planifica cada módulo.

---

## Mantenimiento de specs (regla obligatoria)

Los specs son **documentación viva**. Deben reflejar en todo momento el estado real del proyecto, no el estado inicial.

### Cuándo actualizar

| Evento | Qué actualizar |
|--------|---------------|
| Se añade un campo nuevo a una entidad | Spec del módulo backend correspondiente |
| Se añade un endpoint nuevo | Spec del módulo backend + spec global (tabla de módulos si aplica) |
| Se crea un componente o página nueva | Spec del módulo frontend correspondiente |
| Cambia una regla de negocio | Spec del módulo afectado (back y/o front) |
| Se introduce una nueva dependencia | Spec de capa (backend/spec.md o frontend/spec.md) |
| Un módulo pasa de "Pendiente" a "Activo" | Spec global + spec de capa (actualizar estado en tabla) |
| Se descarta o pospone algo | Moverlo a "Fuera de scope" en el spec correspondiente |

### Jerarquía de actualización

```
Cambio en un módulo
    │
    ▼
1. Actualizar spec del módulo    (docs/backend/modules/sessions-spec.md)
    │
    ▼
2. Actualizar spec de capa       (docs/backend/spec.md) si afecta a reglas generales
    │
    ▼
3. Actualizar spec global        (docs/spec.md) si afecta a arquitectura, roles o convenciones
```

- Nunca saltar pasos: si cambia el módulo, el orquestador de capa debe reflejarlo.
- El spec global solo se toca cuando el cambio afecta a algo transversal (stack, roles, convenciones, arquitectura).
- **El spec del módulo se actualiza en el mismo commit o PR que el código que lo origina.** No como tarea separada posterior.

### Estados de módulo

Cada spec de módulo y cada fila de las tablas de módulos usa uno de estos estados:

| Estado | Significado |
|--------|-------------|
| `Pendiente` | Diseñado, aún no implementado |
| `En desarrollo` | Implementación en curso |
| `Activo` | Implementado y en producción |
| `Deprecado` | Reemplazado, pendiente de eliminar |

---

## Fuera de scope (MVP)

- Rol `SHOP` y funcionalidades asociadas.
- Pagos / reservas económicas.
- Chat en tiempo real.
- Notificaciones push.
- App móvil nativa.
