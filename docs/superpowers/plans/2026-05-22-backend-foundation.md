# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establecer la base del backend: dependencias Maven, conexión a MySQL, entidades JPA y manejo de excepciones globalizado con mensajes i18n.

**Architecture:** Spring Boot 3.4.x con arquitectura por capas (Controller → Service → Repository → Entity). Las excepciones se lanzan en la capa Service y son capturadas por un único `GlobalExceptionHandler`. Los mensajes de error se resuelven desde `messages_es.properties` / `messages_en.properties` según la cabecera `Accept-Language` del cliente.

**Tech Stack:** Spring Boot 3.4.x · Spring Data JPA · MySQL 8 · Lombok · MapStruct 1.6 · jjwt 0.12 · springdoc-openapi 2.x · JUnit 5 · Mockito

---

## Mapa de ficheros

| Acción | Fichero |
|--------|---------|
| Modificar | `backend/pom.xml` |
| Modificar | `backend/src/main/resources/application.properties` |
| Crear | `backend/src/main/resources/application-dev.properties` |
| Crear | `backend/.env.example` |
| Crear | `backend/src/main/resources/messages_es.properties` |
| Crear | `backend/src/main/resources/messages_en.properties` |
| Crear | `backend/src/main/java/com/matchplay/config/LocaleConfig.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/ErrorResponse.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/FieldValidationError.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/MatchplayException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/ResourceNotFoundException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/SessionNotFoundException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/UserNotFoundException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/SessionFullException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/SessionAlreadyJoinedException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/UnauthorizedActionException.java` |
| Crear | `backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java` |
| Crear | `backend/src/main/java/com/matchplay/user/entity/Role.java` |
| Crear | `backend/src/main/java/com/matchplay/user/entity/User.java` |
| Crear | `backend/src/main/java/com/matchplay/session/entity/SessionStatus.java` |
| Crear | `backend/src/main/java/com/matchplay/session/entity/GameSession.java` |
| Crear | `backend/src/main/java/com/matchplay/session/entity/SessionPlayer.java` |
| Crear | `backend/src/main/java/com/matchplay/auth/entity/RefreshToken.java` |
| Crear | `backend/src/test/java/com/matchplay/exception/GlobalExceptionHandlerTest.java` |

---

## Task 1: Actualizar pom.xml con todas las dependencias

**Files:**
- Modify: `backend/pom.xml`

- [ ] **Reemplazar el contenido completo de `backend/pom.xml`:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.1</version>
        <relativePath/>
    </parent>

    <groupId>com.matchplay</groupId>
    <artifactId>matchplay-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>matchplay-backend</name>
    <description>Matchplay backend API</description>

    <properties>
        <java.version>21</java.version>
        <mapstruct.version>1.6.3</mapstruct.version>
        <lombok.version>1.18.36</lombok.version>
        <jjwt.version>0.12.6</jjwt.version>
    </properties>

    <dependencies>
        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Seguridad -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- JWT -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Persistencia -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Validación -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>${lombok.version}</version>
            <optional>true</optional>
        </dependency>

        <!-- MapStruct -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
            <version>${mapstruct.version}</version>
        </dependency>

        <!-- Swagger / OpenAPI -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.7.0</version>
        </dependency>

        <!-- Dev -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>${lombok.version}</version>
                        </path>
                        <path>
                            <groupId>org.mapstruct</groupId>
                            <artifactId>mapstruct-processor</artifactId>
                            <version>${mapstruct.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Verificar que Maven resuelve las dependencias:**

```bash
cd backend && mvn dependency:resolve -q
```

Esperado: BUILD SUCCESS sin errores de dependencia.

- [ ] **Commit:**

```bash
git add backend/pom.xml
git commit -m "build: add JPA, MySQL, Security, JWT, Lombok, MapStruct, springdoc dependencies"
```

---

## Task 2: Configurar propiedades y variables de entorno

**Files:**
- Modify: `backend/src/main/resources/application.properties`
- Create: `backend/src/main/resources/application-dev.properties`
- Create: `backend/.env.example`

- [ ] **Reemplazar `application.properties`:**

```properties
spring.application.name=matchplay-backend
server.port=8080

# Perfil activo por defecto
spring.profiles.active=${SPRING_PROFILE:dev}

# Jackson
spring.jackson.default-property-inclusion=non_null
spring.jackson.serialization.write-dates-as-timestamps=false

# Mensajes i18n
spring.messages.basename=messages
spring.messages.encoding=UTF-8
spring.messages.fallback-to-system-locale=false

# Seguridad — deshabilitar form login por defecto (usamos JWT)
spring.security.user.name=disabled

# Error
server.error.include-stacktrace=never
server.error.include-message=never

# JWT
app.jwt.secret=${JWT_SECRET}
app.jwt.expiration-ms=${JWT_EXPIRATION_MS:86400000}
app.jwt.refresh-expiration-ms=${JWT_REFRESH_EXPIRATION_MS:604800000}

# CORS
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

- [ ] **Crear `application-dev.properties`:**

```properties
# Base de datos
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASS}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# Logging
logging.level.root=WARN
logging.level.com.matchplay=DEBUG
logging.level.org.hibernate.SQL=DEBUG
```

- [ ] **Crear `backend/.env.example`:**

```dotenv
# Copia este fichero a .env y rellena tus valores
# El fichero .env NO se commitea (está en .gitignore)

# Base de datos MySQL
DB_URL=jdbc:mysql://localhost:3306/matchplay?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
DB_USER=root
DB_PASS=tu_password_aqui

# JWT — genera una clave aleatoria de mínimo 64 caracteres
JWT_SECRET=cambia_esto_por_una_clave_secreta_de_minimo_64_caracteres_segura_aqui
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_EXPIRATION_MS=604800000

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Spring
SPRING_PROFILE=dev
```

- [ ] **Verificar que `.env` y `*.properties` con credenciales están en `.gitignore`:**

Abrir `backend/.gitignore` (o `.gitignore` raíz) y asegurarse de que contienen:

```
.env
application-local.properties
```

Si no existe el `.gitignore` de backend, crearlo con ese contenido.

- [ ] **Commit:**

```bash
git add backend/src/main/resources/application.properties
git add backend/src/main/resources/application-dev.properties
git add backend/.env.example
git commit -m "config: add application properties and env template"
```

---

## Task 3: Crear ficheros de mensajes i18n

**Files:**
- Create: `backend/src/main/resources/messages_es.properties`
- Create: `backend/src/main/resources/messages_en.properties`

- [ ] **Crear `messages_es.properties`:**

```properties
# Genéricos
error.not.found=El recurso con id {0} no existe
error.unauthorized=No tienes permiso para realizar esta acción
error.validation=Error de validación en los datos enviados
error.internal=Ha ocurrido un error interno. Inténtalo de nuevo más tarde

# Auth
error.auth.invalid.credentials=Email o contraseña incorrectos
error.auth.token.expired=La sesión ha expirado, vuelve a iniciar sesión
error.auth.token.invalid=Token de autenticación inválido

# Sesiones (partidas)
error.session.not.found=La partida con id {0} no existe
error.session.full=La partida está completa, no hay plazas disponibles
error.session.already.joined=Ya estás apuntado a esta partida
error.session.join.own=No puedes apuntarte a tu propia partida
error.session.not.owner=Solo el creador puede modificar esta partida

# Usuarios
error.user.not.found=El usuario con id {0} no existe
error.user.email.duplicate=Ya existe una cuenta con ese email
```

- [ ] **Crear `messages_en.properties`:**

```properties
# Generic
error.not.found=Resource with id {0} not found
error.unauthorized=You are not allowed to perform this action
error.validation=Validation error in submitted data
error.internal=An internal error occurred. Please try again later

# Auth
error.auth.invalid.credentials=Invalid email or password
error.auth.token.expired=Session expired, please log in again
error.auth.token.invalid=Invalid authentication token

# Sessions
error.session.not.found=Session with id {0} not found
error.session.full=Session is full, no available spots
error.session.already.joined=You have already joined this session
error.session.join.own=You cannot join your own session
error.session.not.owner=Only the creator can modify this session

# Users
error.user.not.found=User with id {0} not found
error.user.email.duplicate=An account with that email already exists
```

- [ ] **Commit:**

```bash
git add backend/src/main/resources/messages_es.properties
git add backend/src/main/resources/messages_en.properties
git commit -m "feat: add i18n message files (ES/EN)"
```

---

## Task 4: Crear LocaleConfig

**Files:**
- Create: `backend/src/main/java/com/matchplay/config/LocaleConfig.java`

- [ ] **Crear `LocaleConfig.java`:**

```java
package com.matchplay.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import java.util.List;
import java.util.Locale;

@Configuration
public class LocaleConfig {

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
        source.setDefaultLocale(new Locale("es"));
        return source;
    }
}
```

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/config/LocaleConfig.java
git commit -m "feat: add LocaleConfig with MessageSource and AcceptHeaderLocaleResolver"
```

---

## Task 5: Crear jerarquía de excepciones

**Files:**
- Create: `backend/src/main/java/com/matchplay/exception/MatchplayException.java`
- Create: `backend/src/main/java/com/matchplay/exception/ResourceNotFoundException.java`
- Create: `backend/src/main/java/com/matchplay/exception/SessionNotFoundException.java`
- Create: `backend/src/main/java/com/matchplay/exception/UserNotFoundException.java`
- Create: `backend/src/main/java/com/matchplay/exception/SessionFullException.java`
- Create: `backend/src/main/java/com/matchplay/exception/SessionAlreadyJoinedException.java`
- Create: `backend/src/main/java/com/matchplay/exception/UnauthorizedActionException.java`

- [ ] **Crear `MatchplayException.java` (base):**

```java
package com.matchplay.exception;

public class MatchplayException extends RuntimeException {

    private final String messageKey;
    private final Object[] args;

    public MatchplayException(String messageKey, Object... args) {
        super(messageKey);
        this.messageKey = messageKey;
        this.args = args;
    }

    public String getMessageKey() { return messageKey; }
    public Object[] getArgs() { return args; }
}
```

- [ ] **Crear `ResourceNotFoundException.java`:**

```java
package com.matchplay.exception;

public class ResourceNotFoundException extends MatchplayException {

    private final Long resourceId;

    public ResourceNotFoundException(String messageKey, Long resourceId) {
        super(messageKey, resourceId);
        this.resourceId = resourceId;
    }

    public Long getResourceId() { return resourceId; }
}
```

- [ ] **Crear `SessionNotFoundException.java`:**

```java
package com.matchplay.exception;

public class SessionNotFoundException extends ResourceNotFoundException {

    public SessionNotFoundException(Long sessionId) {
        super("error.session.not.found", sessionId);
    }
}
```

- [ ] **Crear `UserNotFoundException.java`:**

```java
package com.matchplay.exception;

public class UserNotFoundException extends ResourceNotFoundException {

    public UserNotFoundException(Long userId) {
        super("error.user.not.found", userId);
    }
}
```

- [ ] **Crear `SessionFullException.java`:**

```java
package com.matchplay.exception;

public class SessionFullException extends MatchplayException {

    public SessionFullException() {
        super("error.session.full");
    }
}
```

- [ ] **Crear `SessionAlreadyJoinedException.java`:**

```java
package com.matchplay.exception;

public class SessionAlreadyJoinedException extends MatchplayException {

    public SessionAlreadyJoinedException() {
        super("error.session.already.joined");
    }
}
```

- [ ] **Crear `UnauthorizedActionException.java`:**

```java
package com.matchplay.exception;

public class UnauthorizedActionException extends MatchplayException {

    public UnauthorizedActionException(String messageKey) {
        super(messageKey);
    }
}
```

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/exception/
git commit -m "feat: add exception hierarchy (MatchplayException and domain-specific exceptions)"
```

---

## Task 6: Crear ErrorResponse y FieldValidationError

**Files:**
- Create: `backend/src/main/java/com/matchplay/exception/FieldValidationError.java`
- Create: `backend/src/main/java/com/matchplay/exception/ErrorResponse.java`

- [ ] **Crear `FieldValidationError.java`:**

```java
package com.matchplay.exception;

public record FieldValidationError(String field, String message) {}
```

- [ ] **Crear `ErrorResponse.java`:**

```java
package com.matchplay.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        int status,
        String error,
        String code,
        String message,
        LocalDateTime timestamp,
        String path,
        List<FieldValidationError> fieldErrors
) {
    public static ErrorResponse of(int status, String error, String code, String message, String path) {
        return new ErrorResponse(status, error, code, message, LocalDateTime.now(), path, null);
    }

    public static ErrorResponse ofValidation(String code, String message, String path, List<FieldValidationError> fieldErrors) {
        return new ErrorResponse(400, "Bad Request", code, message, LocalDateTime.now(), path, fieldErrors);
    }
}
```

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/exception/FieldValidationError.java
git add backend/src/main/java/com/matchplay/exception/ErrorResponse.java
git commit -m "feat: add ErrorResponse and FieldValidationError records"
```

---

## Task 7: Escribir tests del GlobalExceptionHandler

**Files:**
- Create: `backend/src/test/java/com/matchplay/exception/GlobalExceptionHandlerTest.java`

- [ ] **Crear `GlobalExceptionHandlerTest.java`:**

```java
package com.matchplay.exception;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;

import com.matchplay.config.LocaleConfig;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)
@Import({GlobalExceptionHandler.class, LocaleConfig.class})
class GlobalExceptionHandlerTest {

    @Autowired
    MockMvc mockMvc;

    // Controlador mínimo solo para disparar excepciones en el test
    @RestController
    @RequestMapping("/test")
    static class TestController {

        @GetMapping("/session-not-found")
        public void sessionNotFound() {
            throw new SessionNotFoundException(42L);
        }

        @GetMapping("/unauthorized")
        public void unauthorized() {
            throw new UnauthorizedActionException("error.unauthorized");
        }

        @GetMapping("/session-full")
        public void sessionFull() {
            throw new SessionFullException();
        }
    }

    @Test
    @WithMockUser
    void whenSessionNotFound_returns404WithSpanishMessage() throws Exception {
        mockMvc.perform(get("/test/session-not-found")
                        .header("Accept-Language", "es"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("error.session.not.found"))
                .andExpect(jsonPath("$.message").value("La partida con id 42 no existe"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.path").value("/test/session-not-found"));
    }

    @Test
    @WithMockUser
    void whenSessionNotFound_returns404WithEnglishMessage() throws Exception {
        mockMvc.perform(get("/test/session-not-found")
                        .header("Accept-Language", "en"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Session with id 42 not found"));
    }

    @Test
    @WithMockUser
    void whenUnauthorized_returns403() throws Exception {
        mockMvc.perform(get("/test/unauthorized")
                        .header("Accept-Language", "es"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("error.unauthorized"));
    }

    @Test
    @WithMockUser
    void whenSessionFull_returns409() throws Exception {
        mockMvc.perform(get("/test/session-full")
                        .header("Accept-Language", "es"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("error.session.full"))
                .andExpect(jsonPath("$.message").value("La partida está completa, no hay plazas disponibles"));
    }
}
```

- [ ] **Ejecutar los tests para verificar que fallan (GlobalExceptionHandler no existe aún):**

```bash
cd backend && mvn test -pl . -Dtest=GlobalExceptionHandlerTest -q 2>&1 | tail -20
```

Esperado: FAIL — `GlobalExceptionHandler` no encontrado.

---

## Task 8: Implementar GlobalExceptionHandler

**Files:**
- Create: `backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java`

- [ ] **Crear `GlobalExceptionHandler.java`:**

```java
package com.matchplay.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Locale;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSessionNotFound(
            SessionNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Session not found: id={}", ex.getResourceId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "Not Found", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
            UserNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("User not found: id={}", ex.getResourceId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "Not Found", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionFullException.class)
    public ResponseEntity<ErrorResponse> handleSessionFull(
            SessionFullException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Join attempt to full session");
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionAlreadyJoinedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyJoined(
            SessionAlreadyJoinedException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(UnauthorizedActionException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedAction(
            UnauthorizedActionException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Unauthorized action attempt: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "Forbidden", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request, Locale locale) {
        List<FieldValidationError> fieldErrors = extractFieldErrors(ex.getBindingResult(), locale);
        String message = resolve("error.validation", null, locale);
        log.warn("Validation failed on {}: {} errors", request.getRequestURI(), fieldErrors.size());
        return ResponseEntity.badRequest()
                .body(ErrorResponse.ofValidation("error.validation", message, request.getRequestURI(), fieldErrors));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.unauthorized", null, locale);
        log.warn("Access denied: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "Forbidden", "error.unauthorized", message, request.getRequestURI()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(
            AuthenticationException ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.auth.token.invalid", null, locale);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "Unauthorized", "error.auth.token.invalid", message, request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.internal", null, locale);
        log.error("Unexpected error: path={}", request.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(500, "Internal Server Error", "error.internal", message, request.getRequestURI()));
    }

    // --- privados ---

    private String resolve(String key, Object[] args, Locale locale) {
        return messageSource.getMessage(key, args, locale);
    }

    private List<FieldValidationError> extractFieldErrors(BindingResult result, Locale locale) {
        return result.getFieldErrors().stream()
                .map(fe -> new FieldValidationError(fe.getField(), fe.getDefaultMessage()))
                .toList();
    }
}
```

- [ ] **Ejecutar los tests:**

```bash
cd backend && mvn test -Dtest=GlobalExceptionHandlerTest -q
```

Esperado: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/exception/GlobalExceptionHandler.java
git commit -m "feat: implement GlobalExceptionHandler with i18n error resolution"
```

---

## Task 9: Crear entidad User

**Files:**
- Create: `backend/src/main/java/com/matchplay/user/entity/Role.java`
- Create: `backend/src/main/java/com/matchplay/user/entity/User.java`

- [ ] **Crear `Role.java`:**

```java
package com.matchplay.user.entity;

public enum Role {
    USER,
    ADMIN,
    SHOP  // futuro
}
```

- [ ] **Crear `User.java`:**

```java
package com.matchplay.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "users",
        uniqueConstraints = @UniqueConstraint(name = "uk_users_email", columnNames = "email"))
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role = Role.USER;

    @Column(nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User u)) return false;
        return id != null && id.equals(u.id);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
```

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/user/
git commit -m "feat: add User entity and Role enum"
```

---

## Task 10: Crear entidades de sesión (GameSession + SessionPlayer)

**Files:**
- Create: `backend/src/main/java/com/matchplay/session/entity/SessionStatus.java`
- Create: `backend/src/main/java/com/matchplay/session/entity/GameSession.java`
- Create: `backend/src/main/java/com/matchplay/session/entity/SessionPlayer.java`

- [ ] **Crear `SessionStatus.java`:**

```java
package com.matchplay.session.entity;

public enum SessionStatus {
    OPEN,       // aceptando jugadores
    FULL,       // completa, sin plazas
    CANCELLED,  // cancelada por el creador
    FINISHED    // partida jugada
}
```

- [ ] **Crear `GameSession.java`:**

```java
package com.matchplay.session.entity;

import com.matchplay.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

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

    @Column(length = 500)
    private String description;

    @Column(nullable = false, length = 200)
    private String location;

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    @Column(nullable = false)
    private int maxPlayers;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private SessionStatus status = SessionStatus.OPEN;

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

    // --- métodos de dominio ---

    public boolean isFull() {
        return players.size() >= maxPlayers;
    }

    public boolean isCreatedBy(Long userId) {
        return creator != null && creator.getId().equals(userId);
    }

    public boolean hasJoined(Long userId) {
        return players.stream().anyMatch(p -> p.getUser().getId().equals(userId));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GameSession s)) return false;
        return id != null && id.equals(s.id);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
```

- [ ] **Crear `SessionPlayer.java`:**

```java
package com.matchplay.session.entity;

import com.matchplay.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "session_players",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_session_players",
                columnNames = {"session_id", "user_id"}))
@Getter
@Setter
@NoArgsConstructor
public class SessionPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private GameSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime joinedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SessionPlayer sp)) return false;
        return id != null && id.equals(sp.id);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
```

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/session/
git commit -m "feat: add GameSession, SessionPlayer entities and SessionStatus enum"
```

---

## Task 11: Crear entidad RefreshToken

**Files:**
- Create: `backend/src/main/java/com/matchplay/auth/entity/RefreshToken.java`

- [ ] **Crear `RefreshToken.java`:**

```java
package com.matchplay.auth.entity;

import com.matchplay.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 512)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean revoked = false;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !revoked && !isExpired();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RefreshToken rt)) return false;
        return id != null && id.equals(rt.id);
    }

    @Override
    public int hashCode() { return getClass().hashCode(); }
}
```

- [ ] **Commit:**

```bash
git add backend/src/main/java/com/matchplay/auth/
git commit -m "feat: add RefreshToken entity"
```

---

## Task 12: Verificar arranque y conexión a BD

- [ ] **Copiar `.env.example` a `.env` y rellenar las credenciales reales:**

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con usuario, contraseña y URL de MySQL real
```

- [ ] **Añadir `.env` al `.gitignore` si no está ya:**

```bash
grep -q "^.env$" .gitignore || echo ".env" >> .gitignore
```

- [ ] **Arrancar el backend con las variables de entorno cargadas:**

```bash
cd backend
export $(cat .env | grep -v '^#' | xargs)
mvn spring-boot:run
```

En Windows PowerShell:
```powershell
Get-Content backend\.env | Where-Object { $_ -notmatch '^#' -and $_ -ne '' } | ForEach-Object {
    $k, $v = $_ -split '=', 2; [System.Environment]::SetEnvironmentVariable($k, $v)
}
cd backend; mvn spring-boot:run
```

Esperado en logs: `Hibernate: create table users (...)`, `Hibernate: create table game_sessions (...)`, `Started MatchplayApplication`.

- [ ] **Verificar que las tablas se crearon en MySQL:**

```sql
USE matchplay;
SHOW TABLES;
-- Esperado: game_sessions, refresh_tokens, session_players, users
DESCRIBE users;
DESCRIBE game_sessions;
```

- [ ] **Ejecutar todos los tests:**

```bash
cd backend && mvn test -q
```

Esperado: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Commit final:**

```bash
git add .gitignore
git commit -m "chore: add .env to gitignore"
```

---

## Verificación final

- [ ] `mvn test` pasa sin errores.
- [ ] El backend arranca y conecta a MySQL sin errores.
- [ ] Las 4 tablas existen en la BD: `users`, `game_sessions`, `session_players`, `refresh_tokens`.
- [ ] `GET /test/session-not-found` con `Accept-Language: es` devuelve 404 con mensaje en español.
- [ ] `GET /test/session-not-found` con `Accept-Language: en` devuelve 404 con mensaje en inglés.
- [ ] No hay stack traces expuestos en ninguna respuesta de error.
