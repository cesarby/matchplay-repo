# Backend — Spec Orquestador

> Spring Boot 3.4.x · Java 21 · Maven · MySQL 8 · JWT

Referencia global: [../spec.md](../spec.md)

---

## Specs de módulos

| Módulo | Archivo | Estado |
|--------|---------|--------|
| Auth | [modules/auth-spec.md](modules/auth-spec.md) | Definido + implementado |
| Partidas (sessions) | [modules/sessions-spec.md](modules/sessions-spec.md) | Definido + implementado (Fase 1 + 1.1) |
| Stats públicas | (integrado en sessions, sin spec propio) | Implementado (`GET /api/v1/stats/public`) |
| Usuarios | [modules/users-spec.md](modules/users-spec.md) | Pendiente |
| Juegos (búsqueda BGG) | [modules/games-spec.md](modules/games-spec.md) | Definido + implementado |
| Geo (provincias/ciudades/zonas) | [modules/geo-spec.md](modules/geo-spec.md) | Definido + implementado |
| Admin | [modules/admin-spec.md](modules/admin-spec.md) | Pendiente |

---

## Estructura de paquetes

```
com.matchplay
├── config/           # Configuración (Security, CORS, JWT, Swagger)
├── exception/        # GlobalExceptionHandler, excepciones custom
├── auth/             # Login, registro, JWT filter
│   ├── controller/
│   ├── service/
│   ├── dto/
│   └── ...
├── session/          # Módulo partidas
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/
│   ├── dto/
│   └── mapper/
├── user/             # Módulo usuarios
│   └── ...
└── admin/            # Módulo admin
    └── ...
```

Cada módulo es autocontenido: controller + service + repository + entity + dto + mapper en su propio paquete.

---

## Dependencias Maven (pom.xml)

```xml
<!-- Web -->
spring-boot-starter-web

<!-- Seguridad + JWT -->
spring-boot-starter-security
io.jsonwebtoken:jjwt-api:0.12.x
io.jsonwebtoken:jjwt-impl:0.12.x
io.jsonwebtoken:jjwt-jackson:0.12.x

<!-- Persistencia -->
spring-boot-starter-data-jpa
com.mysql:mysql-connector-j

<!-- Utilidades -->
org.projectlombok:lombok
org.mapstruct:mapstruct:1.6.x
org.mapstruct:mapstruct-processor:1.6.x

<!-- Validación -->
spring-boot-starter-validation

<!-- Dev -->
spring-boot-devtools (runtime, optional)

<!-- Test -->
spring-boot-starter-test
spring-security-test
```

---

## Configuración (application.properties)

```properties
server.port=8080
spring.application.name=matchplay-backend

# MySQL
spring.datasource.url=jdbc:mysql://localhost:3306/matchplay
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false

# JWT
app.jwt.secret=${JWT_SECRET}
app.jwt.expiration-ms=86400000
app.jwt.refresh-expiration-ms=604800000

# CORS (dev)
app.cors.allowed-origins=http://localhost:5173
```

Variables de entorno en `.env` local (no comitear).

---

## Reglas de arquitectura

1. **Controllers** solo reciben request, llaman al service y devuelven respuesta. Sin lógica de negocio.
2. **Services** contienen toda la lógica. Sin referencias a `HttpServletRequest` ni anotaciones HTTP.
3. **Repositories** solo definen queries JPA. Sin lógica.
4. **Entities** mapeadas a tablas. Sin anotaciones de Jackson. Nunca se exponen directamente en la API.
5. **DTOs** son los objetos de entrada/salida de la API. Validados con `@Valid` + Bean Validation.
6. **Mappers** (MapStruct) convierten Entity ↔ DTO. Sin lógica manual de mapeo en services.

---

## Manejo de errores

`GlobalExceptionHandler` (`@RestControllerAdvice`) captura:

| Excepción | HTTP |
|-----------|------|
| `EntityNotFoundException` | 404 |
| `MethodArgumentNotValidException` | 400 |
| `AccessDeniedException` | 403 |
| `AuthenticationException` | 401 |
| `Exception` (genérica) | 500 |

Respuesta uniforme (ver spec global).

---

## Seguridad

- Endpoints públicos: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/sessions` (listado público).
- El resto requiere JWT válido.
- Control de roles con `@PreAuthorize("hasRole('ADMIN')")` o `@PreAuthorize("hasRole('USER')")`.
- CORS configurado para permitir solo los orígenes definidos en `app.cors.allowed-origins`.

---

## Testing

- Tests unitarios de services con JUnit 5 + Mockito.
- Tests de integración de controllers con `@SpringBootTest` + `MockMvc`.
- Cobertura mínima objetivo: 80% en capa service.

---

## Reglas de código limpio

### Naming

- Los nombres explican el **qué**, no el **cómo**. Si necesitas un comentario para entender el nombre, cámbialo.
- Clases: sustantivo (`SessionService`, `UserMapper`). No: `Manager`, `Helper`, `Util` a secas.
- Métodos: verbo + sustantivo (`findSessionById`, `createUser`, `calculateAvailableSlots`).
- Booleanos: prefijo `is`, `has`, `can` (`isAvailable`, `hasJoined`, `canJoin`).
- Constantes: `UPPER_SNAKE_CASE` (`MAX_PLAYERS_PER_SESSION`).
- No abreviaturas salvo convenciones universales (`id`, `dto`, `url`).

### Métodos

- Un método = una responsabilidad. Si necesitas describir lo que hace con "y", divídelo.
- Máximo **20 líneas** por método. Si crece más, extraer método privado con nombre descriptivo.
- Máximo **3 parámetros**. Si necesitas más, crear un objeto/DTO.
- Sin efectos secundarios ocultos: si un método se llama `getSession`, no debe modificar estado.
- Retornar temprano (`guard clauses`) en lugar de anidar `if-else`:
  ```java
  // MAL
  if (user != null) {
      if (user.isActive()) { ... }
  }

  // BIEN
  if (user == null) throw new EntityNotFoundException("User not found");
  if (!user.isActive()) throw new BusinessException("User is not active");
  // lógica principal aquí
  ```

### Clases

- Máximo **200 líneas** por clase. Si crece, es señal de más de una responsabilidad.
- Una clase = una responsabilidad (SRP). Un `SessionService` gestiona sesiones, no manda emails.
- No usar herencia donde basta composición.
- Inyección de dependencias siempre por **constructor** (no `@Autowired` en campo). Lombok `@RequiredArgsConstructor` para simplificar.

### Inmutabilidad y null safety

- Preferir objetos inmutables donde sea posible.
- Usar `Optional<T>` para retornos que pueden ser vacíos. Nunca retornar `null` desde un service.
- Nunca pasar `null` como argumento. Si un parámetro es opcional, usar sobrecarga o `Optional`.

### Comentarios

- El código debe ser autoexplicativo. **No comentar qué hace el código**, solo el **por qué** cuando no es obvio.
- Prohibido: `// obtiene el usuario por id` encima de `getUserById()`.
- Permitido: `// MySQL no soporta SKIP LOCKED en versiones < 8.0, usamos PESSIMISTIC_WRITE`
- Los `TODO` deben ir con nombre y fecha: `// TODO(cesar, 2026-05): migrar a evento async`.
- Javadoc solo en interfaces públicas de service si el contrato no es evidente.

### Excepciones

- Usar excepciones específicas y descriptivas. No lanzar `RuntimeException("error")`.
- Crear excepciones custom en `exception/`: `SessionNotFoundException`, `SessionFullException`, `UnauthorizedActionException`.
- No capturar `Exception` genérica salvo en el `GlobalExceptionHandler`.
- No usar excepciones para flujo de control normal (no `try/catch` como `if/else`).
- Siempre loguear con contexto útil: `log.error("Session {} not found for user {}", sessionId, userId)`.

### Constantes y números mágicos

- Cero números mágicos en el código. Extraer a constante con nombre:
  ```java
  // MAL
  if (players.size() >= 8) { ... }

  // BIEN
  private static final int MAX_PLAYERS = 8;
  if (players.size() >= MAX_PLAYERS) { ... }
  ```
- Constantes de dominio en la propia entidad o en una clase `*Constants` del módulo.

### Estructura de un Service (patrón estándar)

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SessionMapper sessionMapper;

    public SessionResponse findById(Long id) {
        Session session = sessionRepository.findById(id)
            .orElseThrow(() -> new SessionNotFoundException(id));
        return sessionMapper.toResponse(session);
    }

    public SessionResponse create(SessionRequest request, Long creatorId) {
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new UserNotFoundException(creatorId));
        Session session = sessionMapper.toEntity(request);
        session.setCreator(creator);
        return sessionMapper.toResponse(sessionRepository.save(session));
    }
}
```

### Lo que no se hace

- No usar `System.out.println`. Siempre SLF4J (`@Slf4j` + `log.info/debug/error`).
- No hardcodear credenciales, URLs ni configuración. Todo en `application.properties` o variables de entorno.
- No commitear código comentado. Si no se usa, se borra.
- No dejar imports sin usar ni variables sin usar (el compilador ya avisa, tratarlo como error).
- No `@SuppressWarnings` sin comentario que justifique por qué.

---

## Principios SOLID

### S — Single Responsibility
Cada clase tiene un único motivo para cambiar.
- `SessionService` gestiona lógica de partidas. No manda emails, no formatea respuestas HTTP.
- Si un service necesita enviar notificaciones, delega en `NotificationService`.

### O — Open/Closed
Abierto a extensión, cerrado a modificación.
- Usar interfaces para contratos de service (`SessionService` → `SessionServiceImpl`).
- Añadir comportamiento nuevo con nuevas clases, no modificando las existentes.
- Ejemplo: nuevos tipos de validación de partida → nueva implementación de `SessionValidator`, no tocar la existente.

### L — Liskov Substitution
Las implementaciones deben poder sustituir a sus interfaces sin romper el contrato.
- Si `SessionRepository` extiende `JpaRepository`, no sobreescribir métodos cambiando su semántica.
- Las subclases de entidades deben respetar el comportamiento de la entidad base.

### I — Interface Segregation
Interfaces pequeñas y específicas, no gordas y genéricas.
- Preferir `SessionReadService` + `SessionWriteService` a un único `SessionService` con 30 métodos.
- Los controllers solo dependen de la interfaz que necesitan.

### D — Dependency Inversion
Depender de abstracciones, no de implementaciones concretas.
- Los services dependen de interfaces de repository, no de clases concretas JPA.
- Inyección por constructor siempre (nunca `new` dentro de un service para instanciar dependencias).

```java
// MAL — dependencia directa de implementación
private final SessionRepositoryImpl sessionRepository = new SessionRepositoryImpl();

// BIEN — dependencia de abstracción, inyectada
private final SessionRepository sessionRepository; // interfaz JPA
```

---

## Reglas de arquitectura por capas

```
HTTP Request
    │
    ▼
Controller          → valida entrada (Bean Validation), llama al service, devuelve ResponseEntity
    │
    ▼
Service (interfaz)  → lógica de negocio, transacciones, orquesta repositorios
    │
    ▼
Repository          → acceso a datos (JPA), solo queries
    │
    ▼
Entity              → modelo de dominio, mapeado a tabla
```

### Reglas estrictas de dependencia

| Capa | Puede depender de | No puede depender de |
|------|-------------------|----------------------|
| Controller | Service (interfaz), DTOs | Repository, Entity, otras capas |
| Service | Repository (interfaz), Entity, DTOs, Mapper | Controller, HttpServletRequest |
| Repository | Entity | Service, Controller, DTO |
| Entity | — (solo JPA annotations) | Ninguna otra capa |
| DTO | — (solo validaciones) | Entity, Service, Repository |
| Mapper | Entity, DTO | Service, Repository, Controller |

### Flujo de datos

```
Request DTO → (Controller) → Service → (Mapper) → Entity → Repository → BD
BD → Repository → Entity → (Mapper) → Response DTO → (Controller) → ResponseEntity
```

- Nunca devolver una `Entity` directamente desde un controller.
- Nunca recibir una `Entity` como parámetro de un controller.
- Los mappers son la única frontera Entity ↔ DTO.

---

## Reglas de validación

### Dónde validar

| Tipo de validación | Dónde |
|--------------------|-------|
| Formato / tipo / nulos (sintáctica) | DTO con Bean Validation (`@NotBlank`, `@Email`, `@Min`...) |
| Reglas de negocio (semántica) | Service, lanzando excepciones custom |
| Unicidad / integridad referencial | Repository + excepción capturada en Service |

### En DTOs (entrada)

```java
public record SessionRequest(
    @NotBlank(message = "{session.name.required}")
    @Size(max = 100, message = "{session.name.size}")
    String name,

    @NotNull(message = "{session.date.required}")
    @Future(message = "{session.date.future}")
    LocalDateTime scheduledAt,

    @NotNull(message = "{session.maxPlayers.required}")
    @Min(value = 2, message = "{session.maxPlayers.min}")
    @Max(value = 20, message = "{session.maxPlayers.max}")
    Integer maxPlayers
) {}
```

- Los mensajes de validación referencian claves de `messages_es.properties` / `messages_en.properties`.
- Usar `@Valid` en el parámetro del controller para activar la validación.
- Nunca validar manualmente en el controller lo que Bean Validation puede hacer.

### En Services (reglas de negocio)

```java
// Ejemplo: no se puede apuntar a una partida llena
if (session.isFull()) {
    throw new SessionFullException(sessionId);
}
// Ejemplo: no se puede apuntar a tu propia partida
if (session.isCreatedBy(userId)) {
    throw new UnauthorizedActionException("error.session.join.own");
}
```

---

## Reglas de JPA / Hibernate

### Entidades

```java
@Entity
@Table(name = "game_sessions")
@Getter
@Setter
@NoArgsConstructor
public class GameSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SessionPlayer> players = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

- `FetchType.LAZY` por defecto en todas las relaciones. `EAGER` solo si hay justificación documentada.
- Inicializar colecciones en la declaración (`= new ArrayList<>()`) para evitar NPE.
- `@CreationTimestamp` y `@UpdateTimestamp` en todas las entidades.
- No usar `@Data` de Lombok en entidades — genera `equals/hashCode` basado en todos los campos, lo que rompe JPA. Usar `@Getter` + `@Setter` + `@NoArgsConstructor`.
- `equals` y `hashCode` basados únicamente en `id`:
  ```java
  @Override
  public boolean equals(Object o) {
      if (this == o) return true;
      if (!(o instanceof GameSession s)) return false;
      return id != null && id.equals(s.id);
  }
  @Override
  public int hashCode() { return getClass().hashCode(); }
  ```

### Queries

- Queries simples: métodos derivados de Spring Data (`findByCreatorId`, `findByScheduledAtAfter`).
- Queries complejas: `@Query` con JPQL, no SQL nativo salvo necesidad técnica documentada.
- SQL nativo (`nativeQuery = true`) solo para optimizaciones específicas, con comentario explicativo.
- Nunca hacer queries dentro de un bucle (problema N+1). Usar `JOIN FETCH` o `@EntityGraph`.

```java
// MAL — N+1 queries
sessions.forEach(s -> s.getPlayers().size()); // lazy load por cada sesión

// BIEN — un solo JOIN FETCH
@Query("SELECT s FROM GameSession s LEFT JOIN FETCH s.players WHERE s.id = :id")
Optional<GameSession> findByIdWithPlayers(@Param("id") Long id);
```

### Paginación

- Todos los listados devuelven `Page<T>`, nunca `List<T>` sin límite.
- Tamaño de página por defecto: 20. Máximo permitido: 100.
- El controller acepta `Pageable` como parámetro (`@PageableDefault(size = 20)`).

---

## Reglas para DTOs

- Los DTOs son **records** de Java (inmutables) siempre que sea posible:
  ```java
  public record SessionResponse(Long id, String name, LocalDateTime scheduledAt, int maxPlayers, int currentPlayers) {}
  public record SessionRequest(@NotBlank String name, @NotNull LocalDateTime scheduledAt, @NotNull Integer maxPlayers) {}
  ```
- Separar siempre Request DTO (entrada) de Response DTO (salida). Nunca un DTO bidireccional.
- Nunca incluir campos de contraseña ni tokens en Response DTOs.
- Nunca exponer IDs internos que no sean necesarios para el cliente.
- Campos de fecha siempre en `ISO 8601` (`LocalDateTime` serializado por Jackson como `"2026-05-22T18:00:00"`).
- Nombres de campos en `camelCase` en el JSON (Jackson por defecto con `spring.jackson.property-naming-strategy=LOWER_CAMEL_CASE`).
- Los DTOs de paginación devuelven:
  ```json
  {
    "content": [...],
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "last": false
  }
  ```

---

## Reglas de transacciones

- `@Transactional` va en la capa **Service**, nunca en Controller ni Repository.
- Métodos de lectura: `@Transactional(readOnly = true)` — mejora rendimiento y previene escrituras accidentales.
- Métodos de escritura: `@Transactional` (sin `readOnly`).
- Anotar la clase con `@Transactional(readOnly = true)` y sobreescribir con `@Transactional` solo en los métodos de escritura:
  ```java
  @Service
  @Transactional(readOnly = true)
  public class SessionServiceImpl implements SessionService {

      public SessionResponse findById(Long id) { ... } // hereda readOnly

      @Transactional // escritura — sobreescribe
      public SessionResponse create(SessionRequest request, Long creatorId) { ... }
  }
  ```
- No capturar excepciones dentro de un método `@Transactional` si se quiere que el rollback ocurra — las excepciones unchecked hacen rollback automático.
- Evitar transacciones largas: no hacer llamadas a APIs externas dentro de una transacción.
- No usar `@Transactional` en métodos privados — Spring AOP no los intercepta.

---

## Manejo de errores centralizado

### Arquitectura

Todos los errores pasan por un único punto: `GlobalExceptionHandler`.

```
Exception lanzada en Service
    │
    ▼
GlobalExceptionHandler (@RestControllerAdvice)
    │
    ▼
MessageSource → lee literal de messages_es.properties / messages_en.properties
    │
    ▼
ErrorResponse (JSON uniforme)
```

### Estructura de respuesta de error

```json
{
  "status": 404,
  "error": "Not Found",
  "code": "session.not.found",
  "message": "La partida con id 42 no existe",
  "timestamp": "2026-05-22T18:30:00",
  "path": "/api/v1/sessions/42"
}
```

- `code` es la clave del mensaje (útil para el frontend si necesita lógica por tipo de error).
- `message` es el literal ya resuelto en el idioma del cliente.

### Archivos de mensajes

```
src/main/resources/
├── messages_es.properties   ← idioma por defecto
└── messages_en.properties
```

**messages_es.properties**
```properties
# Genéricos
error.not.found=El recurso con id {0} no existe
error.unauthorized=No tienes permiso para realizar esta acción
error.validation=Error de validación en los datos enviados

# Auth
error.auth.invalid.credentials=Email o contraseña incorrectos
error.auth.token.expired=La sesión ha expirado, vuelve a iniciar sesión
error.auth.token.invalid=Token de autenticación inválido

# Sesiones (partidas)
error.session.not.found=La partida con id {0} no existe
error.session.full=La partida está completa, no hay plazas disponibles
error.session.already.joined=Ya estás apuntado a esta partida
error.session.join.own=No puedes apuntarte a tu propia partida
error.session.name.required=El nombre de la partida es obligatorio
error.session.name.size=El nombre no puede superar {1} caracteres
error.session.date.required=La fecha de la partida es obligatoria
error.session.date.future=La fecha debe ser futura
error.session.maxPlayers.required=El número máximo de jugadores es obligatorio
error.session.maxPlayers.min=La partida debe tener al menos {1} jugadores
error.session.maxPlayers.max=La partida no puede tener más de {1} jugadores

# Usuarios
error.user.not.found=El usuario con id {0} no existe
error.user.email.duplicate=Ya existe una cuenta con ese email
```

**messages_en.properties**
```properties
# Generic
error.not.found=Resource with id {0} not found
error.unauthorized=You are not allowed to perform this action
error.validation=Validation error in submitted data

# Auth
error.auth.invalid.credentials=Invalid email or password
error.auth.token.expired=Session expired, please log in again
error.auth.token.invalid=Invalid authentication token

# Sessions
error.session.not.found=Session with id {0} not found
error.session.full=Session is full, no available spots
error.session.already.joined=You have already joined this session
error.session.join.own=You cannot join your own session
error.session.name.required=Session name is required
error.session.name.size=Name cannot exceed {1} characters
error.session.date.required=Session date is required
error.session.date.future=Date must be in the future
error.session.maxPlayers.required=Max players is required
error.session.maxPlayers.min=Session must have at least {1} players
error.session.maxPlayers.max=Session cannot have more than {1} players

# Users
error.user.not.found=User with id {0} not found
error.user.email.duplicate=An account with that email already exists
```

### GlobalExceptionHandler

```java
@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSessionNotFound(
            SessionNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = messageSource.getMessage(
            "error.session.not.found", new Object[]{ex.getSessionId()}, locale);
        log.warn("Session not found: id={}", ex.getSessionId());
        return buildError(HttpStatus.NOT_FOUND, "error.session.not.found", message, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request, Locale locale) {
        String message = messageSource.getMessage("error.validation", null, locale);
        List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> new FieldError(fe.getField(), fe.getDefaultMessage()))
            .toList();
        log.warn("Validation failed: {}", fieldErrors);
        return buildError(HttpStatus.BAD_REQUEST, "error.validation", message, request, fieldErrors);
    }

    // ... resto de handlers

    private ResponseEntity<ErrorResponse> buildError(
            HttpStatus status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(
            new ErrorResponse(status.value(), status.getReasonPhrase(), code, message,
                LocalDateTime.now(), request.getRequestURI()));
    }
}
```

### Excepciones custom

Todas en `exception/`, con su clave de mensaje integrada:

```java
public class SessionNotFoundException extends RuntimeException {
    private final Long sessionId;
    public SessionNotFoundException(Long sessionId) {
        super("error.session.not.found");
        this.sessionId = sessionId;
    }
}

public class SessionFullException extends RuntimeException {
    public SessionFullException(Long sessionId) { super("error.session.full"); }
}

public class UnauthorizedActionException extends RuntimeException {
    public UnauthorizedActionException(String messageKey) { super(messageKey); }
}
```

### Detección del idioma del cliente

Spring resuelve el `Locale` automáticamente desde la cabecera `Accept-Language` de la request.
Configurar en `config/`:

```java
@Bean
public LocaleResolver localeResolver() {
    AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
    resolver.setDefaultLocale(new Locale("es"));
    resolver.setSupportedLocales(List.of(new Locale("es"), Locale.ENGLISH));
    return resolver;
}

@Bean
public MessageSource messageSource() {
    ResourceBundleMessageSource source = new ResourceBundleMessageSource();
    source.setBasename("messages");
    source.setDefaultEncoding("UTF-8");
    source.setUseCodeAsDefaultMessage(false);
    return source;
}
```

---

## Reglas de API REST

### Diseño de endpoints

| Operación | Método | Ejemplo |
|-----------|--------|---------|
| Listar | `GET` | `GET /api/v1/sessions` |
| Obtener uno | `GET` | `GET /api/v1/sessions/{id}` |
| Crear | `POST` | `POST /api/v1/sessions` |
| Actualizar completo | `PUT` | `PUT /api/v1/sessions/{id}` |
| Actualizar parcial | `PATCH` | `PATCH /api/v1/sessions/{id}` |
| Eliminar | `DELETE` | `DELETE /api/v1/sessions/{id}` |
| Acción de negocio | `POST` | `POST /api/v1/sessions/{id}/join` |

- URLs en `kebab-case` y **sustantivos en plural** (`/sessions`, `/users`, no `/getSession`).
- Acciones que no son CRUD usan sub-recursos con `POST` (`/sessions/{id}/join`, `/sessions/{id}/leave`).
- No incluir verbos en la URL (`/createSession` está prohibido).

### Códigos HTTP

| Situación | Código |
|-----------|--------|
| OK con datos | 200 |
| Creado | 201 + `Location` header |
| Sin contenido (delete, leave) | 204 |
| Petición inválida (validación) | 400 |
| No autenticado | 401 |
| Sin permiso | 403 |
| No encontrado | 404 |
| Conflicto (email duplicado) | 409 |
| Error interno | 500 |

### Cabeceras y respuestas

- Creaciones devuelven `201 Created` con `Location: /api/v1/sessions/{id}`.
- Listados siempre paginados (ver reglas JPA).
- Nunca devolver arrays vacíos como `null` — devolver `[]`.
- Fechas en UTC con zona explícita: `"2026-05-22T18:00:00Z"`.
- No incluir campos `null` en la respuesta (`spring.jackson.default-property-inclusion=non_null`).

### Versionado

- Versión en la URL: `/api/v1/`. Al introducir breaking changes, crear `/api/v2/`.
- Mantener v1 activa durante el periodo de transición.

### Documentación

- Swagger/OpenAPI generado con `springdoc-openapi` (`/swagger-ui.html` en dev).
- Cada endpoint documentado con `@Operation(summary = "...")` y `@ApiResponse`.
- Dependencia a añadir en `pom.xml`:
  ```xml
  <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>2.x</version>
  </dependency>
  ```

---

## Seguridad

### JWT

- Token firmado con `HS512` y clave secreta de mínimo 64 caracteres (variable de entorno `JWT_SECRET`).
- Payload incluye: `sub` (userId), `role`, `iat`, `exp`. Nunca incluir contraseñas ni datos sensibles.
- Token de acceso expira en **24h**. Refresh token en **7 días**.
- El refresh token se almacena en BD (tabla `refresh_tokens`) para poder revocarlo.
- Flujo de refresco: `POST /api/v1/auth/refresh` con el refresh token → devuelve nuevo access token.

### Spring Security

- Configuración en `SecurityConfig` (`@Configuration` + `@EnableWebSecurity` + `@EnableMethodSecurity`).
- `JwtAuthenticationFilter` (`OncePerRequestFilter`) valida el token antes de cada request:
  1. Extrae el token de `Authorization: Bearer <token>`.
  2. Valida firma y expiración.
  3. Carga el usuario y establece `SecurityContext`.
- Sin estado (`SessionCreationPolicy.STATELESS`) — sin sesiones HTTP en servidor.
- `@PreAuthorize` en la capa **service**, no en controller.

### Contraseñas

- Hash con `BCryptPasswordEncoder` (strength 12). Nunca MD5, SHA-1 ni texto plano.
- Nunca loguear contraseñas, ni en formato hasheado.
- En endpoints de cambio de contraseña, verificar la contraseña actual antes de aceptar la nueva.

### CORS

- Lista blanca explícita de orígenes en `app.cors.allowed-origins`. Nunca `allowedOrigins("*")` en producción.
- Métodos permitidos: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- Cabeceras permitidas: `Authorization, Content-Type, Accept-Language`.
- Exponer cabecera `Location` para que el frontend lea la URL del recurso creado.

### Protección general

- Verificar siempre que el recurso pertenece al usuario autenticado antes de modificarlo:
  ```java
  if (!session.getCreator().getId().equals(currentUserId)) {
      throw new UnauthorizedActionException("error.unauthorized");
  }
  ```
- No exponer stack traces en respuestas de error en producción (`server.error.include-stacktrace=never`).
- Cabeceras de seguridad HTTP configuradas en `SecurityConfig`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
- Rate limiting en endpoints de auth para prevenir fuerza bruta (Bucket4j o similar).

---

## Logging

### Niveles por entorno

| Entorno | Root level | `com.matchplay` |
|---------|-----------|----------------|
| Desarrollo | `WARN` | `DEBUG` |
| Producción | `WARN` | `INFO` |

```properties
# application-dev.properties
logging.level.root=WARN
logging.level.com.matchplay=DEBUG

# application-prod.properties
logging.level.root=WARN
logging.level.com.matchplay=INFO
```

### Qué loguear y dónde

| Nivel | Cuándo |
|-------|--------|
| `ERROR` | Excepción inesperada que impide completar la operación. Siempre con stack trace. |
| `WARN` | Situación anómala pero recuperable (recurso no encontrado, validación fallida, token expirado). |
| `INFO` | Eventos de negocio relevantes (partida creada, usuario registrado, unión a partida). |
| `DEBUG` | Flujo interno, valores intermedios. Solo en desarrollo. |

- `ERROR` y `WARN` en `GlobalExceptionHandler`.
- `INFO` en Services, solo en operaciones de escritura significativas.
- `DEBUG` en Services para trazabilidad de flujo si se necesita.
- **Nunca** loguear en Controllers ni Repositories.

### Formato del mensaje

```java
// BIEN — con contexto útil
log.info("Session created: id={}, creator={}, game={}", session.getId(), creatorId, session.getName());
log.warn("Join attempt to full session: sessionId={}, userId={}", sessionId, userId);
log.error("Unexpected error: userId={}", userId, ex);

// MAL — sin contexto
log.info("Session created");
log.error("Error", ex);
```

- Nunca loguear datos personales: contraseñas, tokens JWT, emails completos.
- Incluir siempre el id del recurso y el id del usuario actuante cuando sea relevante.
- En producción, formato JSON para ingesta en sistemas de observabilidad:

```xml
<!-- logback-spring.xml -->
<springProfile name="prod">
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>
    <root level="WARN"><appender-ref ref="JSON"/></root>
    <logger name="com.matchplay" level="INFO"/>
</springProfile>
```

---

## Testing

### Estrategia (pirámide)

```
       /\
      /E2E\          ← Mínimo: happy path por módulo
     /------\
    /Integrac.\      ← Controllers con MockMvc
   /------------\
  / Unitarios    \   ← Mayoría: Services con Mockito
 /----------------\
```

### Tests unitarios — Services

```java
@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock SessionRepository sessionRepository;
    @Mock SessionMapper sessionMapper;
    @InjectMocks SessionServiceImpl sessionService;

    @Test
    void findById_whenExists_returnsResponse() {
        // Arrange
        GameSession session = buildSession(1L, "Catan");
        SessionResponse expected = new SessionResponse(1L, "Catan", ...);
        given(sessionRepository.findById(1L)).willReturn(Optional.of(session));
        given(sessionMapper.toResponse(session)).willReturn(expected);

        // Act
        SessionResponse result = sessionService.findById(1L);

        // Assert
        assertThat(result.name()).isEqualTo("Catan");
        then(sessionRepository).should().findById(1L);
    }

    @Test
    void findById_whenNotFound_throwsException() {
        given(sessionRepository.findById(99L)).willReturn(Optional.empty());
        assertThatThrownBy(() -> sessionService.findById(99L))
            .isInstanceOf(SessionNotFoundException.class);
    }
}
```

- Patrón **Arrange / Act / Assert** en todos los tests.
- Usar `BDDMockito` (`given`, `then`) en lugar de `when`/`verify` clásico.
- Nombre del método: `metodoProbado_condición_resultadoEsperado`.
- No compartir estado mutable entre tests.
- No usar `@SpringBootTest` en tests unitarios.

### Tests de integración — Controllers

```java
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SessionControllerIT {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    @WithMockUser(roles = "USER")
    void createSession_validData_returns201() throws Exception {
        SessionRequest request = new SessionRequest("Catan", LocalDateTime.now().plusDays(1), 4);

        mockMvc.perform(post("/api/v1/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(header().exists("Location"))
            .andExpect(jsonPath("$.name").value("Catan"));
    }

    @Test
    void createSession_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/sessions").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
    }
}
```

- `@Transactional` en tests de integración para rollback automático.
- Probar siempre: happy path · 400 (validación) · 401 (sin auth) · 403 (sin permiso) · 404 (no encontrado).
- Usar `@WithMockUser` de `spring-security-test` para simular roles.

### Cobertura y calidad

- Cobertura mínima en capa **service**: 80%.
- Cobertura mínima en capa **controller**: 70% (vía tests de integración).
- Ejecutar con `mvn verify`. Cobertura medida con JaCoCo.
- Los tests no dependen de orden de ejecución ni de datos externos.

```xml
<!-- pom.xml — JaCoCo con exclusiones -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <excludes>
            <exclude>com/matchplay/*/dto/**</exclude>
            <exclude>com/matchplay/*/entity/**</exclude>
            <exclude>com/matchplay/config/**</exclude>
        </excludes>
    </configuration>
</plugin>
```

---

## Patrones recomendados

### Mapper Pattern (MapStruct)

```java
@Mapper(componentModel = "spring")
public interface SessionMapper {
    SessionResponse toResponse(GameSession session);
    GameSession toEntity(SessionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "creator", ignore = true)
    void updateEntity(SessionRequest request, @MappingTarget GameSession session);
}
```

`updateEntity` para actualizaciones parciales: mapea sobre una entidad existente sin tocar campos ignorados.

### Factory Method en entidades

Para construcción con invariantes de negocio:

```java
public class GameSession {
    private GameSession() {}

    public static GameSession create(String name, User creator, int maxPlayers) {
        if (maxPlayers < 2) throw new IllegalArgumentException("Min 2 players");
        GameSession s = new GameSession();
        s.name = name;
        s.creator = creator;
        s.maxPlayers = maxPlayers;
        s.status = SessionStatus.OPEN;
        return s;
    }
}
```

### Strategy Pattern

Para comportamientos intercambiables. Ejemplo: estrategias de matching cuando se implemente SHOP:

```java
public interface MatchingStrategy {
    List<User> findCandidates(GameSession session);
}

@Component("proximityMatching") class ProximityMatchingStrategy implements MatchingStrategy { ... }
@Component("skillMatching")     class SkillMatchingStrategy     implements MatchingStrategy { ... }
```

### Specification Pattern (filtros dinámicos)

Para evitar la proliferación de métodos en el repository:

```java
public class SessionSpecifications {
    public static Specification<GameSession> hasGame(String game) {
        return (root, query, cb) -> game == null ? null : cb.equal(root.get("name"), game);
    }
    public static Specification<GameSession> isOpen() {
        return (root, query, cb) -> cb.equal(root.get("status"), SessionStatus.OPEN);
    }
}

// En service:
Page<GameSession> results = sessionRepository.findAll(
    where(hasGame(filter.game())).and(isOpen()), pageable);
```

### Anti-patrones prohibidos

| Anti-patrón | Por qué no | Alternativa |
|-------------|-----------|-------------|
| Anemic Domain Model | Entidades sin comportamiento, toda lógica en services | Métodos de dominio en entidad (`session.join(user)`) |
| God Service | Un service con 50 métodos | Dividir por responsabilidad |
| Magic Strings | `"ROLE_USER"` repetido por el código | Enum `Role` o constante |
| Catch and ignore | `catch (Exception e) {}` vacío | Relanzar o loguear siempre |
| Primitive Obsession | Strings sin validación para email, teléfono | Validación estricta o Value Objects |
| Shotgun Surgery | Un cambio requiere tocar 10 clases | Mejorar cohesión del módulo |

---

## Reglas de código limpio — Java 21

### Records para datos inmutables

```java
// BIEN — conciso e inmutable
public record PageMeta(int page, int size, long totalElements) {
    public PageMeta {
        if (size > 100) throw new IllegalArgumentException("Max size is 100");
    }
}
```

### Pattern Matching (Java 16+)

```java
// BIEN
if (ex instanceof SessionNotFoundException snfe) {
    log.warn("Session {} not found", snfe.getSessionId());
}
```

### Switch Expressions (Java 14+)

```java
String method = switch (operation) {
    case CREATE -> "POST";
    case UPDATE -> "PUT";
    case DELETE -> "DELETE";
    default -> throw new IllegalArgumentException("Unknown: " + operation);
};
```

### Text Blocks para JSON en tests

```java
String body = """
    {
      "name": "Catan",
      "maxPlayers": 4
    }
    """;
```

### Streams — reglas

- Usar streams para transformar colecciones, no para efectos secundarios.
- Preferir referencias a métodos (`Session::getName`) sobre lambdas cuando son equivalentes.
- No anidar streams — extraer a método con nombre descriptivo.
- Nunca llamar `.get()` en un `Optional` sin comprobar antes. Usar `.orElseThrow()`.

```java
// BIEN
List<SessionResponse> responses = sessions.stream()
    .filter(GameSession::isOpen)
    .map(sessionMapper::toResponse)
    .toList();

// MAL — efecto secundario dentro de stream
sessions.stream().forEach(s -> { s.setStatus(CLOSED); repo.save(s); });
// Usar bucle for o saveAll fuera del stream
```

### Evitar else tras return/throw

```java
// MAL
if (session == null) {
    throw new SessionNotFoundException(id);
} else {
    return sessionMapper.toResponse(session);
}

// BIEN
if (session == null) throw new SessionNotFoundException(id);
return sessionMapper.toResponse(session);
```

### Formato y estilo

- Máximo **120 caracteres** por línea.
- Formatear con Google Java Format o estilo del equipo definido en `.editorconfig`.

```ini
# .editorconfig
[*.java]
indent_style = space
indent_size = 4
max_line_length = 120
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```
