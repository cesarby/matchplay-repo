# Módulo Games — Spec

> Búsqueda de juegos y expansiones contra la API pública de BoardGameGeek (BGG).

Referencia capa: [../spec.md](../spec.md) · Global: [../../spec.md](../../spec.md)

---

## Propósito

Este módulo expone al frontend la búsqueda de juegos (base y expansiones) usada en flujos de descubrimiento, autocompletado y selección al crear partidas.

**Importante:** la búsqueda **siempre** consulta BGG. Las tablas locales `games` y `game_expansions` **no se usan para buscar**; se usan únicamente cuando se crea una partida y hay que persistir el juego seleccionado y su relación con expansiones. Esa lógica vive en el módulo de Partidas, no aquí.

---

## Endpoints

### `GET /api/v1/games` — búsqueda

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
| 404 | `error.games.not.found` | `GET /games/{bggId}` y el juego no está en el cache local. |
| 502 | `error.games.bgg.unavailable` | BGG no responde o devuelve error. |
| 500 | `error.internal` | Error inesperado. |

Mensajes en `messages_es.properties` / `messages_en.properties`.

---

### `GET /api/v1/games/{bggId}` — detalle por id

**Auth:** público.

Lee el juego del cache local **sin consultar BGG**. Si el juego no está cacheado devuelve 404.

Respuesta `200 OK` — `GameDetailResponse`:

| Campo | Tipo | Notas |
|-------|------|-------|
| `bggId` | `Long` | |
| `name` | `String` | |
| `yearPublished` | `Integer` (nullable) | |
| `minPlayers` | `Integer` (nullable) | |
| `maxPlayers` | `Integer` (nullable) | |
| `playingTime` | `Integer` (nullable) | Minutos. |
| `thumbnailUrl` | `String` (nullable) | |
| `imageUrl` | `String` (nullable) | |
| `isExpansion` | `boolean` | |
| `baseGameBggId` | `Long` (nullable) | Solo si `isExpansion=true`. |
| `summary` | `String` (nullable) | Resumen LLM en el idioma del `Accept-Language`. |

Errores:

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 404 | `error.games.not.found` | `bggId` no está en el cache local. |

Tag Swagger: `"Games"` (mismo que `GET /api/v1/games` para agruparlos).

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
4. Si lo conoce → `BggGameMapper.toEntity(item)`. `toEntity` mapea `description` con `HtmlUtils.htmlUnescape` (decodifica `&#10;`, `&amp;`, etc.).
5. Si `description` no es vacía → `aiSummaryClient.summarize(description)` → guarda `summaryEs` y `summaryEn` en la entidad. Si la llamada al LLM falla, los campos quedan `null` y el juego se cachea igual; el summary se completará implícitamente en el siguiente `findOrFetch`.
6. `gameRepository.save`.

### Schema relacionado

**V7** `V7__game_metadata_and_session_expansions.sql`:

```sql
ALTER TABLE games
    ADD COLUMN is_expansion     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN base_game_bgg_id BIGINT  NULL;
```

- `is_expansion` se rellena desde `BggThingResult.Item.type == "boardgameexpansion"`.
- `base_game_bgg_id` se rellena del primer link `boardgameexpansion` con `inbound=true` (solo en expansiones; NULL en bases).
- Sin FK sobre `base_game_bgg_id` para evitar problemas de orden al cachear lazy.

**V10** `V10__games_description_and_summary.sql`:

```sql
ALTER TABLE games
  ADD COLUMN description TEXT NULL,
  ADD COLUMN summary_es  VARCHAR(700) NULL,
  ADD COLUMN summary_en  VARCHAR(700) NULL;
```

- `description`: texto plano decodificado de BGG (`HtmlUtils.htmlUnescape`).
- `summary_es` / `summary_en`: resúmenes generados por LLM (Claude Haiku). `VARCHAR(700)` — el truncado defensivo del cliente AI asegura que el texto cabe (~650 chars en palabra).

### Entidad `Game` — campos relevantes

Además de `bggId`, `name`, `yearPublished`, `minPlayers`/`maxPlayers`, `playingTime`, `thumbnailUrl`, `imageUrl`, `isExpansion`, `baseGameBggId`:

- `description: String` (nullable) — descripción decodificada de BGG.
- `summaryEs: String` (nullable) — resumen LLM en español.
- `summaryEn: String` (nullable) — resumen LLM en inglés.
- `getSummary(String lang): String` — helper que devuelve `summaryEn` si `lang.equals("en")`, en caso contrario `summaryEs`.

### Consumidores actuales

- `GameSessionServiceImpl.create()` — resolución del juego base.
- `GameSessionServiceImpl` (create/update) — resolución de cada expansión + validación
  `isExpansion && baseGameBggId == base.bggId`.
- `SessionMapper.toDetail` — llama a `game.getSummary(lang)` con el idioma del `LocaleContextHolder` para rellenar `SessionDetailResponse.baseGameSummary`.

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

## Módulo AI (`com.matchplay.ai`)

Encapsula la generación de resúmenes LLM. Seleccionado en runtime según la presencia de `ANTHROPIC_API_KEY`.

```
com.matchplay.ai/
├── AiSummaryClient.java            ← interface: GameSummary summarize(String text)
├── GameSummary.java                ← record(String es, String en) + static empty()
├── NoopSummaryClient.java          ← devuelve empty(); usado cuando no hay API key
├── ClaudeHaikuSummaryClient.java   ← HTTP a api.anthropic.com, modelo claude-haiku-4-5-20251001
└── AiConfig.java                   ← @Configuration; selecciona bean según anthropic.api-key
```

`ClaudeHaikuSummaryClient` hace dos llamadas (una por idioma), `max_tokens=200`, `temperature=0.4`. Trunca la descripción de entrada a ~650 chars cortando en palabra. Cualquier excepción devuelve el campo como `null` (tolerante a fallos). Timeouts configurables vía properties.

**Properties** (`application.properties`):

```properties
anthropic.api-key=${ANTHROPIC_API_KEY:}
anthropic.connect-timeout-ms=${ANTHROPIC_CONNECT_TIMEOUT_MS:3000}
anthropic.read-timeout-ms=${ANTHROPIC_READ_TIMEOUT_MS:10000}
```

`backend/.env.example` documenta `ANTHROPIC_API_KEY` como opcional; vacío activa el `NoopSummaryClient`.

---

## Estructura de paquetes

```
com.matchplay.game/
├── controller/
│   ├── GameSearchController.java   ← GET /api/v1/games (búsqueda BGG)
│   └── GameDetailController.java   ← GET /api/v1/games/{bggId} (cache local)
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
│   ├── GameDetailResponse.java
│   └── GameSearchType.java
├── entity/
│   └── Game.java                   ← +isExpansion, +baseGameBggId, +description, +summaryEs, +summaryEn
├── repository/
│   └── GameRepository.java
└── mapper/
    └── BggGameMapper.java          ← toResponse + toEntity (con HtmlUtils.htmlUnescape en description)
```
