# Perfil de usuario — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el menú de usuario (dropdown desktop / drawer mobile) anclado al avatar en el header, la página `/profile` con avatar picker + bio + juegos favoritos + cambio de contraseña, y reemplazar el círculo letra+color actual por el componente `<Avatar>` unificado con PNGs preset en todos los sitios (sidebar apuntados, detail creador, chat).

**Architecture:** Aprovechar el scaffolding BE ya existente (`User.bio`, `User.selectedAvatar`, `UserFavoriteGame`, `CurrentUserResponse.selectedAvatarCode`, `AuthServiceImpl.register` ya asigna avatar). Añadir endpoints `PATCH /me`, `POST /me/password`, enriquecer DTOs de sessions/chat. En FE construir `<Avatar>` compartido, `<UserMenu>` popover, `ProfilePage` single-scroll (Layout C aprobado), `useTheme` con localStorage.

**Tech Stack:** Spring Boot 3 (Java 21), JPA, Flyway, JUnit 5 + Mockito. React 18 + Vite + TS + Tailwind + TanStack Query + React Router + i18next + Vitest + MSW.

**Spec de referencia:** [docs/superpowers/specs/2026-05-28-user-profile-design.md](../specs/2026-05-28-user-profile-design.md)

---

## Convenciones del repo (ver `CLAUDE.md`)

- Records Java posicionales — al añadir campo a `SessionSummaryResponse`, `SessionParticipantResponse`, `ChatMessageResponse`, etc., grep `new <Record>(` en tests y actualizar TODAS las invocaciones.
- Jackson `non_null` global. `avatarCode` nullable → se omite del JSON → FE recibe `undefined` → tipar como `avatarCode?: string` (NO `string | null`).
- Pre-commit hook husky+lint-staged auto-corre prettier+eslint sobre FE staged.
- Plataforma: Windows + PowerShell o Bash. Backend usa `mvnw.cmd` desde Bash en Windows.
- `--project-dir`-style tests existen en H2 con `ddl-auto=create-drop` — Hibernate crea schema desde entidades; los tests que toquen `avatars` deben seed-ear con `avatarRepository.save(...)` en `@BeforeEach` (ver `AuthFlowTest`).

---

## File Structure

### Backend — Creados
- `backend/src/main/resources/db/migration/V12__avatars_seed.sql`
- `backend/src/main/java/com/matchplay/user/dto/UpdateProfileRequest.java`
- `backend/src/main/java/com/matchplay/user/dto/ChangePasswordRequest.java`
- `backend/src/main/java/com/matchplay/user/dto/UserProfileResponse.java`
- `backend/src/main/java/com/matchplay/user/dto/FavoriteGameSummary.java`
- `backend/src/main/java/com/matchplay/user/controller/MeController.java`
- `backend/src/main/java/com/matchplay/user/service/ProfileService.java`
- `backend/src/main/java/com/matchplay/user/service/ProfileServiceImpl.java`
- `backend/src/main/java/com/matchplay/user/repository/UserFavoriteGameRepository.java`
- `backend/src/main/java/com/matchplay/user/exception/WrongPasswordException.java`
- `backend/src/main/java/com/matchplay/user/exception/InvalidAvatarCodeException.java`
- `backend/src/main/java/com/matchplay/user/exception/TooManyFavoritesException.java`
- Tests: `ProfileServiceImplTest`, `MeControllerTest`

### Backend — Modificados
- `backend/src/main/java/com/matchplay/auth/service/AuthServiceImpl.java` — randomizar avatar en `register()`
- `backend/src/main/java/com/matchplay/session/dto/SessionSummaryResponse.java` — añadir `creatorAvatarCode`
- `backend/src/main/java/com/matchplay/session/dto/SessionDetailResponse.java` (vía `SessionParticipantResponse`) — añadir `avatarCode`
- `backend/src/main/java/com/matchplay/session/dto/ChatMessageResponse.java` — añadir `authorAvatarCode`
- `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` — incluir avatarCode en toSummary / toDetail
- Mappers de chat — incluir authorAvatarCode
- Tests que construyen los records posicionales — actualizar fixtures (T1 + T6 grep)

### Frontend — Creados
- `frontend/src/shared/components/Avatar.tsx`
- `frontend/src/shared/components/__tests__/Avatar.test.tsx`
- `frontend/src/shared/hooks/useTheme.ts`
- `frontend/src/shared/hooks/__tests__/useTheme.test.ts`
- `frontend/src/app/layouts/UserMenu.tsx`
- `frontend/src/app/layouts/__tests__/UserMenu.test.tsx`
- `frontend/src/features/profile/api/profileApi.ts`
- `frontend/src/features/profile/hooks/useProfile.ts`
- `frontend/src/features/profile/types/profile.types.ts`
- `frontend/src/features/profile/components/AvatarPicker.tsx`
- `frontend/src/features/profile/components/FavoriteGamesPicker.tsx`
- `frontend/src/features/profile/components/BioForm.tsx`
- `frontend/src/features/profile/components/AccountSection.tsx`
- `frontend/src/features/profile/components/ChangePasswordForm.tsx`
- `frontend/src/features/profile/pages/ProfilePage.tsx`
- `frontend/src/features/profile/__tests__/ProfilePage.test.tsx`
- `frontend/src/features/help/pages/HelpPage.tsx`

### Frontend — Modificados
- `frontend/src/features/auth/types/auth.types.ts` — `CurrentUser` añade `avatarCode?` y `bio?`
- `frontend/src/features/sessions/types/session.types.ts` — `SessionSummary.creatorAvatarCode?`, `SessionPlayer.avatarCode?`, `ChatMessage.authorAvatarCode?`
- `frontend/src/features/sessions/components/SessionPlayerRow.tsx` — usar `<Avatar>`
- `frontend/src/features/sessions/pages/SessionDetailPage.tsx` — `<Avatar>` antes de "Organiza @user"
- `frontend/src/features/sessions/components/ChatMessageRow.tsx` — `<Avatar>` por mensaje
- `frontend/src/app/layouts/SiteHeader.tsx` — reemplazar bloque usuario por `<UserMenu>`; avatar reemplaza burger en mobile autenticado
- `frontend/src/app/layouts/MobileMenu.tsx` — añadir items: Mi perfil (activo), Mis mensajes (próx), Ayuda, Modo oscuro toggle
- `frontend/src/app/router.tsx` — rutas `/profile` (protegida) y `/help` (pública)
- `frontend/src/shared/i18n/locales/es.json` y `en.json` — bloque `profile.*`, `help.*`, `nav.{messages,help,darkMode}`, `common.{savedToast, errorGeneric}`
- `frontend/src/main.tsx` o equivalente — inicialización de tema antes del render
- Tests fixtures que construyen `SessionSummary`/`SessionDetail`/`SessionPlayer`/`ChatMessage` — añadir el campo nuevo (puede ser `undefined`)

---

## Task 1: BE — Migration V12 seed de 31 avatares + verificar schema

**Files:**
- Create: `backend/src/main/resources/db/migration/V12__avatars_seed.sql`

**Contexto:** El proyecto tiene la tabla `avatars` (entity `Avatar`) y `users.selected_avatar_code` (FK, nullable=false). El baseline V1 (no en git) creó las tablas. El campo `defaultAvatarCode` en `AuthServiceImpl` apunta a `avatar_01`. Necesitamos garantizar que las 31 filas existen.

- [ ] **Step 1: Crear V12 con INSERT IGNORE de los 31 avatares**

Crea `backend/src/main/resources/db/migration/V12__avatars_seed.sql`:

```sql
-- V12: seed 31 avatares preset (corresponden a frontend/src/assets/avatars/avatar_NN.png).
-- INSERT IGNORE para no romper si alguno ya está (ej: avatar_01 manualmente seedado).
INSERT IGNORE INTO avatars (code, name, required_points, display_order, active) VALUES
  ('avatar_01', 'Avatar 1',  0,  1, true),
  ('avatar_02', 'Avatar 2',  0,  2, true),
  ('avatar_03', 'Avatar 3',  0,  3, true),
  ('avatar_04', 'Avatar 4',  0,  4, true),
  ('avatar_05', 'Avatar 5',  0,  5, true),
  ('avatar_06', 'Avatar 6',  0,  6, true),
  ('avatar_07', 'Avatar 7',  0,  7, true),
  ('avatar_08', 'Avatar 8',  0,  8, true),
  ('avatar_09', 'Avatar 9',  0,  9, true),
  ('avatar_10', 'Avatar 10', 0, 10, true),
  ('avatar_11', 'Avatar 11', 0, 11, true),
  ('avatar_12', 'Avatar 12', 0, 12, true),
  ('avatar_13', 'Avatar 13', 0, 13, true),
  ('avatar_14', 'Avatar 14', 0, 14, true),
  ('avatar_15', 'Avatar 15', 0, 15, true),
  ('avatar_16', 'Avatar 16', 0, 16, true),
  ('avatar_17', 'Avatar 17', 0, 17, true),
  ('avatar_18', 'Avatar 18', 0, 18, true),
  ('avatar_19', 'Avatar 19', 0, 19, true),
  ('avatar_20', 'Avatar 20', 0, 20, true),
  ('avatar_21', 'Avatar 21', 0, 21, true),
  ('avatar_22', 'Avatar 22', 0, 22, true),
  ('avatar_23', 'Avatar 23', 0, 23, true),
  ('avatar_24', 'Avatar 24', 0, 24, true),
  ('avatar_25', 'Avatar 25', 0, 25, true),
  ('avatar_26', 'Avatar 26', 0, 26, true),
  ('avatar_27', 'Avatar 27', 0, 27, true),
  ('avatar_28', 'Avatar 28', 0, 28, true),
  ('avatar_29', 'Avatar 29', 0, 29, true),
  ('avatar_30', 'Avatar 30', 0, 30, true),
  ('avatar_31', 'Avatar 31', 0, 31, true);
```

Nota: `required_points=0` (todos disponibles para todos los usuarios desde el día 1; el sistema de rewards aún no se usa). `name` queda con label genérico — se puede iterar después si se quiere copy más rico.

- [ ] **Step 2: Compilar y verificar que arranca**

Run: `cd backend && ./mvnw.cmd compile`
Expected: BUILD SUCCESS, no errores.

- [ ] **Step 3: Verificar suite completa (no debe romperse — los tests usan H2 + ddl-auto create-drop y NO ejecutan Flyway)**

Run: `cd backend && ./mvnw.cmd test`
Expected: BUILD SUCCESS, 190 tests (baseline actual).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V12__avatars_seed.sql
git commit -m "feat(profile): V12 seed de 31 avatares preset"
```

---

## Task 2: BE — Randomizar avatar en signup

**Files:**
- Modify: `backend/src/main/java/com/matchplay/auth/service/AuthServiceImpl.java`
- Modify: `backend/src/test/java/com/matchplay/auth/AuthFlowTest.java` (fixtures: seedear más avatares para que el random tenga opciones; aceptar cualquiera de los 31 en assertion)

- [ ] **Step 1: Leer la implementación actual**

Lee `AuthServiceImpl.register` (líneas 53-95). Hoy hace:
- `Avatar defaultAvatar = avatarRepository.findById(defaultAvatarCode).orElseThrow(...)` con `defaultAvatarCode="avatar_01"`.
- `user.setSelectedAvatar(defaultAvatar)`.

Vamos a reemplazar esto por una asignación aleatoria de entre los avatares `active=true` que cumplan `requiredPoints <= 0` (todos seedados con 0, todos elegibles).

- [ ] **Step 2: Añadir método en AvatarRepository para listar avatares iniciales**

Edita `backend/src/main/java/com/matchplay/avatar/repository/AvatarRepository.java`:

```java
package com.matchplay.avatar.repository;

import com.matchplay.avatar.entity.Avatar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvatarRepository extends JpaRepository<Avatar, String> {

    /** Avatares disponibles para asignación inicial: activos y sin coste de puntos. */
    List<Avatar> findByActiveTrueAndRequiredPointsLessThanEqual(int requiredPoints);
}
```

- [ ] **Step 3: Reemplazar la asignación en `AuthServiceImpl.register`**

Edita `AuthServiceImpl.java`. Imports nuevos:

```java
import java.security.SecureRandom;
import java.util.List;
```

Reemplaza el bloque del avatar (líneas ~69-71) por:

```java
List<Avatar> eligibleAvatars = avatarRepository.findByActiveTrueAndRequiredPointsLessThanEqual(0);
if (eligibleAvatars.isEmpty()) {
    throw new IllegalStateException("No avatars available for signup. Seed the avatars table (V12).");
}
Avatar randomAvatar = eligibleAvatars.get(new SecureRandom().nextInt(eligibleAvatars.size()));
```

Y cambia `user.setSelectedAvatar(defaultAvatar)` por `user.setSelectedAvatar(randomAvatar)`.

Elimina el campo `defaultAvatarCode` (`@Value(...)`) — ya no se usa.

- [ ] **Step 4: Adaptar AuthFlowTest**

Lee `backend/src/test/java/com/matchplay/auth/AuthFlowTest.java` (~líneas 46-115). El test:
- Seedea SOLO `avatar_01` en `@BeforeEach`.
- Verifica `jsonPath("$.selectedAvatarCode").value("avatar_01")`.

Como ahora la asignación es aleatoria pero solo hay 1 avatar seedado (`avatar_01`), el random siempre lo elegirá. El test sigue pasando sin cambios.

(Si quieres añadir cobertura: añadir un test "seedea 5 avatares y verifica que el selectedAvatarCode es uno de los 5".)

- [ ] **Step 5: Ejecutar tests**

Run: `cd backend && ./mvnw.cmd test`
Expected: BUILD SUCCESS, 190 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/matchplay/auth/service/AuthServiceImpl.java \
        backend/src/main/java/com/matchplay/avatar/repository/AvatarRepository.java
git commit -m "feat(profile): asignar avatar aleatorio en signup"
```

---

## Task 3: BE — DTOs perfil + UserFavoriteGameRepository + GET /me enriquecido

**Files:**
- Create: `backend/src/main/java/com/matchplay/user/dto/FavoriteGameSummary.java`
- Create: `backend/src/main/java/com/matchplay/user/dto/UserProfileResponse.java`
- Create: `backend/src/main/java/com/matchplay/user/repository/UserFavoriteGameRepository.java`
- Modify: `backend/src/main/java/com/matchplay/auth/dto/CurrentUserResponse.java` — añadir `bio` (último campo)
- Modify: `backend/src/main/java/com/matchplay/auth/service/AuthServiceImpl.java` — `getCurrentUser()` incluye bio
- Modify: cualquier test que construya `CurrentUserResponse` posicionalmente

- [ ] **Step 1: Crear `FavoriteGameSummary`**

`backend/src/main/java/com/matchplay/user/dto/FavoriteGameSummary.java`:

```java
package com.matchplay.user.dto;

public record FavoriteGameSummary(
        Long bggId,
        String name,
        String thumbnailUrl
) {}
```

- [ ] **Step 2: Crear `UserProfileResponse`**

`backend/src/main/java/com/matchplay/user/dto/UserProfileResponse.java`:

```java
package com.matchplay.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Response del endpoint GET /api/v1/me con info completa de perfil (avatar,
 * bio, juegos favoritos). favoriteGames siempre presente (lista vacía si no
 * hay) — el frontend renderiza el grid de slots vacíos.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record UserProfileResponse(
        String username,
        String email,
        String avatarCode,
        String bio,
        List<FavoriteGameSummary> favoriteGames
) {}
```

`@JsonInclude(ALWAYS)` para que `bio` null no se omita — el FE necesita distinguir "campo presente vacío" de "no devuelto" (defensa en profundidad; en este record bio es solo string, pero el campo `favoriteGames` debe llegar siempre como `[]`, no omitirse).

- [ ] **Step 3: Crear `UserFavoriteGameRepository`**

`backend/src/main/java/com/matchplay/user/repository/UserFavoriteGameRepository.java`:

```java
package com.matchplay.user.repository;

import com.matchplay.user.entity.UserFavoriteGame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserFavoriteGameRepository extends JpaRepository<UserFavoriteGame, Long> {

    /** Favoritos del usuario ordenados por fecha de añadido (asc). */
    List<UserFavoriteGame> findByUserIdOrderByCreatedAtAsc(Long userId);

    /** Borra todos los favoritos del usuario — paso previo al replace en PATCH /me. */
    void deleteByUserId(Long userId);

    long countByUserId(Long userId);
}
```

- [ ] **Step 4: Añadir `bio` a `CurrentUserResponse`**

Edita el record:

```java
public record CurrentUserResponse(
        Long userId,
        String email,
        String username,
        Role role,
        String provinceCode,
        String cityCode,
        String areaCode,
        BigDecimal ratingAvg,
        int rewardPoints,
        String selectedAvatarCode,
        String bio
) {}
```

- [ ] **Step 5: Pasar bio en `AuthServiceImpl.getCurrentUser()`**

Añade `user.getBio()` como último argumento del `new CurrentUserResponse(...)`.

- [ ] **Step 6: Grep + actualizar fixtures posicionales**

```bash
grep -rln "new CurrentUserResponse(" backend/src/test/
```

Para cada match, añadir `null` (o `""`) al final. Casi seguro hay 1 o 2 en `AuthFlowTest` y similares.

- [ ] **Step 7: Compilar y tests**

Run: `cd backend && ./mvnw.cmd test`
Expected: 190 tests passing.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/matchplay/user/dto/ \
        backend/src/main/java/com/matchplay/user/repository/UserFavoriteGameRepository.java \
        backend/src/main/java/com/matchplay/auth/dto/CurrentUserResponse.java \
        backend/src/main/java/com/matchplay/auth/service/AuthServiceImpl.java \
        backend/src/test/java/com/matchplay/auth/
git commit -m "feat(profile): DTOs perfil + bio en CurrentUserResponse"
```

---

## Task 4: BE — `ProfileService` + endpoint GET /api/v1/me/profile

**Files:**
- Create: `backend/src/main/java/com/matchplay/user/service/ProfileService.java`
- Create: `backend/src/main/java/com/matchplay/user/service/ProfileServiceImpl.java`
- Create: `backend/src/main/java/com/matchplay/user/controller/MeController.java`
- Create: `backend/src/test/java/com/matchplay/user/service/ProfileServiceImplTest.java`
- Create: `backend/src/test/java/com/matchplay/user/controller/MeControllerTest.java`

Notas: usamos `/api/v1/me/profile` para no chocar con `/api/v1/me` (que ya devuelve `CurrentUserResponse` desde `AuthController`). El frontend usará `/me/profile` para la página de perfil; `/me` sigue siendo el "current user" liviano que consume `useAuth`.

- [ ] **Step 1: Interface `ProfileService`**

```java
package com.matchplay.user.service;

import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;

public interface ProfileService {
    UserProfileResponse getCurrent();
    UserProfileResponse update(UpdateProfileRequest request);
    void changePassword(String currentPassword, String newPassword);
}
```

(Los 2 últimos en T5 — definimos la interface entera ya y dejamos el impl incompleto.)

- [ ] **Step 2: Crear `UpdateProfileRequest` (record con jakarta validation)**

`backend/src/main/java/com/matchplay/user/dto/UpdateProfileRequest.java`:

```java
package com.matchplay.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Body de PATCH /api/v1/me/profile. Todos los campos opcionales; sólo se
 * aplican los enviados (null = no tocar). Las validaciones de longitud y
 * formato se hacen aquí; las reglas de negocio (max 5 favoritos, bggId
 * existe) van en el service.
 */
public record UpdateProfileRequest(
        @Pattern(regexp = "^avatar_(0[1-9]|[12][0-9]|3[01])$",
                 message = "error.profile.invalid.avatar.code")
        String avatarCode,

        @Size(max = 280, message = "error.profile.bio.too.long")
        String bio,

        List<Long> favoriteGameBggIds
) {}
```

Mensajes (`error.profile.invalid.avatar.code`, `error.profile.bio.too.long`) en `messages.properties` (clave i18n; añadir en T5).

- [ ] **Step 3: Tests de `ProfileServiceImpl.getCurrent()` (TDD fail)**

`backend/src/test/java/com/matchplay/user/service/ProfileServiceImplTest.java`:

```java
package com.matchplay.user.service;

import com.matchplay.avatar.entity.Avatar;
import com.matchplay.game.entity.Game;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.entity.User;
import com.matchplay.user.entity.UserFavoriteGame;
import com.matchplay.user.repository.UserFavoriteGameRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class ProfileServiceImplTest {

    @Mock CurrentUserProvider currentUserProvider;
    @Mock UserFavoriteGameRepository favoriteRepository;
    // ...otros mocks añadidos según hagan falta (T5)

    @InjectMocks ProfileServiceImpl service;

    private User userWith(String username, String email, String avatarCode, String bio) {
        User u = new User();
        u.setId(42L);
        u.setUsername(username);
        u.setEmail(email);
        u.setBio(bio);
        Avatar a = new Avatar();
        a.setCode(avatarCode);
        a.setName("Avatar 1");
        u.setSelectedAvatar(a);
        return u;
    }

    @Test
    void getCurrent_returnsFullProfile() {
        User user = userWith("alice", "alice@a.es", "avatar_07", "Hello.");
        given(currentUserProvider.requireCurrentUser()).willReturn(user);

        Game game = new Game();
        game.setBggId(13L);
        game.setName("Catan");
        game.setThumbnailUrl("http://thumb");
        UserFavoriteGame ufg = new UserFavoriteGame();
        ufg.setUser(user);
        ufg.setGame(game);
        ufg.setCreatedAt(LocalDateTime.now());
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of(ufg));

        UserProfileResponse out = service.getCurrent();

        assertThat(out.username()).isEqualTo("alice");
        assertThat(out.email()).isEqualTo("alice@a.es");
        assertThat(out.avatarCode()).isEqualTo("avatar_07");
        assertThat(out.bio()).isEqualTo("Hello.");
        assertThat(out.favoriteGames()).hasSize(1);
        assertThat(out.favoriteGames().get(0).bggId()).isEqualTo(13L);
        assertThat(out.favoriteGames().get(0).name()).isEqualTo("Catan");
    }

    @Test
    void getCurrent_emptyFavorites_returnsEmptyList() {
        User user = userWith("bob", "bob@b.es", "avatar_03", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        UserProfileResponse out = service.getCurrent();

        assertThat(out.favoriteGames()).isEmpty();
        assertThat(out.bio()).isNull();
    }
}
```

Run: `cd backend && ./mvnw.cmd test -Dtest=ProfileServiceImplTest`
Expected: FAIL (ProfileServiceImpl no existe).

- [ ] **Step 4: Implementar `ProfileServiceImpl.getCurrent()`**

`backend/src/main/java/com/matchplay/user/service/ProfileServiceImpl.java`:

```java
package com.matchplay.user.service;

import com.matchplay.security.CurrentUserProvider;
import com.matchplay.user.dto.FavoriteGameSummary;
import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.entity.User;
import com.matchplay.user.entity.UserFavoriteGame;
import com.matchplay.user.repository.UserFavoriteGameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final CurrentUserProvider currentUserProvider;
    private final UserFavoriteGameRepository favoriteRepository;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrent() {
        User user = currentUserProvider.requireCurrentUser();
        List<UserFavoriteGame> favs = favoriteRepository.findByUserIdOrderByCreatedAtAsc(user.getId());

        List<FavoriteGameSummary> favSummaries = favs.stream()
                .map(f -> new FavoriteGameSummary(
                        f.getGame().getBggId(),
                        f.getGame().getName(),
                        f.getGame().getThumbnailUrl()))
                .toList();

        return new UserProfileResponse(
                user.getUsernameValue(),
                user.getEmail(),
                user.getSelectedAvatar() != null ? user.getSelectedAvatar().getCode() : null,
                user.getBio(),
                favSummaries
        );
    }

    @Override
    @Transactional
    public UserProfileResponse update(UpdateProfileRequest request) {
        throw new UnsupportedOperationException("Implemented in T5");
    }

    @Override
    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        throw new UnsupportedOperationException("Implemented in T5");
    }
}
```

Run: `cd backend && ./mvnw.cmd test -Dtest=ProfileServiceImplTest`
Expected: 2/2 PASS.

- [ ] **Step 5: Crear `MeController`**

`backend/src/main/java/com/matchplay/user/controller/MeController.java`:

```java
package com.matchplay.user.controller;

import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "Perfil del usuario actual")
public class MeController {

    private final ProfileService profileService;

    @GetMapping
    @Operation(summary = "Perfil completo del usuario actual")
    public UserProfileResponse getCurrent() {
        return profileService.getCurrent();
    }

    @PatchMapping
    @Operation(summary = "Actualizar perfil (avatar / bio / juegos favoritos)")
    public UserProfileResponse update(@Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(request);
    }
}
```

- [ ] **Step 6: Test del controller (GET solo por ahora)**

`backend/src/test/java/com/matchplay/user/controller/MeControllerTest.java`:

```java
package com.matchplay.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.matchplay.user.dto.FavoriteGameSummary;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.service.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class MeControllerTest {

    @Mock ProfileService profileService;
    @InjectMocks MeController controller;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ObjectMapper om = new ObjectMapper();
        om.setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);
        MappingJackson2HttpMessageConverter conv = new MappingJackson2HttpMessageConverter(om);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setMessageConverters(conv).build();
    }

    @Test
    void getCurrent_returns200WithProfile() throws Exception {
        given(profileService.getCurrent()).willReturn(new UserProfileResponse(
                "alice", "alice@a.es", "avatar_07", "Hello",
                List.of(new FavoriteGameSummary(13L, "Catan", "http://thumb"))
        ));

        mockMvc.perform(get("/api/v1/me/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.avatarCode").value("avatar_07"))
                .andExpect(jsonPath("$.bio").value("Hello"))
                .andExpect(jsonPath("$.favoriteGames[0].name").value("Catan"));
    }
}
```

Run: `cd backend && ./mvnw.cmd test -Dtest=MeControllerTest`
Expected: PASS.

- [ ] **Step 7: Verificar seguridad**

Lee `backend/src/main/java/com/matchplay/config/SecurityConfig.java`. Confirma que NO hay `permitAll()` para `/api/v1/me/**` — el `anyRequest().authenticated()` final cubre nuestros endpoints. Si añadiste un matcher diferente en la sesión anterior, ajusta.

- [ ] **Step 8: Suite completa**

Run: `cd backend && ./mvnw.cmd test`
Expected: 190 baseline + 3 nuevos = 193 PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/matchplay/user/dto/UpdateProfileRequest.java \
        backend/src/main/java/com/matchplay/user/service/ \
        backend/src/main/java/com/matchplay/user/controller/MeController.java \
        backend/src/test/java/com/matchplay/user/
git commit -m "feat(profile): GET /api/v1/me/profile con bio + favoritos"
```

---

## Task 5: BE — PATCH /me/profile + POST /me/password

**Files:**
- Modify: `backend/src/main/java/com/matchplay/user/service/ProfileServiceImpl.java` — completar `update()` y `changePassword()`
- Modify: `backend/src/main/java/com/matchplay/user/controller/MeController.java` — añadir POST /password
- Create: `backend/src/main/java/com/matchplay/user/dto/ChangePasswordRequest.java`
- Create: `backend/src/main/java/com/matchplay/user/exception/{WrongPasswordException,InvalidAvatarCodeException,TooManyFavoritesException}.java`
- Modify: `backend/src/main/java/com/matchplay/common/exception/GlobalExceptionHandler.java` — mapear excepciones nuevas
- Modify: `backend/src/main/resources/messages.properties` y `messages_en.properties` — keys i18n
- Modify: tests (ProfileServiceImplTest, MeControllerTest) — añadir cobertura

- [ ] **Step 1: Excepciones**

Crea 3 archivos:

`backend/src/main/java/com/matchplay/user/exception/WrongPasswordException.java`:
```java
package com.matchplay.user.exception;

public class WrongPasswordException extends RuntimeException {
    public WrongPasswordException() {
        super("error.profile.password.wrong");
    }
}
```

`backend/src/main/java/com/matchplay/user/exception/InvalidAvatarCodeException.java`:
```java
package com.matchplay.user.exception;

public class InvalidAvatarCodeException extends RuntimeException {
    public InvalidAvatarCodeException(String code) {
        super("error.profile.invalid.avatar.code:" + code);
    }
}
```

`backend/src/main/java/com/matchplay/user/exception/TooManyFavoritesException.java`:
```java
package com.matchplay.user.exception;

public class TooManyFavoritesException extends RuntimeException {
    public TooManyFavoritesException() {
        super("error.profile.too.many.favorites");
    }
}
```

- [ ] **Step 2: Mapear excepciones en `GlobalExceptionHandler`**

Lee el handler. Añade 3 `@ExceptionHandler` que devuelvan 400 con `ApiError` (usar mismo patrón que el resto del proyecto — probable `MessageSource.getMessage(key, locale)`). Si el patrón existente usa códigos como `BadRequestException` con resolver i18n automático, las 3 excepciones nuevas heredarían de esa clase base; mira el código.

- [ ] **Step 3: `ChangePasswordRequest`**

```java
package com.matchplay.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 8, message = "error.profile.password.too.short")
        String newPassword
) {}
```

- [ ] **Step 4: Tests para `update()` (TDD fail)**

En `ProfileServiceImplTest`, añade:

```java
@Mock AvatarRepository avatarRepository;
@Mock GameRepository gameRepository;
@Mock UserRepository userRepository;
@Mock PasswordEncoder passwordEncoder;

@Test
void update_changesAvatarCode() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    given(currentUserProvider.requireCurrentUser()).willReturn(user);
    Avatar newAvatar = new Avatar();
    newAvatar.setCode("avatar_15");
    given(avatarRepository.findById("avatar_15")).willReturn(Optional.of(newAvatar));
    given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

    service.update(new UpdateProfileRequest("avatar_15", null, null));

    assertThat(user.getSelectedAvatar().getCode()).isEqualTo("avatar_15");
}

@Test
void update_changesBio() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    given(currentUserProvider.requireCurrentUser()).willReturn(user);
    given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

    service.update(new UpdateProfileRequest(null, "New bio", null));

    assertThat(user.getBio()).isEqualTo("New bio");
}

@Test
void update_truncatesBioTo280Chars_serverSide() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    given(currentUserProvider.requireCurrentUser()).willReturn(user);
    given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

    String longBio = "x".repeat(500);
    service.update(new UpdateProfileRequest(null, longBio, null));

    assertThat(user.getBio()).hasSize(280);
}

@Test
void update_replacesFavorites() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    given(currentUserProvider.requireCurrentUser()).willReturn(user);
    Game g13 = new Game(); g13.setBggId(13L); g13.setName("Catan");
    Game g34 = new Game(); g34.setBggId(34L); g34.setName("UrSuPa");
    given(gameRepository.findByBggId(13L)).willReturn(Optional.of(g13));
    given(gameRepository.findByBggId(34L)).willReturn(Optional.of(g34));
    given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

    service.update(new UpdateProfileRequest(null, null, List.of(13L, 34L)));

    verify(favoriteRepository).deleteByUserId(42L);
    verify(favoriteRepository, times(2)).save(any(UserFavoriteGame.class));
}

@Test
void update_tooManyFavorites_throws() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    given(currentUserProvider.requireCurrentUser()).willReturn(user);

    assertThatThrownBy(() -> service.update(new UpdateProfileRequest(null, null, List.of(1L,2L,3L,4L,5L,6L))))
            .isInstanceOf(TooManyFavoritesException.class);
}

@Test
void changePassword_correct_persistsNewHash() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    user.setPasswordHash("hash_old");
    given(currentUserProvider.requireCurrentUser()).willReturn(user);
    given(passwordEncoder.matches("oldP", "hash_old")).willReturn(true);
    given(passwordEncoder.encode("newPass123")).willReturn("hash_new");

    service.changePassword("oldP", "newPass123");

    assertThat(user.getPasswordHash()).isEqualTo("hash_new");
}

@Test
void changePassword_wrongCurrent_throws() {
    User user = userWith("alice", "a@a.es", "avatar_01", null);
    user.setPasswordHash("hash_old");
    given(currentUserProvider.requireCurrentUser()).willReturn(user);
    given(passwordEncoder.matches("wrong", "hash_old")).willReturn(false);

    assertThatThrownBy(() -> service.changePassword("wrong", "newPass123"))
            .isInstanceOf(WrongPasswordException.class);
}
```

Imports nuevos en el test: `AvatarRepository`, `GameRepository`, `UserRepository`, `PasswordEncoder`, `times`, `verify`, `any`, `assertThatThrownBy`, `Optional`, `Game`, `TooManyFavoritesException`, `WrongPasswordException`.

Run: `cd backend && ./mvnw.cmd test -Dtest=ProfileServiceImplTest`
Expected: FAIL (métodos lanzan UnsupportedOperationException).

- [ ] **Step 5: Implementar `update()` y `changePassword()`**

En `ProfileServiceImpl.java`:

```java
private final AvatarRepository avatarRepository;
private final GameRepository gameRepository;
private final PasswordEncoder passwordEncoder;
private final UserRepository userRepository;

private static final int BIO_MAX_LENGTH = 280;
private static final int MAX_FAVORITES = 5;

@Override
@Transactional
public UserProfileResponse update(UpdateProfileRequest request) {
    User user = currentUserProvider.requireCurrentUser();

    if (request.avatarCode() != null) {
        Avatar avatar = avatarRepository.findById(request.avatarCode())
                .orElseThrow(() -> new InvalidAvatarCodeException(request.avatarCode()));
        user.setSelectedAvatar(avatar);
    }

    if (request.bio() != null) {
        String trimmed = request.bio().length() > BIO_MAX_LENGTH
                ? request.bio().substring(0, BIO_MAX_LENGTH)
                : request.bio();
        user.setBio(trimmed.isEmpty() ? null : trimmed);
    }

    if (request.favoriteGameBggIds() != null) {
        if (request.favoriteGameBggIds().size() > MAX_FAVORITES) {
            throw new TooManyFavoritesException();
        }
        favoriteRepository.deleteByUserId(user.getId());
        for (Long bggId : request.favoriteGameBggIds()) {
            Game game = gameRepository.findByBggId(bggId)
                    .orElseThrow(() -> new GameNotFoundException(bggId));
            UserFavoriteGame ufg = new UserFavoriteGame();
            ufg.setUser(user);
            ufg.setGame(game);
            ufg.setCreatedAt(LocalDateTime.now());
            favoriteRepository.save(ufg);
        }
    }

    userRepository.save(user);
    return getCurrent();
}

@Override
@Transactional
public void changePassword(String currentPassword, String newPassword) {
    User user = currentUserProvider.requireCurrentUser();
    if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
        throw new WrongPasswordException();
    }
    user.setPasswordHash(passwordEncoder.encode(newPassword));
    userRepository.save(user);
}
```

Verifica que `GameNotFoundException` existe en `com.matchplay.game.exception` o equivalente. Si no, usa una excepción genérica.

Imports nuevos según necesidad.

Run: `cd backend && ./mvnw.cmd test -Dtest=ProfileServiceImplTest`
Expected: 9/9 PASS (2 anteriores + 7 nuevos).

- [ ] **Step 6: Añadir endpoints al `MeController`**

```java
@PostMapping("/password")
@Operation(summary = "Cambiar la contraseña del usuario actual")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
    profileService.changePassword(request.currentPassword(), request.newPassword());
}
```

(El `@PatchMapping` ya quedó implementado en T4.)

- [ ] **Step 7: Tests del controller para PATCH y POST**

Añade en `MeControllerTest`:

```java
@Test
void update_returns200WithUpdatedProfile() throws Exception {
    given(profileService.update(any())).willReturn(new UserProfileResponse(
            "alice", "a@a.es", "avatar_15", "Updated bio", List.of()));

    mockMvc.perform(patch("/api/v1/me/profile")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"avatarCode\":\"avatar_15\",\"bio\":\"Updated bio\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.avatarCode").value("avatar_15"))
            .andExpect(jsonPath("$.bio").value("Updated bio"));
}

@Test
void update_returns400OnInvalidAvatar() throws Exception {
    mockMvc.perform(patch("/api/v1/me/profile")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"avatarCode\":\"avatar_99\"}"))
            .andExpect(status().isBadRequest());
}

@Test
void changePassword_returns204() throws Exception {
    mockMvc.perform(post("/api/v1/me/profile/password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"old\",\"newPassword\":\"new12345\"}"))
            .andExpect(status().isNoContent());
}

@Test
void changePassword_returns400OnShortPassword() throws Exception {
    mockMvc.perform(post("/api/v1/me/profile/password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"currentPassword\":\"old\",\"newPassword\":\"short\"}"))
            .andExpect(status().isBadRequest());
}
```

Imports adicionales: `patch`, `post`, `MediaType`.

Run: `cd backend && ./mvnw.cmd test`
Expected: 190 baseline + ~11 nuevos = ~201 PASS.

- [ ] **Step 8: Añadir i18n keys**

En `backend/src/main/resources/messages.properties`:

```
error.profile.invalid.avatar.code=Código de avatar inválido
error.profile.bio.too.long=La biografía supera el máximo de 280 caracteres
error.profile.too.many.favorites=Máximo 5 juegos favoritos
error.profile.password.wrong=Contraseña actual incorrecta
error.profile.password.too.short=La nueva contraseña debe tener al menos 8 caracteres
```

En `backend/src/main/resources/messages_en.properties`:

```
error.profile.invalid.avatar.code=Invalid avatar code
error.profile.bio.too.long=Bio exceeds 280 characters max
error.profile.too.many.favorites=Maximum 5 favorite games
error.profile.password.wrong=Wrong current password
error.profile.password.too.short=New password must be at least 8 characters
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/matchplay/user/ \
        backend/src/main/resources/messages*.properties \
        backend/src/test/java/com/matchplay/user/
git commit -m "feat(profile): PATCH /me/profile y POST /me/profile/password"
```

---

## Task 6: BE — Enriquecer DTOs de sessions y chat con avatarCode

**Files:**
- Modify: `backend/src/main/java/com/matchplay/session/dto/SessionSummaryResponse.java` — añadir `creatorAvatarCode`
- Modify: `backend/src/main/java/com/matchplay/session/dto/SessionParticipantResponse.java` — añadir `avatarCode`
- Modify: `backend/src/main/java/com/matchplay/session/dto/ChatMessageResponse.java` — añadir `authorAvatarCode`
- Modify: `backend/src/main/java/com/matchplay/session/mapper/SessionMapper.java` — pasar los nuevos campos
- Modify: mappers de chat
- Modify: fixtures posicionales en tests (grep + actualizar)

- [ ] **Step 1: Localizar todas las construcciones posicionales**

Run:
```bash
grep -rln "new SessionSummaryResponse(" backend/src
grep -rln "new SessionParticipantResponse(" backend/src
grep -rln "new ChatMessageResponse(" backend/src
```

Cuenta cuántos hits hay en main y test para planear el alcance.

- [ ] **Step 2: Añadir campo `creatorAvatarCode` a `SessionSummaryResponse`**

Es el último campo del record (después de `expansionNames` añadido en sprint anterior):

```java
public record SessionSummaryResponse(
        ...,
        List<String> expansionNames,
        String creatorAvatarCode
) {}
```

- [ ] **Step 3: Añadir `avatarCode` a `SessionParticipantResponse`**

Localiza el record. Añade `String avatarCode` después de `username`.

- [ ] **Step 4: Añadir `authorAvatarCode` a `ChatMessageResponse`**

Localiza el record. Añade `String authorAvatarCode` después de `authorUsername`.

- [ ] **Step 5: Actualizar el mapper `SessionMapper.toSummary(...)`**

El mapper construye `SessionSummaryResponse`. Añade el último argumento:

```java
session.getCreator() != null && session.getCreator().getSelectedAvatar() != null
        ? session.getCreator().getSelectedAvatar().getCode()
        : null
```

- [ ] **Step 6: Actualizar `toDetail` y el mapper de participantes**

Cuando construye `SessionParticipantResponse`, pasa `p.getUser().getSelectedAvatar() != null ? p.getUser().getSelectedAvatar().getCode() : null` como nuevo campo.

- [ ] **Step 7: Actualizar el mapper de `ChatMessageResponse`**

Localiza el mapper (`ChatService` o `ChatMessageMapper`). Añade `message.getAuthor().getSelectedAvatar() != null ? ... : null`.

- [ ] **Step 8: Compilar — los tests fixtures rotos darán errores claros**

Run: `cd backend && ./mvnw.cmd test-compile`
Expected: errores en cada constructor posicional de los 3 records. Lista todos.

- [ ] **Step 9: Para cada fixture, añadir el campo nuevo (en general `null` o `"avatar_07"`)**

Recorre cada match del grep y añade el argumento al final (`SessionSummaryResponse`), o en la posición correcta (`SessionParticipantResponse`, `ChatMessageResponse`).

Tip: si hay un `detail()` helper en `GameSessionServiceImplTest`, actualízalo allí — propaga al resto.

- [ ] **Step 10: Suite completa**

Run: `cd backend && ./mvnw.cmd test`
Expected: todos los tests passing (191+ nuevos por el sprint anterior).

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/matchplay/session/ backend/src/test/java/com/matchplay/session/
git commit -m "feat(profile): avatarCode en DTOs de sessions y chat"
```

---

## Task 7: FE — `<Avatar>` componente compartido + reemplazo en `SessionPlayerRow`

**Files:**
- Create: `frontend/src/shared/components/Avatar.tsx`
- Create: `frontend/src/shared/components/__tests__/Avatar.test.tsx`
- Modify: `frontend/src/features/sessions/components/SessionPlayerRow.tsx` — usar `<Avatar>`
- Modify: `frontend/src/features/sessions/types/session.types.ts` — `SessionPlayer.avatarCode?`
- Modify: fixtures que construyan `SessionPlayer` — el campo es opcional, no rompe TSC
- Modify: `frontend/src/features/auth/types/auth.types.ts` — `CurrentUser.avatarCode?` y `.bio?`

- [ ] **Step 1: Verificar el path de los assets**

```bash
ls frontend/src/assets/avatars/ | head -5
```

Espera ver `avatar_01.png ... avatar_31.png`. Vite resolverá `import.meta.glob` o imports estáticos a URLs. Usaremos `import.meta.glob` para evitar 31 imports estáticos.

- [ ] **Step 2: Crear `Avatar.tsx`**

`frontend/src/shared/components/Avatar.tsx`:

```tsx
import { cn } from '@/shared/lib/cn'
import { pickAvatarColor } from '@/shared/lib/avatarColor'

// Vite resuelve todas las URLs en build-time. La key es la ruta relativa
// (./avatar_01.png → ./avatar_31.png).
const avatarUrls = import.meta.glob<{ default: string }>('@/assets/avatars/avatar_*.png', {
  eager: true,
}) as Record<string, { default: string }>

function urlForCode(code: string): string | null {
  const path = `/src/assets/avatars/${code}.png`
  return avatarUrls[path]?.default ?? null
}

interface AvatarProps {
  username: string
  avatarCode?: string | null
  size?: number
  className?: string
}

/**
 * Componente unificado para mostrar el avatar de un usuario.
 *
 * - Si `avatarCode` matchea uno de los 31 PNGs presets en
 *   `frontend/src/assets/avatars/`, se renderiza la imagen.
 * - Si no (null/undefined o code no encontrado), fallback a círculo coloreado
 *   con la inicial del username (compatibilidad con el sistema anterior).
 *
 * `size` en píxeles (default 32). El componente fija width/height inline para
 * controlar el tamaño exacto sin depender de Tailwind size utilities (que
 * tienen incrementos discretos).
 */
export function Avatar({ username, avatarCode, size = 32, className }: AvatarProps) {
  const url = avatarCode ? urlForCode(avatarCode) : null

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold text-white',
        pickAvatarColor(username),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {username.charAt(0).toUpperCase()}
    </span>
  )
}
```

- [ ] **Step 3: Test del componente**

`frontend/src/shared/components/__tests__/Avatar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('renderiza la inicial coloreada cuando no hay avatarCode', () => {
    render(<Avatar username="alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renderiza inicial cuando avatarCode no corresponde a ningún PNG', () => {
    render(<Avatar username="bob" avatarCode="avatar_99" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('renderiza la imagen cuando el avatarCode es válido', () => {
    render(<Avatar username="alice" avatarCode="avatar_07" />)
    const img = screen.getByRole('img', { name: 'alice' })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src')
  })

  it('aplica el tamaño en píxeles', () => {
    render(<Avatar username="alice" avatarCode="avatar_07" size={48} />)
    const img = screen.getByRole('img', { name: 'alice' })
    expect(img).toHaveAttribute('width', '48')
    expect(img).toHaveAttribute('height', '48')
  })
})
```

Run: `cd frontend && npm test -- Avatar`
Expected: 4/4 PASS.

- [ ] **Step 4: Añadir `avatarCode` a tipos TS**

En `frontend/src/features/auth/types/auth.types.ts`, en el type `CurrentUser`:

```ts
avatarCode?: string
bio?: string
```

En `frontend/src/features/sessions/types/session.types.ts`, en `SessionPlayer`:

```ts
avatarCode?: string
```

En `ChatMessage`:

```ts
authorAvatarCode?: string
```

En `SessionSummary`:

```ts
creatorAvatarCode?: string
```

Todos OPCIONALES (Jackson omite null → llegan como undefined).

- [ ] **Step 5: Reemplazar en `SessionPlayerRow`**

Lee `frontend/src/features/sessions/components/SessionPlayerRow.tsx`. Localiza el `<span aria-hidden="true" className="inline-flex size-7 ...">` que pinta la letra+color. Reemplázalo por:

```tsx
<Avatar username={player.username} avatarCode={player.avatarCode} size={28} />
```

Import: `import { Avatar } from '@/shared/components/Avatar'`.

Quitar el import de `pickAvatarColor` si ya no se usa en este archivo.

- [ ] **Step 6: TSC + tests**

Run: `cd frontend && npx tsc -p tsconfig.app.json --noEmit`
Expected: solo los errores pre-existentes (`SessionPlayerRow.tsx`/`avatarColor.ts` que ya conocemos — verifica si se siguen reportando o si tu cambio los resuelve).

Run: `cd frontend && npm test`
Expected: 152 baseline + 4 nuevos de Avatar = 156 PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/components/Avatar.tsx \
        frontend/src/shared/components/__tests__/Avatar.test.tsx \
        frontend/src/features/sessions/components/SessionPlayerRow.tsx \
        frontend/src/features/sessions/types/session.types.ts \
        frontend/src/features/auth/types/auth.types.ts
git commit -m "feat(profile): Avatar component + reemplazo en SessionPlayerRow"
```

---

## Task 8: FE — `<UserMenu>` + integración en `SiteHeader`

**Files:**
- Create: `frontend/src/app/layouts/UserMenu.tsx`
- Create: `frontend/src/app/layouts/__tests__/UserMenu.test.tsx`
- Modify: `frontend/src/app/layouts/SiteHeader.tsx`

- [ ] **Step 1: Tests TDD (fail)**

`frontend/src/app/layouts/__tests__/UserMenu.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { UserMenu } from '../UserMenu'

const mockLogout = vi.fn()
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { userId: 1, username: 'alice', email: 'a@a.es', avatarCode: 'avatar_07' },
    status: 'authenticated',
  }),
  useLogoutMutation: () => ({ mutate: mockLogout, isPending: false }),
}))

function renderMenu() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('UserMenu', () => {
  it('renderiza el avatar y nombre del usuario en el trigger', () => {
    renderMenu()
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument()
  })

  it('abre el menú al hacer click en el trigger', async () => {
    renderMenu()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /mi perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /ayuda/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /cerrar sesión/i })).toBeInTheDocument()
  })

  it('cierra el menú con Escape', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('click en Cerrar sesión dispara la mutación de logout', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('Mis mensajes está disabled (próximamente)', async () => {
    renderMenu()
    await userEvent.click(screen.getByRole('button', { name: /alice/i }))
    const item = screen.getByRole('menuitem', { name: /mis mensajes/i })
    expect(item).toBeDisabled()
  })
})
```

Run: `cd frontend && npm test -- UserMenu`
Expected: FAIL (componente no existe).

- [ ] **Step 2: Implementar `UserMenu.tsx`**

```tsx
import { ChevronDown, HelpCircle, Languages, LogOut, MessageSquare, Moon, Sun, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth, useLogoutMutation } from '@/features/auth/hooks/useAuth'
import { Avatar } from '@/shared/components/Avatar'
import { useTheme } from '@/shared/hooks/useTheme'
import { cn } from '@/shared/lib/cn'

const SUPPORTED_LANGS = ['es', 'en'] as const

/**
 * Dropdown del usuario autenticado. Trigger: avatar + nombre (oculto en <md).
 * Items: Mi perfil, Mis mensajes (próx), Ayuda, Idioma toggle, Modo oscuro,
 * Cerrar sesión. Esc/click fuera cierran. Toggle de idioma/tema NO cierra.
 */
export function UserMenu() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const logout = useLogoutMutation()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!isAuthenticated || !user) return null

  function handleNavigateAndClose(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full p-1 pr-2',
          'transition hover:bg-foreground/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
        )}
      >
        <Avatar username={user.username} avatarCode={user.avatarCode} size={32} />
        <span className="hidden text-sm font-medium md:inline">{user.username}</span>
        <ChevronDown size={12} className="text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('nav.userMenuLabel')}
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-72',
            'rounded-xl border border-black/5 bg-white py-1.5',
            'shadow-[0_12px_32px_rgba(0,0,0,0.14)]',
          )}
        >
          <MenuItem icon={<User size={16} />} onClick={() => handleNavigateAndClose('/profile')}>
            {t('nav.profile')}
          </MenuItem>
          <MenuItem icon={<MessageSquare size={16} />} disabled>
            {t('nav.messages')}
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('common.comingSoon')}
            </span>
          </MenuItem>
          <MenuItem icon={<HelpCircle size={16} />} onClick={() => handleNavigateAndClose('/help')}>
            {t('nav.help')}
          </MenuItem>

          {/* Idioma toggle */}
          <div className="flex items-center gap-3.5 px-3.5 py-2 text-sm">
            <Languages size={16} className="text-muted-foreground" aria-hidden="true" />
            <span>{t('nav.language')}</span>
            <div className="ml-auto flex gap-1">
              {SUPPORTED_LANGS.map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-[11px] font-semibold transition',
                    i18n.language === lng
                      ? 'border-foreground bg-foreground text-white'
                      : 'border-black/10 bg-transparent text-muted-foreground',
                  )}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Modo oscuro toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex w-full items-center gap-3.5 px-3.5 py-2 text-left text-sm hover:bg-foreground/5"
          >
            {theme === 'dark' ? <Sun size={16} className="text-muted-foreground" /> : <Moon size={16} className="text-muted-foreground" />}
            <span>{t('nav.darkMode')}</span>
            <span
              className={cn(
                'ml-auto inline-block h-5 w-9 rounded-full transition',
                theme === 'dark' ? 'bg-foreground' : 'bg-muted',
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  'mt-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  theme === 'dark' ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </span>
          </button>

          {/* Logout */}
          <button
            type="button"
            role="menuitem"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(
              'flex w-full items-center gap-3.5 border-t border-black/5 px-3.5 pb-2 pt-3 text-left text-sm',
              'text-[#C8362C] transition hover:bg-[rgba(200,54,44,0.06)]',
            )}
          >
            <LogOut size={16} aria-hidden="true" />
            {t('nav.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}

function MenuItem({ icon, onClick, disabled, children }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3.5 px-3.5 py-2 text-left text-sm transition',
        disabled ? 'cursor-not-allowed text-muted-foreground italic' : 'hover:bg-foreground/5',
      )}
    >
      <span className={cn('text-muted-foreground', disabled && 'opacity-50')}>{icon}</span>
      {children}
    </button>
  )
}
```

Notas:
- El `useTheme()` aún no existe — la siguiente task (T9) lo crea. Por ahora, el archivo NO compilará. Ese es OK porque el commit irá después.
- Si no quieres bloquearte por esto, en este Step pon un stub temporal `const [theme, setTheme] = useState<'light'|'dark'>('light')` y refactoriza en T9.

**Decisión recomendada**: hacer el stub temporal aquí y T9 lo limpia. Asi este task queda autónomo.

Stub temporal en `UserMenu.tsx` mientras T9:
```ts
import { useState } from 'react'
const [theme, setTheme] = useState<'dark' | 'light'>('light')
// (quita el import de useTheme y reemplaza la línea correspondiente)
```

- [ ] **Step 3: Integrar en `SiteHeader`**

Lee `frontend/src/app/layouts/SiteHeader.tsx`. Localiza el bloque desktop con `{user.username}` + `<Button>{t('nav.logout')}</Button>` + `<LanguageSwitcher />`. Reemplázalo:

```tsx
{isAuthenticated ? <UserMenu /> : (
  <>
    <Link to="/login" className="text-foreground hover:underline">{t('nav.login')}</Link>
    <Link to="/register" className="font-medium text-red hover:underline">{t('nav.register')}</Link>
    <LanguageSwitcher />
  </>
)}
```

(Anónimos siguen viendo Login/Register + LanguageSwitcher.)

Import: `import { UserMenu } from './UserMenu'`.

Para mobile: si hay un burger, dejarlo para anónimos y reemplazarlo por el avatar (que ya abre el `MobileMenu`) cuando está autenticado. Detalle en T13.

- [ ] **Step 4: i18n keys mínimas**

En `frontend/src/shared/i18n/locales/es.json`:
```json
"nav": {
  ...,
  "profile": "Mi perfil",
  "messages": "Mis mensajes",
  "help": "Ayuda",
  "language": "Idioma",
  "darkMode": "Modo oscuro",
  "userMenuLabel": "Menú de usuario"
},
"common": {
  ...,
  "comingSoon": "Pronto"
}
```

Mismo bloque traducido en `en.json` (Profile / Messages / Help / Language / Dark mode / User menu / Soon).

- [ ] **Step 5: Tests + commit**

Run: `cd frontend && npm test -- UserMenu`
Expected: 5/5 PASS.

Run: `cd frontend && npm test`
Expected: suite passing (~161).

```bash
git add frontend/src/app/layouts/UserMenu.tsx \
        frontend/src/app/layouts/__tests__/UserMenu.test.tsx \
        frontend/src/app/layouts/SiteHeader.tsx \
        frontend/src/shared/i18n/locales/
git commit -m "feat(profile): UserMenu dropdown e integración en SiteHeader"
```

---

## Task 9: FE — `useTheme()` hook + integración real en UserMenu

**Files:**
- Create: `frontend/src/shared/hooks/useTheme.ts`
- Create: `frontend/src/shared/hooks/__tests__/useTheme.test.ts`
- Modify: `frontend/src/main.tsx` — inicialización temprana
- Modify: `frontend/src/app/layouts/UserMenu.tsx` — reemplazar stub por hook real

- [ ] **Step 1: Tests TDD (fail)**

`frontend/src/shared/hooks/__tests__/useTheme.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useTheme } from '../useTheme'

const KEY = 'matchplay-theme'

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('default es light cuando no hay nada guardado', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('lee el valor de localStorage', () => {
    localStorage.setItem(KEY, 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme persiste en localStorage y aplica/elimina class dark', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('dark'))
    expect(localStorage.getItem(KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => result.current.setTheme('light'))
    expect(localStorage.getItem(KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
```

Run: `cd frontend && npm test -- useTheme`
Expected: FAIL (hook no existe).

- [ ] **Step 2: Implementar `useTheme.ts`**

```ts
import { useEffect, useState } from 'react'

const KEY = 'matchplay-theme'
type Theme = 'light' | 'dark'

function readInitial(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

/**
 * Hook para leer/cambiar el tema. Persiste en `localStorage` bajo `matchplay-theme`.
 * Aplica `class="dark"` al `<html>` cuando theme === 'dark'.
 *
 * Para evitar el flash de "tema claro luego oscuro" en boot, ejecutar
 * {@link initThemeEarly} en main.tsx antes del render.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitial)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(next: Theme) {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
    setThemeState(next)
  }

  return { theme, setTheme }
}

/**
 * Llamar lo antes posible (main.tsx) antes del primer render para evitar
 * flash de contenido sin la class `dark` aplicada.
 */
export function initThemeEarly() {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark') document.documentElement.classList.add('dark')
  } catch {
    /* ignore */
  }
}
```

Run: `cd frontend && npm test -- useTheme`
Expected: 3/3 PASS.

- [ ] **Step 3: Inicialización temprana**

En `frontend/src/main.tsx` (lee primero el contenido actual), añade ANTES del primer render:

```ts
import { initThemeEarly } from '@/shared/hooks/useTheme'

initThemeEarly()
```

- [ ] **Step 4: Reemplazar stub en `UserMenu.tsx`**

Quita el `useState` temporal e importa `useTheme`:

```ts
import { useTheme } from '@/shared/hooks/useTheme'

const { theme, setTheme } = useTheme()
```

- [ ] **Step 5: Test + commit**

Run: `cd frontend && npm test -- "UserMenu|useTheme"`
Expected: 5 + 3 = 8 PASS.

```bash
git add frontend/src/shared/hooks/ frontend/src/main.tsx frontend/src/app/layouts/UserMenu.tsx
git commit -m "feat(profile): useTheme + integración real de dark mode toggle"
```

---

## Task 10: FE — `ProfilePage` con AvatarPicker + Bio + Favoritos + Cambio de contraseña

**Files:**
- Create: `frontend/src/features/profile/types/profile.types.ts`
- Create: `frontend/src/features/profile/api/profileApi.ts`
- Create: `frontend/src/features/profile/hooks/useProfile.ts`
- Create: `frontend/src/features/profile/components/AvatarPicker.tsx`
- Create: `frontend/src/features/profile/components/BioForm.tsx`
- Create: `frontend/src/features/profile/components/FavoriteGamesPicker.tsx`
- Create: `frontend/src/features/profile/components/AccountSection.tsx`
- Create: `frontend/src/features/profile/components/ChangePasswordForm.tsx`
- Create: `frontend/src/features/profile/pages/ProfilePage.tsx`
- Create: `frontend/src/features/profile/__tests__/ProfilePage.test.tsx`
- Modify: `frontend/src/app/router.tsx` — añadir ruta `/profile` protegida (antes de `/sessions/:id` no aplica; pero ANTES de cualquier match wildcard)
- Modify: i18n locales

Este task es grande — dividido en sub-bloques para granularidad.

- [ ] **Step 1: Tipos y API client**

`frontend/src/features/profile/types/profile.types.ts`:
```ts
export interface FavoriteGameSummary {
  bggId: number
  name: string
  thumbnailUrl: string | null
}

export interface UserProfile {
  username: string
  email: string
  avatarCode: string | null
  bio: string | null
  favoriteGames: FavoriteGameSummary[]
}

export interface UpdateProfilePayload {
  avatarCode?: string
  bio?: string
  favoriteGameBggIds?: number[]
}
```

`frontend/src/features/profile/api/profileApi.ts`:
```ts
import { httpClient } from '@/shared/api/httpClient'

import type { UpdateProfilePayload, UserProfile } from '../types/profile.types'

export const profileApi = {
  get: (): Promise<UserProfile> =>
    httpClient.get<UserProfile>('/me/profile').then((r) => r.data),

  update: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    httpClient.patch<UserProfile>('/me/profile', payload).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    httpClient.post('/me/profile/password', { currentPassword, newPassword }).then(() => undefined),
}
```

- [ ] **Step 2: Hook + queryKey**

`frontend/src/features/profile/hooks/useProfile.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { profileApi } from '../api/profileApi'
import type { UpdateProfilePayload, UserProfile } from '../types/profile.types'

export const profileKeys = {
  current: ['profile', 'current'] as const,
}

export function useProfileQuery() {
  return useQuery<UserProfile>({
    queryKey: profileKeys.current,
    queryFn: () => profileApi.get(),
    staleTime: 30_000,
  })
}

export function useUpdateProfileMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileApi.update(payload),
    onSuccess: (profile) => {
      qc.setQueryData<UserProfile>(profileKeys.current, profile)
      // Invalida current user para refrescar avatar en el header
      qc.invalidateQueries({ queryKey: ['auth', 'current'] })
    },
  })
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword(currentPassword, newPassword),
  })
}
```

Verifica el query key del `useAuth` actual — si usa `['auth', 'me']` u otro, ajusta el `invalidateQueries`.

- [ ] **Step 3: `<AvatarPicker>` componente**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar } from '@/shared/components/Avatar'
import { cn } from '@/shared/lib/cn'

import { useUpdateProfileMutation } from '../hooks/useProfile'

const CODES = Array.from({ length: 31 }, (_, i) => `avatar_${String(i + 1).padStart(2, '0')}`)

interface AvatarPickerProps {
  username: string
  currentCode: string | null
}

export function AvatarPicker({ username, currentCode }: AvatarPickerProps) {
  const { t } = useTranslation()
  const update = useUpdateProfileMutation()
  const [savingCode, setSavingCode] = useState<string | null>(null)

  function pick(code: string) {
    if (code === currentCode) return
    setSavingCode(code)
    update.mutate(
      { avatarCode: code },
      { onSettled: () => setSavingCode(null) },
    )
  }

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingAvatar')}
      </h4>
      <div className="grid grid-cols-7 gap-3 rounded-lg border border-muted bg-white p-3">
        {CODES.map((code) => {
          const selected = code === currentCode
          const saving = code === savingCode
          return (
            <button
              key={code}
              type="button"
              aria-label={code}
              aria-pressed={selected}
              onClick={() => pick(code)}
              disabled={update.isPending}
              className={cn(
                'rounded-full transition focus:outline-none',
                selected
                  ? 'ring-2 ring-blue ring-offset-2 ring-offset-white'
                  : 'opacity-80 hover:opacity-100',
                saving && 'animate-pulse',
              )}
            >
              <Avatar username={username} avatarCode={code} size={56} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: `<BioForm>` componente**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUpdateProfileMutation } from '../hooks/useProfile'

const MAX = 280

interface BioFormProps {
  initialBio: string | null
}

export function BioForm({ initialBio }: BioFormProps) {
  const { t } = useTranslation()
  const update = useUpdateProfileMutation()
  const [bio, setBio] = useState(initialBio ?? '')
  const [feedback, setFeedback] = useState<'saved' | null>(null)

  function handleSubmit() {
    update.mutate(
      { bio },
      {
        onSuccess: () => {
          setFeedback('saved')
          setTimeout(() => setFeedback(null), 2000)
        },
      },
    )
  }

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingBio')}
      </h4>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value.slice(0, MAX))}
        rows={3}
        maxLength={MAX}
        className="w-full rounded-md border border-muted bg-white px-3 py-2 text-sm"
        placeholder={t('profile.bioPlaceholder')}
      />
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {bio.length} / {MAX}
        </span>
        {feedback === 'saved' && (
          <span className="text-green" role="status">
            {t('profile.bioSavedToast')}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={update.isPending || bio === (initialBio ?? '')}
        className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
      >
        {t('profile.bioSaveButton')}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: `<FavoriteGamesPicker>`**

Reusa la lógica del search BGG existente (`<GameWithExpansionsPicker>` o el endpoint). Si requiere una versión simplificada, crea un sub-componente `<GameSearchModal>` que abre, busca por nombre, y devuelve el `bggId` + `name` + `thumbnailUrl`. Pseudo-spec:

```tsx
import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/lib/cn'

import { useUpdateProfileMutation } from '../hooks/useProfile'
import type { FavoriteGameSummary } from '../types/profile.types'
// import GameSearchModal — implementar abajo o reutilizar el del create-session

const MAX = 5

interface Props {
  initial: FavoriteGameSummary[]
}

export function FavoriteGamesPicker({ initial }: Props) {
  const { t } = useTranslation()
  const update = useUpdateProfileMutation()
  const [items, setItems] = useState<FavoriteGameSummary[]>(initial)
  const [open, setOpen] = useState(false)

  function remove(bggId: number) {
    const next = items.filter((g) => g.bggId !== bggId)
    setItems(next)
    update.mutate({ favoriteGameBggIds: next.map((g) => g.bggId) })
  }

  function add(game: FavoriteGameSummary) {
    if (items.find((g) => g.bggId === game.bggId)) return
    const next = [...items, game]
    setItems(next)
    update.mutate({ favoriteGameBggIds: next.map((g) => g.bggId) })
    setOpen(false)
  }

  const slots = Array.from({ length: MAX }, (_, i) => items[i] ?? null)

  return (
    <div>
      <h4 className="mb-3 text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingFavorites')}
      </h4>
      <div className="flex flex-wrap gap-3">
        {slots.map((g, i) =>
          g ? (
            <div key={g.bggId} className="relative h-28 w-24 overflow-hidden rounded-md border border-muted bg-white p-2">
              {g.thumbnailUrl && <img src={g.thumbnailUrl} alt={g.name} className="h-16 w-full object-contain" />}
              <p className="mt-1 truncate text-[11px] font-medium">{g.name}</p>
              <button
                type="button"
                aria-label={`Quitar ${g.name}`}
                onClick={() => remove(g.bggId)}
                className="absolute right-1 top-1 rounded-full bg-black/40 p-0.5 text-white"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => setOpen(true)}
              disabled={items.length >= MAX}
              className={cn(
                'flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted text-xs text-muted-foreground transition hover:border-foreground/30',
                items.length >= MAX && 'cursor-not-allowed opacity-30',
              )}
            >
              <span className="text-xl">+</span>
              <span>{t('profile.favoritesAdd')}</span>
            </button>
          ),
        )}
      </div>
      {/* Modal BGG search aquí */}
      {open && <GameSearchModal onClose={() => setOpen(false)} onSelect={add} />}
    </div>
  )
}

// Stub mínimo del modal — implementar más rico al ejecutar
function GameSearchModal({ onClose, onSelect }: { onClose: () => void; onSelect: (g: FavoriteGameSummary) => void }) {
  // TODO en ejecución: reutilizar la lógica de búsqueda de GameWithExpansionsPicker
  // o crear una versión nueva que llame al endpoint /games?q=...&type=BASE.
  // Por brevedad de plan, dejamos placeholder. El task subagent debe
  // implementarlo durante ejecución con base en el GamePicker existente.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="rounded-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <p>GameSearchModal — implementar con el patrón del create-session</p>
        <button onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}
```

⚠ El `GameSearchModal` queda incompleto a propósito — el subagent debe inspeccionar `GameWithExpansionsPicker` y derivar una versión simple. Documentar como "TODO de ejecución" si excede los 5 min de step.

- [ ] **Step 6: `<ChangePasswordForm>`**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useChangePasswordMutation } from '../hooks/useProfile'
import { cn } from '@/shared/lib/cn'

export function ChangePasswordForm() {
  const { t } = useTranslation()
  const mutation = useChangePasswordMutation()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; key: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      setFeedback({ type: 'error', key: 'profile.errorPasswordMismatch' })
      return
    }
    if (next.length < 8) {
      setFeedback({ type: 'error', key: 'profile.errorPasswordTooShort' })
      return
    }
    setFeedback(null)
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setFeedback({ type: 'ok', key: 'profile.passwordSuccessToast' })
          setCurrent('')
          setNext('')
          setConfirm('')
        },
        onError: () => setFeedback({ type: 'error', key: 'profile.errorWrongPassword' }),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <h4 className="text-sm font-semibold">{t('profile.changePasswordHeading')}</h4>
      <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={t('profile.currentPasswordLabel')} className="block w-full rounded border border-muted bg-white px-3 py-2 text-sm" />
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={t('profile.newPasswordLabel')} className="block w-full rounded border border-muted bg-white px-3 py-2 text-sm" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t('profile.confirmPasswordLabel')} className="block w-full rounded border border-muted bg-white px-3 py-2 text-sm" />
      {feedback && (
        <p className={cn('text-xs', feedback.type === 'ok' ? 'text-green' : 'text-red')}>
          {t(feedback.key)}
        </p>
      )}
      <button type="submit" disabled={mutation.isPending} className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50">
        {t('profile.changePasswordButton')}
      </button>
    </form>
  )
}
```

- [ ] **Step 7: `<AccountSection>`**

Wraps username + email readonly + ChangePasswordForm:

```tsx
import { useTranslation } from 'react-i18next'

import { ChangePasswordForm } from './ChangePasswordForm'

interface Props {
  username: string
  email: string
}

export function AccountSection({ username, email }: Props) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#8B7355]">
        {t('profile.headingAccount')}
      </h4>
      <div>
        <label className="block text-xs text-muted-foreground">{t('profile.usernameLabel')}</label>
        <p className="text-sm font-medium">{username}</p>
        <p className="text-[11px] italic text-muted-foreground">{t('profile.usernameHelp')}</p>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">{t('profile.emailLabel')}</label>
        <p className="text-sm font-medium">{email}</p>
        <p className="text-[11px] italic text-muted-foreground">{t('profile.emailHelp')}</p>
      </div>
      <ChangePasswordForm />
    </div>
  )
}
```

- [ ] **Step 8: `ProfilePage`**

```tsx
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Avatar } from '@/shared/components/Avatar'
import { SeoHead } from '@/shared/components/SeoHead'

import { AccountSection } from '../components/AccountSection'
import { AvatarPicker } from '../components/AvatarPicker'
import { BioForm } from '../components/BioForm'
import { FavoriteGamesPicker } from '../components/FavoriteGamesPicker'
import { useProfileQuery } from '../hooks/useProfile'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { data, isLoading, isError } = useProfileQuery()

  if (!isAuthenticated) return <Navigate to="/login?next=/profile" replace />

  if (isLoading || !data) {
    return (
      <div className="container py-8 text-center text-muted-foreground">{t('common.loading')}</div>
    )
  }
  if (isError) {
    return (
      <div className="container py-8 text-center text-muted-foreground">{t('common.error')}</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <SeoHead title={`${t('profile.title')} | Match&Play`} description={t('profile.title')} noindex />
      <div className="overflow-hidden rounded-xl bg-[#FAF7F2] shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-4 border-b border-muted bg-white px-6 py-5">
          <Avatar username={data.username} avatarCode={data.avatarCode} size={48} />
          <div>
            <h1 className="m-0 font-display text-xl font-bold">@{data.username}</h1>
            {data.bio && <p className="m-0 text-sm italic text-muted-foreground">{data.bio}</p>}
          </div>
        </div>

        <div className="space-y-0 divide-y divide-muted">
          <section className="px-6 py-5">
            <AvatarPicker username={data.username} currentCode={data.avatarCode} />
          </section>
          <section className="px-6 py-5">
            <BioForm initialBio={data.bio} />
          </section>
          <section className="px-6 py-5">
            <FavoriteGamesPicker initial={data.favoriteGames} />
          </section>
          <section className="px-6 py-5">
            <AccountSection username={data.username} email={data.email} />
          </section>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Ruta + i18n keys**

En `frontend/src/app/router.tsx`:

```tsx
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))
// dentro de MainLayout children:
{ path: '/profile', element: <ProtectedRoute><ProfilePage /></ProtectedRoute> }
```

En `es.json` añadir bloque `profile`:

```json
"profile": {
  "title": "Mi perfil",
  "headingAvatar": "Avatar",
  "headingBio": "Bio",
  "headingFavorites": "Juegos favoritos (máx 5)",
  "headingAccount": "Cuenta",
  "bioPlaceholder": "Algo sobre ti…",
  "bioSaveButton": "Guardar",
  "bioSavedToast": "Guardado",
  "favoritesAdd": "Añadir",
  "favoritesMax": "Máximo alcanzado",
  "usernameLabel": "Nombre de usuario",
  "usernameHelp": "No se puede cambiar — contacta soporte",
  "emailLabel": "Email",
  "emailHelp": "No se puede cambiar — contacta soporte",
  "changePasswordHeading": "Cambiar contraseña",
  "currentPasswordLabel": "Contraseña actual",
  "newPasswordLabel": "Nueva contraseña",
  "confirmPasswordLabel": "Confirmar nueva contraseña",
  "changePasswordButton": "Cambiar",
  "passwordSuccessToast": "Contraseña cambiada",
  "errorWrongPassword": "Contraseña actual incorrecta",
  "errorPasswordMismatch": "Las contraseñas no coinciden",
  "errorPasswordTooShort": "Mínimo 8 caracteres"
}
```

Mismo bloque en `en.json` traducido.

- [ ] **Step 10: Test mínimo de ProfilePage**

`frontend/src/features/profile/__tests__/ProfilePage.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { server } from '@/mocks/server'

import ProfilePage from '../pages/ProfilePage'

const API = '/api/v1'

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { userId: 1, username: 'alice', email: 'a@a.es', avatarCode: 'avatar_07' },
    status: 'authenticated',
  }),
}))

function renderPage(path = '/profile') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<div data-testid="login">login</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

describe('ProfilePage', () => {
  it('renderiza secciones cuando hay perfil cargado', async () => {
    server.use(
      http.get(`${API}/me/profile`, () =>
        HttpResponse.json({
          username: 'alice', email: 'a@a.es', avatarCode: 'avatar_07',
          bio: 'Hello.', favoriteGames: [],
        }),
      ),
    )
    renderPage()
    expect(await screen.findByRole('heading', { name: /@alice/i })).toBeInTheDocument()
    expect(screen.getByText(/Hello\./)).toBeInTheDocument()
    expect(screen.getByText(/avatar/i)).toBeInTheDocument()
  })
})
```

Run: `cd frontend && npm test -- ProfilePage`
Expected: 1/1 PASS.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/features/profile/ \
        frontend/src/app/router.tsx \
        frontend/src/shared/i18n/locales/
git commit -m "feat(profile): ProfilePage con avatar picker, bio, favoritos y password"
```

---

## Task 11: FE — `<Avatar>` en `SessionDetailPage` header + `ChatMessageRow`

**Files:**
- Modify: `frontend/src/features/sessions/pages/SessionDetailPage.tsx` — avatar antes de "Organiza @user"
- Modify: `frontend/src/features/sessions/components/ChatMessageRow.tsx` — avatar antes del autor (no mostrar si es `mine`)

- [ ] **Step 1: SessionDetailPage**

Localiza la línea `{data.creatorUsername && (<p>{t('sessions.card.byCreator', { username: data.creatorUsername })}</p>)}`. Reemplaza por:

```tsx
{data.creatorUsername && (
  <div className="flex items-center gap-2">
    <Avatar username={data.creatorUsername} avatarCode={data.creatorAvatarCode} size={20} />
    <p className="text-xs text-muted-foreground">
      {t('sessions.card.byCreator', { username: data.creatorUsername })}
    </p>
  </div>
)}
```

Import `Avatar` desde `@/shared/components/Avatar`. Asegúrate de que el tipo `SessionDetail` ya tiene `creatorAvatarCode?: string` (lo añadiste en T7).

- [ ] **Step 2: ChatMessageRow**

Lee el componente. Localiza el bloque donde se pinta el autor. Si el mensaje es del usuario actual (`mine === true`), no mostrar avatar (el mensaje va a la derecha sin avatar). Si es ajeno, mostrar avatar antes del nombre:

```tsx
{!mine && (
  <div className="mr-2 shrink-0">
    <Avatar username={message.authorUsername} avatarCode={message.authorAvatarCode} size={24} />
  </div>
)}
```

Ajusta el wrapper flex del mensaje según haga falta.

- [ ] **Step 3: Tests**

Si hay tests para `ChatMessageRow` y `SessionDetailPage`, asegúrate de que siguen pasando. Los fixtures sin `creatorAvatarCode`/`authorAvatarCode` → undefined → fallback letra+color → sigue todo verde.

Run: `cd frontend && npm test`
Expected: suite passing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/sessions/pages/SessionDetailPage.tsx \
        frontend/src/features/sessions/components/ChatMessageRow.tsx
git commit -m "feat(profile): Avatar en SessionDetail header y ChatMessageRow"
```

---

## Task 12: FE — `HelpPage` stub

**Files:**
- Create: `frontend/src/features/help/pages/HelpPage.tsx`
- Modify: `frontend/src/app/router.tsx` — ruta `/help` pública
- Modify: i18n locales — keys `help.*`

- [ ] **Step 1: Crear `HelpPage`**

```tsx
import { useTranslation } from 'react-i18next'

import { SeoHead } from '@/shared/components/SeoHead'

export default function HelpPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SeoHead title={`${t('help.title')} | Match&Play`} description={t('help.intro')} />
      <h1 className="mb-4 font-display text-2xl font-bold sm:text-3xl">{t('help.title')}</h1>
      <p className="mb-4 text-base text-foreground">{t('help.intro')}</p>
      <p className="text-sm text-muted-foreground">
        {t('help.contactEmail')}: <a href="mailto:soporte@matchandplay.com" className="text-red hover:underline">soporte@matchandplay.com</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Ruta**

En `router.tsx`:
```tsx
const HelpPage = lazy(() => import('@/features/help/pages/HelpPage'))
// dentro del array, sin ProtectedRoute:
{ path: '/help', element: <HelpPage /> }
```

- [ ] **Step 3: i18n**

```json
"help": {
  "title": "Ayuda",
  "intro": "Aquí encontrarás respuestas a las preguntas más frecuentes. Esta sección se irá completando.",
  "contactEmail": "Contacto"
}
```

(en.json traducido)

- [ ] **Step 4: TSC + tests + commit**

Run: `cd frontend && npx tsc -p tsconfig.app.json --noEmit` + `npm test`

```bash
git add frontend/src/features/help/ frontend/src/app/router.tsx frontend/src/shared/i18n/locales/
git commit -m "feat(profile): HelpPage stub público"
```

---

## Task 13: FE — Actualizar `MobileMenu` con los items nuevos

**Files:**
- Modify: `frontend/src/app/layouts/MobileMenu.tsx`
- Modify: `frontend/src/app/layouts/__tests__/MobileMenu.test.tsx`
- Modify: `frontend/src/app/layouts/SiteHeader.tsx` — en mobile autenticado, el avatar abre `MobileMenu` (reemplaza al burger)

- [ ] **Step 1: Editar `MobileMenu.tsx`**

Lee el componente actual. Quita el item "Mi perfil disabled próximamente" (si todavía está). Añade los items nuevos:

- "Mi perfil" → link `/profile`, icono `User`, `iconBg="bg-blue-soft"`, `iconColor="text-blue"`.
- "Mis mensajes" → disabled, icono `MessageSquare`, badge "Pronto".
- "Ayuda" → link `/help`, icono `HelpCircle`.
- "Modo oscuro" → toggle inline (reusa el patrón del UserMenu para no duplicar; o un MenuItem simple con switch a la derecha).

Mantén Partidas, Mis partidas, Idioma, Cerrar sesión que ya existen.

- [ ] **Step 2: Tests MobileMenu**

Adapta `MobileMenu.test.tsx`:
- Mi perfil ahora es link activo, no disabled.
- Añadir test para Mis mensajes disabled con pill Pronto.
- Añadir test para Ayuda link.
- Test para toggle dark mode opcional.

- [ ] **Step 3: SiteHeader — avatar como trigger del MobileMenu en mobile autenticado**

Lee el header. La sección mobile actual seguramente es el burger button. Cuando `isAuthenticated`, sustituye el burger por:

```tsx
<button onClick={() => setMobileMenuOpen(true)}>
  <Avatar username={user.username} avatarCode={user.avatarCode} size={32} />
</button>
```

Mantén el burger para anónimos (sigue queriendo el menú con Login/Register).

- [ ] **Step 4: Tests + commit**

Run: `cd frontend && npm test`
Expected: passing.

```bash
git add frontend/src/app/layouts/MobileMenu.tsx \
        frontend/src/app/layouts/__tests__/MobileMenu.test.tsx \
        frontend/src/app/layouts/SiteHeader.tsx
git commit -m "feat(profile): mobile menu añade Mi perfil/Mensajes/Ayuda/Dark mode; avatar abre drawer en mobile autenticado"
```

---

## Task 14: Docs

**Files:**
- Modify: `docs/backend/modules/auth-spec.md` o crear `docs/backend/modules/user-spec.md`
- Modify: `docs/frontend/spec.md` (sección modules) o crear `docs/frontend/modules/profile-spec.md`

- [ ] **Step 1: Backend doc**

Crea o actualiza con:
- Endpoint GET /me/profile (response shape)
- Endpoint PATCH /me/profile (rules de validación)
- Endpoint POST /me/profile/password
- Migración V12 seed avatares
- Cambio en signup: avatar aleatorio
- DTOs enriquecidos con avatarCode en sessions/chat

- [ ] **Step 2: Frontend doc**

Crea `docs/frontend/modules/profile-spec.md` con:
- Estructura de `features/profile/` y `shared/components/Avatar.tsx`
- `<UserMenu>` overview
- ProfilePage Layout C: secciones
- AvatarPicker / BioForm / FavoriteGamesPicker / ChangePasswordForm
- useTheme (dark mode)
- HelpPage stub
- i18n keys nuevas

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs(profile): documentar avatar dropdown, ProfilePage y endpoints /me/profile"
```

---

## Cierre

NO pushear hasta que el usuario lo pida. Cuando lo indique:

1. Verificar `git log --oneline` los commits del sprint.
2. Si hay specs a actualizar adicionales (rare), commit final.
3. `git push origin master` — el auto-mode classifier puede pedir confirmación.

**Tests baseline esperados al final**: BE ~201 (190 + ~11), FE ~165 (152 + 13). Cifras exactas dependen de cuánto crezcan los tests durante implementación.
