# Módulo Games — Spec

> Búsqueda de juegos y expansiones contra la API pública de BoardGameGeek (BGG).

Referencia capa: [../spec.md](../spec.md) · Global: [../../spec.md](../../spec.md)

---

## Propósito

Este módulo expone al frontend la búsqueda de juegos (base y expansiones) usada en flujos de descubrimiento, autocompletado y selección al crear partidas.

**Importante:** la búsqueda **siempre** consulta BGG. Las tablas locales `games` y `game_expansions` **no se usan para buscar**; se usan únicamente cuando se crea una partida y hay que persistir el juego seleccionado y su relación con expansiones. Esa lógica vive en el módulo de Partidas, no aquí.

---

## Endpoint

```
GET /api/v1/games
```

**Auth:** público (no requiere JWT).
**Content-Type:** `application/json`.

### Query params

| Parámetro     | Tipo                  | Obligatorio                  | Default | Descripción |
|---------------|-----------------------|------------------------------|---------|-------------|
| `q`           | `string` (2–100)      | sí, si `type=base`           | —       | Texto de búsqueda por nombre. Mínimo 2 caracteres no-espacio. |
| `type`        | `base` \| `expansion` | no                           | `base`  | Tipo de juego a buscar. |
| `baseGameId`  | `long`                | sí, si `type=expansion`      | —       | `bggId` del juego base cuyas expansiones se quieren listar. |
| `page`        | `int` ≥ 0             | no                           | `0`     | Página solicitada (0-indexed). |
| `size`        | `int` 1–50            | no                           | `20`    | Tamaño de página. Máximo 50 para no saturar BGG. |

**Reglas combinadas:**

- `type=expansion` + sin `baseGameId` → `400` (`error.games.baseGameId.required`).
- `type=base` + sin `q` → `400` (`error.games.query.required`).
- `q` se trimea; menos de 2 caracteres no-espacio → `400`.

### Respuesta `200 OK`

```json
{
  "content": [
    {
      "bggId": 13,
      "name": "Catan",
      "year": 1995,
      "minPlayers": 3,
      "maxPlayers": 4,
      "minPlayTimeMinutes": 60,
      "maxPlayTimeMinutes": 120,
      "thumbnailUrl": "https://.../catan-thumb.jpg",
      "imageUrl": "https://.../catan.jpg",
      "isExpansion": false,
      "hasExpansions": true,
      "baseGameBggId": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 37,
  "totalPages": 2,
  "last": false
}
```

### `GameSearchResponse`

| Campo | Tipo | Notas |
|-------|------|-------|
| `bggId` | `Long` | ID del juego en BoardGameGeek. Identificador estable para el frontend. |
| `name` | `String` | Nombre principal del juego. |
| `year` | `Integer` (nullable) | Año de publicación. |
| `minPlayers` / `maxPlayers` | `Integer` (nullable) | Rango de jugadores. |
| `minPlayTimeMinutes` / `maxPlayTimeMinutes` | `Integer` (nullable) | Duración estimada. |
| `thumbnailUrl` / `imageUrl` | `String` (nullable) | Imagen pequeña y grande. |
| `isExpansion` | `boolean` | `true` si el item es una expansión. |
| `hasExpansions` | `boolean` | Solo significativo para juegos base. |
| `baseGameBggId` | `Long` (nullable) | Si `isExpansion=true`, `bggId` del juego base. |

### Errores

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `error.games.query.required` | `type=base` sin `q` o con `q` demasiado corto. |
| 400 | `error.games.baseGameId.required` | `type=expansion` sin `baseGameId`. |
| 400 | `error.games.size.max` | `size > 50`. |
| 404 | `error.games.base.not.found` | `type=expansion` y `baseGameId` no existe en BGG. |
| 502 | `error.games.bgg.unavailable` | BGG no responde o devuelve error. |
| 500 | `error.internal` | Error inesperado. |

Mensajes en `messages_es.properties` / `messages_en.properties`.

---

## Lógica del service

1. **Validar** entrada combinada (Bean Validation cubre formato; el service cubre reglas que dependen de `type`).
2. **Llamar a BGG:**
   - `type=base`: `bggClient.searchBaseGames(q, page, size)`.
   - `type=expansion`: `bggClient.findExpansionsOf(baseGameId, page, size)`.
3. **Mapear** la respuesta de BGG a `GameSearchResponse` (mapper dedicado, no MapStruct si el XML/JSON de BGG es muy distinto al DTO).
4. **Devolver** la página al controller. El service nunca persiste juegos.

---

## Cache y rate limiting

- **Cache de servicio** (Caffeine) sobre las llamadas a BGG, key = `q|type|baseGameId|page|size`, TTL 5 min. Mitiga el coste de búsquedas repetidas y la latencia de BGG.
- **Cache HTTP** en la respuesta: `Cache-Control: public, max-age=300`.
- **Rate limit** por IP sobre `/api/v1/games` (p. ej. 60 req/min) para no abusar de BGG.

---

## Casos de uso cubiertos

- Buscar un juego por nombre — `GET /api/v1/games?q=catan`.
- Listar expansiones de un juego — `GET /api/v1/games?type=expansion&baseGameId=13`.
- Autocompletado rápido — `GET /api/v1/games?q=carca&size=5`.
- Navegar resultados — `GET /api/v1/games?q=catan&page=1&size=20`.

---

## Fuera de alcance de este módulo

- **Persistencia en `games` y `game_expansions`**: se hace en el módulo de Partidas, cuando el usuario selecciona un juego al crear una partida. En ese momento se hace `upsert` por `bggId` y se materializa la relación base ↔ expansión solo si es necesaria.
- **Listado de juegos del usuario / favoritos**: pertenece al módulo Usuarios.
- **Catálogo administrable**: pertenece al módulo Admin.

---

## Estructura de paquetes

```
com.matchplay.game/
├── controller/
│   └── GameSearchController.java
├── service/
│   ├── GameSearchService.java
│   └── GameSearchServiceImpl.java
├── client/
│   ├── BggClient.java            ← interfaz
│   └── BggClientImpl.java        ← WebClient / RestClient contra BGG XML API
├── dto/
│   ├── GameSearchResponse.java   ← record
│   └── GameSearchType.java       ← enum: BASE, EXPANSION
└── mapper/
    └── BggGameMapper.java
```
