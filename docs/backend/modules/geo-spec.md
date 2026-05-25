# Módulo Geo — Spec

> Lectura pública de provincias / localidades / zonas para alimentar dropdowns
> dependientes en el frontend (registro de usuario, filtros, perfil).

Referencia capa: [../spec.md](../spec.md) · Global: [../../spec.md](../../spec.md)

---

## Propósito

Expone el catálogo geográfico ya existente en BD (entidades `Province`, `City`, `Area`)
como endpoints REST públicos, optimizados para alimentar dropdowns en cascada en el
frontend:

```
Provincia (52)  →  Localidad (filtra por provincia)  →  Zona (filtra por localidad)
```

No incluye creación / edición — el catálogo se gestiona vía seeds de BD o admin
externo, no por API.

---

## Decisiones cerradas

| Decisión | Valor | Motivo |
|----------|-------|--------|
| Endpoints | Tres GET independientes (provinces, cities, areas) | Cascada explícita controlada por el cliente |
| Auth | **Público** (sin JWT) | Necesario en `/register` antes de tener cuenta |
| Paginación | **No** | Volúmenes pequeños por filtro (≤ unas cientos por provincia) |
| Ordenación | Por `name` ASC | UX natural en dropdowns |
| Cache HTTP | `Cache-Control: public, max-age=86400` (1 día) | Catálogo casi inmutable |
| 404 si código no existe | Sí, con `error.geo.*.not.found` | Mensaje claro al cliente |
| Filtro requerido | `cities` exige `provinceCode`; `areas` exige `cityCode` | Evita devolver miles de filas |
| DTOs | `record` inmutable, solo `code` + `name` (+ FK donde aplique) | Sin exponer entidades JPA |

---

## Endpoints

Base: `/api/v1/geo`

### `GET /api/v1/geo/provinces`

**Auth:** público.

Devuelve **todas las provincias** ordenadas por nombre.

Respuesta `200 OK`:
```json
[
  { "code": "01", "name": "Álava" },
  { "code": "08", "name": "Barcelona" },
  { "code": "28", "name": "Madrid" }
]
```

Cabeceras: `Cache-Control: public, max-age=86400`.

---

### `GET /api/v1/geo/cities?provinceCode={code}`

**Auth:** público.

Devuelve las localidades de una provincia, ordenadas por nombre.

Query params:

| Parámetro | Tipo | Obligatorio | Notas |
|-----------|------|-------------|-------|
| `provinceCode` | `string(2)` | **sí** | Código de provincia (2 chars). Si falta → 400. |

Respuesta `200 OK`:
```json
[
  { "code": "08019", "name": "Barcelona", "provinceCode": "08" },
  { "code": "08015", "name": "Badalona",  "provinceCode": "08" }
]
```

Cabeceras: `Cache-Control: public, max-age=86400`.

Errores:

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `error.validation` | `provinceCode` ausente o vacío. |
| 404 | `error.geo.province.not.found` | La provincia no existe en BD. |

---

### `GET /api/v1/geo/areas?cityCode={code}`

**Auth:** público.

Devuelve las zonas / barrios de una localidad, ordenadas por nombre.

Query params:

| Parámetro | Tipo | Obligatorio | Notas |
|-----------|------|-------------|-------|
| `cityCode` | `string(≤8)` | **sí** | Código de localidad. Si falta → 400. |

Respuesta `200 OK`:
```json
[
  { "code": "08019-001", "name": "Ciutat Vella", "cityCode": "08019" },
  { "code": "08019-002", "name": "Eixample",     "cityCode": "08019" }
]
```

Cabeceras: `Cache-Control: public, max-age=86400`.

Errores:

| HTTP | `code` | Cuándo |
|------|--------|--------|
| 400 | `error.validation` | `cityCode` ausente o vacío. |
| 404 | `error.geo.city.not.found` | La localidad no existe en BD. |

---

## Estructura de paquetes

```
com.matchplay.geo/
├── controller/
│   └── GeoController.java
├── service/
│   ├── GeoService.java
│   └── GeoServiceImpl.java
├── mapper/
│   └── GeoMapper.java
├── dto/
│   ├── ProvinceResponse.java
│   ├── CityResponse.java
│   └── AreaResponse.java
├── entity/                  (ya existe)
│   ├── Province.java
│   ├── City.java
│   └── Area.java
├── repository/              (ya existe — añadir métodos derivados)
│   ├── ProvinceRepository.java
│   ├── CityRepository.java
│   └── AreaRepository.java
└── exception/               (ya existe)
    └── GeoCodeNotFoundException.java
```

---

## DTOs

```java
public record ProvinceResponse(String code, String name) {}
public record CityResponse(String code, String name, String provinceCode) {}
public record AreaResponse(String code, String name, String cityCode) {}
```

Sin nesting de DTO de provincia/ciudad dentro: lo necesario es solo la FK para
que el cliente pueda mantener su selección al recargar.

---

## Lógica del service

```java
public interface GeoService {
    List<ProvinceResponse> listProvinces();
    List<CityResponse> listCitiesByProvince(String provinceCode);
    List<AreaResponse> listAreasByCity(String cityCode);
}
```

Implementación:

- `listProvinces()`: `provinceRepository.findAllByOrderByNameAsc()` → mapear.
- `listCitiesByProvince(code)`:
  1. Si `!provinceRepository.existsById(code)` → `GeoCodeNotFoundException("error.geo.province.not.found", code)`.
  2. `cityRepository.findByProvinceCodeOrderByNameAsc(code)` → mapear.
- `listAreasByCity(code)`:
  1. Si `!cityRepository.existsById(code)` → `GeoCodeNotFoundException("error.geo.city.not.found", code)`.
  2. `areaRepository.findByCityCodeOrderByNameAsc(code)` → mapear.

`@Transactional(readOnly = true)` en toda la clase.

---

## Controller

```java
@RestController
@RequestMapping("/api/v1/geo")
public class GeoController {
    @GetMapping("/provinces")
    public ResponseEntity<List<ProvinceResponse>> provinces() { ... }

    @GetMapping("/cities")
    public ResponseEntity<List<CityResponse>> cities(@RequestParam String provinceCode) { ... }

    @GetMapping("/areas")
    public ResponseEntity<List<AreaResponse>> areas(@RequestParam String cityCode) { ... }
}
```

Todos responden con `Cache-Control: public, max-age=86400`.

`provinceCode` y `cityCode` son `required = true` (default de `@RequestParam`).
Si faltan → Spring lanza `MissingServletRequestParameterException` (no manejada
custom: cae en el handler genérico `Exception` → 500). **Acción**: añadir handler
específico que devuelva 400 con `error.validation`.

---

## SecurityConfig

Añadir línea de endpoints públicos:

```java
.requestMatchers(HttpMethod.GET, "/api/v1/geo/**").permitAll()
```

---

## Excepciones e i18n

- `GeoCodeNotFoundException` ya existe (paquete `com.matchplay.geo.exception`).
- Handler en `GlobalExceptionHandler` ya existe → 404.
- Claves i18n ya existen (`error.geo.province.not.found`, `error.geo.city.not.found`, `error.geo.area.not.found`).
- **Nuevo**: handler para `MissingServletRequestParameterException` → 400 `error.validation`.

---

## Testing

### Unit (`GeoServiceImplTest`)

- Mocks de los 3 repositorios.
- `listProvinces_returnsAllSortedByName`.
- `listCitiesByProvince_provinceExists_returnsCities`.
- `listCitiesByProvince_provinceNotFound_throws`.
- `listAreasByCity_cityExists_returnsAreas`.
- `listAreasByCity_cityNotFound_throws`.

### Integración (`GeoControllerTest` con standalone MockMvc)

- `provinces_returns200WithList`.
- `provinces_setsCacheControlHeader`.
- `cities_withProvinceCode_returns200`.
- `cities_withoutProvinceCode_returns400`.
- `cities_provinceNotFound_returns404`.
- `areas_withCityCode_returns200`.
- `areas_withoutCityCode_returns400`.
- `areas_cityNotFound_returns404`.

Reutilizar el patrón de los tests existentes (LocaleConfig + MessageSource +
MappingJackson2HttpMessageConverter con JavaTimeModule).

---

## Datos de seed

Fuera de alcance de este spec. Se cargarán por:

- `data.sql` en `src/main/resources/` (Spring Boot lo ejecuta al arrancar si
  `spring.sql.init.mode=always`), **o**
- Migración Flyway / Liquibase cuando se introduzca (recomendable a futuro), **o**
- Script SQL manual antes del primer deploy.

En tests integración (`AuthFlowTest`) los datos se siembran via `@BeforeEach`
con los repositorios (ya hecho para las provincias 08 / 08019 / 08019-001).

---

## Fuera de alcance

- Creación / edición / borrado de provincias, ciudades, zonas (no se expone API).
- Geocoding (lat/lon, búsqueda por proximidad). Si se necesita más adelante,
  se añade un nuevo endpoint `/areas/{code}/coords` o se integra PostGIS.
- Localización de los `name` (los nombres vienen en el idioma de la BD; v1 solo es).
- Búsqueda full-text en provincias/ciudades. Si crece la lista, añadir
  `?q=barcelo` con `LIKE` o un endpoint search.
- Paginación. Si una ciudad acabara teniendo > 500 áreas, se introduciría.
