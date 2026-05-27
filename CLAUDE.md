<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

---

## Agent Skills (npx skills)

Este proyecto usa skills externas instaladas con la CLI [`npx skills`](https://github.com/vercel-labs/skills).
Las skills viven en `.agents/skills/` (gitignored) y se simlinkean a `.claude/skills/`
para que Claude Code las recoja.

### Primera vez clonando el repo

Ejecuta una vez tras clonar:

```bash
# Skills SEO para Matchplay (ver docs/frontend/spec.md, sección SEO)
npx skills add coreyhaines31/marketingskills --skill seo-audit ai-seo schema site-architecture
```

### Skills instaladas y cuándo se disparan

| Skill | Cuándo usarla |
|-------|---------------|
| `seo-audit` | Auditoría técnica de SEO: meta tags, indexación, Core Web Vitals, crawl errors. |
| `ai-seo` | Optimizar para LLMs (ChatGPT, Perplexity, Claude…): AEO/GEO, citas en respuestas IA. |
| `schema` | Añadir / arreglar JSON-LD y structured data para rich snippets. |
| `site-architecture` | Diseñar jerarquía de páginas, URLs, internal linking, navegación. |

### Añadir más skills del mismo repo

```bash
# Listar todas las disponibles
npx skills add coreyhaines31/marketingskills --list

# Añadir las que necesites
npx skills add coreyhaines31/marketingskills --skill <nombre>
```

> ⚠️ Las skills se ejecutan con permisos del agente. Revisa el contenido de cualquier
> skill nueva en `.agents/skills/<nombre>/SKILL.md` antes de usarla.

---

## Reglas del proyecto que cuestan caro si se olvidan

### Cambios en records / interfaces compartidos por tests

Cuando añadas o quites un campo a:

- Un **record** Java (DTO de request/response, p.ej. `CreateSessionRequest`,
  `SessionDetailResponse`, `SessionSummaryResponse`).
- Un **interface** TS exportado que se usa como tipo en mocks/fixtures
  (p.ej. `SessionDetail`, `SessionSummary`, `CurrentUser`).

Los tests construyen estos objetos **posicionalmente** (Java) o con object
literals (TS). Si no actualizas TODAS las invocaciones en el mismo commit,
los tests rompen en archivos lejanos al que tocaste.

**Antes de cerrar el cambio**: `Grep` por `new <ClassName>(` (Java) o por
el nombre del interface (TS) en `**/test/**` y actualiza cada fixture.
En particular revisa:

- `backend/src/test/java/com/matchplay/session/service/GameSessionServiceImplTest.java` — tiene un helper `detail()` que construye `SessionDetailResponse` y varios sitios que construyen `CreateSessionRequest`.
- `backend/src/test/java/com/matchplay/session/controller/GameSessionControllerTest.java` — MSW-style responses.
- `frontend/src/features/sessions/__tests__/*.test.tsx` — fixtures + MSW responses.
- `frontend/src/shared/components/__tests__/SessionCard.test.tsx` — fixture `SessionSummary`.

Si el cambio es un campo opcional, pásalo como `null` (Java) o omítelo (TS) en los fixtures existentes para minimizar cambios.

### Configuración backend: `.env` + `application.properties`

El backend usa **`spring-dotenv`** (`pom.xml`): carga automáticamente `backend/.env`
al arrancar y mapea las variables como properties Spring. El archivo es
**`.env`** (no `.env.local`) y está en `.gitignore` raíz. Hay un
`backend/.env.example` como template — añade cualquier env var nueva ahí.

El config file es **`application.properties`** (no `.yml`). Sintaxis típica
para variables opcionales: `mi.prop=${MI_VAR:default}`. Sin default (`${MI_VAR}`)
falla fast si no está en `.env`.

Para integraciones con APIs externas que pueden no tener key configurada
(ej. Anthropic), usa el patrón "bean Noop por defecto":

```java
@Bean
public XClient xClient(@Value("${x.api-key:}") String apiKey) {
    if (apiKey == null || apiKey.isBlank()) {
        log.info("X disabled — no X_API_KEY configured");
        return new NoopXClient();
    }
    log.info("X enabled");
    return new RealXClient(apiKey);
}
```

Así el sistema arranca y funciona en local sin la key, y los tests no
necesitan mockear la integración real.

### Columnas VARCHAR con contenido de fuentes externas (LLM, APIs)

Si una columna `VARCHAR(N)` se rellena con texto que viene de un LLM o de
una API que no controlas, **trunca client-side antes de persistir** con
margen de seguridad bajo el límite. Defensa en profundidad:

1. Prompt o petición pide longitud objetivo (~80% del límite).
2. `max_tokens` o equivalente cap físico.
3. Truncate en código a `N-50` cortando en palabra completa con `…`.

Solo confiar en el prompt rompe la BBDD el día que el modelo se pase
(error `Data truncation: Data too long for column X`), y como suele estar
dentro de un `@Transactional` rolea-back todo y deja al sistema atascado
(el caché no se guarda, próximo intento re-falla igual). Ver patrón en
`ClaudeHaikuSummaryClient.truncate()`.

### Jackson omite nulls por defecto — usa @JsonInclude(ALWAYS) cuando el null es semántico

`application.properties` tiene `spring.jackson.default-property-inclusion=non_null`. Esto **omite campos null** del JSON de salida en TODOS los DTOs por defecto.

Si en un DTO algún campo nullable es **semánticamente significativo** (el frontend necesita distinguir `null` de ausente/`undefined`, p.ej. `chatUnreadCount=null` ≠ `chatUnreadCount=0`), añade a nivel de record:

```java
@JsonInclude(JsonInclude.Include.ALWAYS)
public record MyResponse(Integer optionalField, ...) {}
```

**Síntoma típico** del bug: el tipo TS dice `field: T | null`, el FE compara `field === null` y nunca matchea porque en runtime es `undefined`. El test de servicio pasa (la lógica devuelve null) pero la integración FE/BE falla en producción.

**Cómo prevenirlo**:
- Cuando añadas un DTO o campo nullable con semántica significativa, decide explícitamente si quieres serializar el null y anótalo con `@JsonInclude(ALWAYS)`.
- En los tests del controller, configura el `ObjectMapper` con `setDefaultPropertyInclusion(NON_NULL)` para simular el comportamiento de producción, luego verifica con `.andExpect(jsonPath("$.field").value(nullValue()))` que el campo sí aparece.
- En el FE, considera usar `== null` (loose equality, cubre `null` y `undefined`) en lugar de `=== null` como defensa en profundidad.

### Pre-commit hook

El proyecto tiene **husky + lint-staged**: al commitear, prettier + eslint --fix
se ejecutan automáticamente sobre los archivos staged. No hace falta correr
`npm run format` antes de commit. Si el hook modifica archivos, los incluye
en el mismo commit (no quedan cambios pendientes).

### Commits y push — flujo de cierre de sesión

**Commits**: se pueden hacer libremente al ir cerrando trozos coherentes de
trabajo. Cada commit debe ser autocontenido (compila + tests verde) por si
hace falta volver atrás.

**Push**: **NO pushear sin permiso explícito del usuario**. El push ocurre
al final de la sesión, cuando el usuario lo pide (típicamente con un
"haz push" / "cierra la sesión" / "terminamos por hoy" / similar). Ese
mismo momento es cuando se actualiza la documentación.

**Cierre de sesión** (cuando el usuario lo indica): hacer en este orden:

1. Asegurarse de que los specs (`docs/**`) reflejan lo cambiado en la
   sesión. Revisar `docs/backend/modules/*.md`, `docs/frontend/spec.md` y
   `docs/frontend/modules/*.md`.
2. Si hay un cambio en el spec o en regla de proyecto que merece quedar
   anotado para sesiones futuras, actualizar este `CLAUDE.md`.
3. Hacer el último commit con los cambios de docs si hace falta.
4. Hacer `git push origin master`. El auto-mode classifier puede bloquear
   el push directo a master — el usuario confirma cuando se le pide.

Convención del repo: trabajamos directo sobre `master` (no usamos feature
branches ni PR review en este proyecto).
