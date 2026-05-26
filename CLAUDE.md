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

### Pre-commit hook

El proyecto tiene **husky + lint-staged**: al commitear, prettier + eslint --fix
se ejecutan automáticamente sobre los archivos staged. No hace falta correr
`npm run format` antes de commit. Si el hook modifica archivos, los incluye
en el mismo commit (no quedan cambios pendientes).

### Push a `master`

Convención del repo: trabajamos directo sobre `master` (no usamos feature
branches ni PR review en este proyecto). El auto-mode classifier puede
bloquear el push directo — el user confirma cuando es el flujo habitual.
