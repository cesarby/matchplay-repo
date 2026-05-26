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

- **Listado de juegos del usuario / favoritos**: pertenece al módulo Usuarios.
- **Catálogo administrable**: pertenece al módulo Admin.

---

## Persistencia de juegos — `GameService.findOrFetch` (Fase 1.2)

Mientras la **búsqueda** (`GameSearchService`) consulta BGG directamente y no
persiste, la **referencia** a un juego por `bggId` desde otros módulos sí lo
hace. La pieza encargada es `GameService` (no confundir con `GameSearchService`).

### API

```java
public interface GameService {
    Game findOrFetch(Long bggId);   // lazy-load cache
}
```

**Comportamiento**:

1. `gameRepository.findById(bggId)` — hit local → devuelve.
2. Miss → `bggClient.getThing(bggId)`.
3. Si BGG no lo conoce → `BaseGameNotFoundException` (`404 error.games.base.not.found`).
4. Si lo conoce → `BggGameMapper.toEntity(item)` y `gameRepository.save`.

### Schema relacionado (V7)

`V7__game_metadata_and_session_expansions.sql` añade:

```sql
ALTER TABLE games
    ADD COLUMN is_expansion     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN base_game_bgg_id BIGINT  NULL;
```

- `is_expansion` se rellena desde `BggThingResult.Item.type == "boardgameexpansion"`.
- `base_game_bgg_id` se rellena del primer link `boardgameexpansion` con `inbound=true` (solo en expansiones; NULL en bases).
- Sin FK sobre `base_game_bgg_id` para evitar problemas de orden al cachear lazy.

### Consumidores actuales

- `GameSessionServiceImpl.create()` — resolución del juego base.
- `GameSessionServiceImpl` (create/update) — resolución de cada expansión + validación
  `isExpansion && baseGameBggId == base.bggId`.

### La relación base ↔ expansión vive en `games.base_game_bgg_id`

No hay tabla join separada. La columna `games.base_game_bgg_id` añadida en V7
codifica la pareja base–expansión sin duplicación: si la fila tiene
`is_expansion = TRUE` y `base_game_bgg_id = X`, sabemos que es una expansión
de X.

Para "expansiones conocidas del juego X" basta una query indexada:

```sql
SELECT * FROM games WHERE base_game_bgg_id = ?;
```

(usa `idx_games_base_game_bgg_id`).

**Histórico**: la tabla `game_expansions` (M:N `base_game_id` ↔ `expansion_game_id` + `sort_order`) existía desde el baseline V1 pero quedó redundante con `base_game_bgg_id`. La migración `V8__drop_game_expansions.sql` la elimina junto con la entidad `GameExpansion`.

---

## Estructura de paquetes

```
com.matchplay.game/
├── controller/
│   └── GameSearchController.java
├── service/
│   ├── GameSearchService.java      ← busca en BGG (no persiste)
│   ├── GameSearchServiceImpl.java
│   ├── GameService.java            ← findOrFetch (cache local)
│   └── GameServiceImpl.java
├── client/
│   ├── BggClient.java
│   └── BggClientImpl.java
├── dto/
│   ├── GameSearchResponse.java
│   └── GameSearchType.java
├── entity/
│   └── Game.java                   ← +isExpansion, +baseGameBggId
├── repository/
│   └── GameRepository.java
└── mapper/
    └── BggGameMapper.java          ← toResponse + toEntity
```
