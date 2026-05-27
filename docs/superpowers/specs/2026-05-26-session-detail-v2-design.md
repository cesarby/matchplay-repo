# Session Detail v2 — Design

**Fecha**: 2026-05-26
**Estado**: Aprobado
**Ámbito**: `frontend/src/features/sessions/pages/SessionDetailPage.tsx` + endpoints backend nuevos + módulo `ai/` nuevo

## Contexto

La página de detalle de una partida (`/sessions/:id`) tiene tres áreas a mejorar tras el feedback de pruebas reales:

1. **Bug de contador**: el sidebar "Apuntados" muestra `1/2` mientras la card muestra `2/2` para la misma sesión, porque el sidebar cuenta solo filas de `PLAYER` y la card cuenta `registeredPlayers` (que incluye `creatorGuests`).
2. **El creador no puede ajustar la partida** una vez creada (cambiar hora, ampliar/reducir plazas, cerrarla anticipadamente).
3. **No hay contexto del juego** — el usuario que llega de fuera ve el nombre pero no sabe de qué va.

Las tres son independientes y se entregan como 3 features secuenciales con commit propio.

---

## Feature 1 — Apuntados muestra acompañantes como filas

### Objetivo

Coherencia visual entre card y sidebar. El sidebar debe reflejar lo mismo que cuenta la card y mostrar visualmente quiénes son esas plazas ocupadas.

### Cambios

**Frontend only** (sin backend, los datos ya están en `SessionDetailResponse`).

- En `SessionDetailPage.tsx`:
  - Contador del sidebar pasa de `{players.length}/{data.maxPlayers}` a `{data.registeredPlayers}/{data.maxPlayers}`.
  - Bajo la fila del creador, renderizar `data.creatorGuests` filas adicionales tipo "Acompañante de @creator".

- En `SessionPlayerRow.tsx`:
  - Nueva prop `guest?: boolean`. Cuando `true`: render simplificado (sin link a perfil, sin avatar, texto muted, prefijo "+1 ").

- i18n nuevo:
  - `sessions.detail.guestOf` ES: `+1 acompañante de @{{username}}`
  - `sessions.detail.guestOf` EN: `+1 guest of @{{username}}`

### Tests

- Ampliar fixture en `SessionDetailPage.test.tsx` con `creatorGuests: 2`.
- Aserciones: contador muestra `3/4` (1 creador + 2 guests, max 4), aparecen 2 filas "Acompañante de @...".

### Coste estimado

15-30 min.

---

## Feature 2 — Edición y cierre de mesa (solo creador)

### Objetivo

El creador puede ajustar `scheduledAt` y `maxPlayers` después de la creación, y tiene un atajo "Cerrar mesa" para forzar `FULL` cuando ya no quiere más jugadores nuevos.

### Backend

#### Endpoint A — `PATCH /api/sessions/{id}`

Body `UpdateSessionRequest` (record):
```java
public record UpdateSessionRequest(
    Instant scheduledAt,   // opcional, null = no cambiar
    Integer maxPlayers     // opcional, null = no cambiar
) {}
```

**Validaciones**:
- Caller autenticado y es el creador (`session.getCreator().getId() == currentUser.getId()`). Si no → `403`.
- `status ∈ {OPEN, FULL}`. Si `CANCELLED` o `COMPLETED` → `409 SESSION_NOT_EDITABLE`.
- Si `scheduledAt != null`:
  - Debe ser futuro (`> Instant.now()`). Si no → `400 SCHEDULED_AT_IN_PAST`.
- Si `maxPlayers != null`:
  - Debe cumplir `maxPlayers >= registeredPlayers + 1` (regla del proyecto: ≥1 plaza libre en edición). Si no → `400 MAX_PLAYERS_TOO_LOW` con info de cuál es el mínimo.
  - Si `maxPlayers > current` y hay waitlist: auto-promote ya existente cubre la promoción a PLAYER.

**Sin gate de `confirmWaitlist`** — el FE muestra texto informativo si hay waitlist al editar fecha, pero no bloquea ni requiere doble confirmación.

**Response**: `200 SessionDetailResponse` actualizada.

#### Endpoint B — `POST /api/sessions/{id}/close`

Sin body.

**Validaciones**:
- Caller es el creador → si no, `403`.
- `status == OPEN`. Si `FULL/CANCELLED/COMPLETED` → `409 SESSION_NOT_CLOSEABLE`.
- Debe haber al menos 1 jugador real distinto del creador. Es decir: contar filas `players` con `role == PLAYER` excluyendo al creador. Los `creatorGuests` **no cuentan** (son acompañantes del propio creador, no terceros). Si no hay ningún tercero → `400 SESSION_EMPTY_CANNOT_CLOSE` con mensaje "no puedes cerrar una mesa vacía contigo mismo, cancélala en su lugar".

**Efecto**:
- `maxPlayers := registeredPlayers` (rompe explícitamente la regla "≥1 plaza libre" porque es acción intencionada del creador).
- `status := FULL`.
- Waitlist **se mantiene intacta**. Si alguien cancela después, los de cola pueden entrar.

**Response**: `200 SessionDetailResponse` actualizada.

#### Tests backend

- `GameSessionServiceImplTest`:
  - `update_scheduledAt_ok`, `update_scheduledAt_inPast_throws`, `update_scheduledAt_notCreator_throws`
  - `update_maxPlayers_ok`, `update_maxPlayers_belowRegistered_throws`, `update_maxPlayers_promotesWaitlist`
  - `update_cancelledSession_throws`
  - `close_ok_setsFullAndAdjustsMax`, `close_emptySession_throws`, `close_alreadyFull_throws`, `close_keepsWaitlist`
- `GameSessionControllerTest`: cobertura por endpoint (200/400/403/409).

### Frontend

- En `SessionDetailPage`, sección Meta: si `currentUser?.username === data.creatorUsername && status ∈ {OPEN, FULL}`, mostrar fila de botones secundarios:
  - **Editar** (icono lápiz, neutro) — abre modal de edición.
  - **Cerrar mesa** (icono lock, rojo discreto) — solo si `OPEN` — abre modal de confirmación.

- **Modal de edición** (`EditSessionModal.tsx` nuevo):
  - Reutiliza `SessionDateTimePicker` para fecha.
  - Input numérico `maxPlayers` con `min={data.registeredPlayers + 1}`.
  - Si hay waitlist: nota inline "ℹ️ Hay {n} personas en cola. Se mantendrán al editar."
  - Submit → `PATCH`. Errores 400/409 → mostrar mensaje mapeado en `errorMapping.ts`.

- **Modal de cerrar** (`CloseSessionModal.tsx` nuevo):
  - Texto: "Cerrarás esta mesa con {registeredPlayers} jugadores. Nadie nuevo podrá apuntarse, pero si alguien cancela los {waitlistCount} en cola podrán entrar."
  - Si `waitlistCount === 0`, omitir la segunda frase.
  - Botones "Cancelar" / "Cerrar mesa" (rojo).
  - Submit → `POST close`.

- Hooks nuevos en `useSessions.ts`:
  - `useUpdateSessionMutation(id)` — invalida `['session', id]` y `['sessions']`.
  - `useCloseSessionMutation(id)` — idem.

- API en `sessionsApi.ts`:
  - `updateSession(id, body): Promise<SessionDetail>`
  - `closeSession(id): Promise<SessionDetail>`

- i18n: añadir bloque `sessions.edit.*` y `sessions.close.*`.

### Tests frontend

- `SessionDetailPage.test.tsx`:
  - Como creador con status OPEN: ambos botones visibles.
  - Como creador con status FULL: solo "Editar" visible (no "Cerrar mesa").
  - Como visitante: ninguno visible.
- Test del modal de edit: submit con valores válidos → llama `updateSession`.
- Test del modal de close: confirma → llama `closeSession`.

### Coste estimado

3-4 h (backend + frontend + tests).

---

## Feature 3 — Resumen del juego con Claude Haiku

### Objetivo

Mostrar un párrafo de ~500 caracteres describiendo el juego (qué haces, mecánica clave, tono) generado a partir de la `description` de BGG mediante Claude Haiku 4.5. Visible en la detail page sobre la "Descripción" de la sesión.

### Backend

#### Migración V10

```sql
ALTER TABLE games
  ADD COLUMN summary_es VARCHAR(700) NULL,
  ADD COLUMN summary_en VARCHAR(700) NULL;
```

`700` chars de margen sobre el objetivo de 500.

#### Módulo `ai/`

```
backend/src/main/java/com/matchplay/ai/
  AiSummaryClient.java          # interface
  ClaudeHaikuSummaryClient.java # impl real (HTTP a api.anthropic.com)
  NoopSummaryClient.java        # impl que devuelve {null, null}
  GameSummary.java              # record {String es, String en}
  AiConfig.java                 # @Configuration, bean selection
```

**Interface**:
```java
public interface AiSummaryClient {
  GameSummary summarize(String bggDescription);
}
```

**Config**:
```java
@Configuration
public class AiConfig {
  @Bean
  @ConditionalOnProperty(name = "anthropic.api-key", matchIfMissing = false)
  public AiSummaryClient claudeClient(@Value("${anthropic.api-key}") String apiKey) {
    return new ClaudeHaikuSummaryClient(apiKey);
  }

  @Bean
  @ConditionalOnMissingBean(AiSummaryClient.class)
  public AiSummaryClient noopClient() {
    return new NoopSummaryClient();
  }
}
```

Sin `ANTHROPIC_API_KEY` env var → activa Noop, todo funciona sin resúmenes. Con la key → activa Claude.

**Prompt** (mismo para ambos idiomas, variable `{lang}`):
```
Eres un experto en juegos de mesa. Resume el siguiente texto en {lang} en un párrafo de ~500 caracteres con tono editorial. Menciona qué haces, mecánica principal y a qué tipo de jugador le gusta. Sin saludos, sin meta-comentarios, sin Markdown.

Texto:
{bggDescription}
```

Una llamada por idioma → 2 llamadas/juego (~$0.005 por juego).

**Modelo**: `claude-haiku-4-5-20251001`, `max_tokens: 400`, `temperature: 0.4`.

**Errores**: timeout 30s, retry 1x. Si falla la 2ª → log warn, devuelve `{null, null}`. El juego se cachea sin summary; se reintenta lazy en próximo `findOrFetch` si description disponible.

#### Integración en `GameServiceImpl.findOrFetch`

Tras `bggClient.fetchById(bggId)` y antes de `gameRepository.save(game)`:
```java
GameSummary summary = aiSummaryClient.summarize(bggGame.description());
game.setSummaryEs(summary.es());
game.setSummaryEn(summary.en());
```

**Lazy fallback**: cuando `gameRepository.findByBggId(id)` devuelve juego pero `summaryEs == null && description != null` (existió pero LLM falló o no había key entonces): no bloquear el flujo, dejar como está. Habrá un job admin para rellenar.

#### Endpoint admin (futuro, no en este sprint)

`POST /api/admin/games/{bggId}/regenerate-summary` — placeholder mencionado pero **fuera de scope** de este spec. Se documenta como follow-up.

#### Exposición en DTO

`SessionDetailResponse` añade campo `String baseGameSummary` (null si no hay).

`GameSessionServiceImpl.getDetail`: selecciona `summary_es` o `summary_en` según `LocaleContextHolder.getLocale().getLanguage()` (`"es"` o `"en"`). Default `es`.

#### Tests backend

- Mock `AiSummaryClient` en `GameServiceImplTest`:
  - `findOrFetch_savesGameWithSummary`
  - `findOrFetch_savesGameWithoutSummary_whenClientReturnsNull`
- `ClaudeHaikuSummaryClientTest` con WireMock:
  - Llamada exitosa → devuelve summary
  - 429 rate limit → retry → éxito
  - 500 persistente → devuelve null
  - Timeout → null
- `NoopSummaryClientTest`: trivial, devuelve `{null, null}`.
- `GameSessionServiceImplTest`: nuevo test `getDetail_includesGameSummaryInUserLanguage`.

### Frontend

- En `SessionDetailPage`, encima de la sección "Descripción" actual de la sesión, nuevo bloque:

```tsx
{data.baseGameSummary && (
  <section aria-labelledby="game-summary-heading" className="mb-6 rounded border-l-4 border-yellow bg-yellow-soft/30 p-4">
    <h2 id="game-summary-heading" className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
      Sobre {data.baseGameName}
    </h2>
    <p className="text-sm leading-relaxed text-foreground italic">
      {data.baseGameSummary}
    </p>
  </section>
)}
```

Si null → no renderizar (sin CLS, sin "cargando").

### Tests frontend

- Fixture con `baseGameSummary` → bloque visible.
- Fixture sin → bloque ausente.

### Config para el dev

- Añadir `backend/.env.local` al `.gitignore` (verificar).
- Documentar en `backend/README.md` (o crear si no existe): cómo conseguir la key y dónde ponerla.
- `application.yml`: `anthropic.api-key: ${ANTHROPIC_API_KEY:}`.

### Coste estimado

4-6 h (módulo nuevo + integración + tests + UI).

---

## Plan de entrega

3 commits secuenciales, en este orden:

1. **`fix(sessions): contador y acompañantes coherentes en detail`** — Feature 1.
2. **`feat(sessions): edición y cierre de mesa para el creador`** — Feature 2 (backend + frontend juntos).
3. **`feat(games): resumen LLM con Claude Haiku`** — Feature 3.

Cada commit autocontenido (tests verdes). Push al final, cuando todo esté integrado y revisado, siguiendo la regla de cierre del proyecto.

## Riesgos y decisiones abiertas

- **API key**: si el usuario no llega a configurarla, F3 funciona en modo Noop (sin resúmenes). El feature está "listo pero apagado".
- **Idioma del resumen**: por ahora solo `es`/`en`. Si llega un `Accept-Language: fr`, cae al `es` default. Aceptable.
- **Rate limits de Anthropic**: con 2 calls por juego nuevo y volumen bajo, no es preocupación cercana.
- **Tests del cliente Claude real**: usamos WireMock, no llamamos a la API real en CI.
