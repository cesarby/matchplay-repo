package com.matchplay.auth.controller;

import com.matchplay.auth.dto.AuthResponse;
import com.matchplay.auth.dto.CurrentUserResponse;
import com.matchplay.auth.dto.LoginRequest;
import com.matchplay.auth.dto.RefreshResponse;
import com.matchplay.auth.dto.RegisterRequest;
import com.matchplay.auth.exception.RefreshTokenInvalidException;
import com.matchplay.auth.security.RefreshCookieFactory;
import com.matchplay.auth.service.AuthIssuance;
import com.matchplay.auth.service.AuthService;
import com.matchplay.auth.service.RefreshIssuance;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Registro, login, refresh, logout y usuario actual")
public class AuthController {

    private final AuthService authService;
    private final RefreshCookieFactory refreshCookieFactory;

    @PostMapping("/register")
    @Operation(summary = "Registra un usuario nuevo. Emite access en body + refresh en cookie httpOnly")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest http) {
        AuthIssuance issued = authService.register(request, userAgent(http), clientIp(http));
        ResponseCookie cookie = refreshCookieFactory.create(issued.refreshToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(toResponse(issued));
    }

    @PostMapping("/login")
    @Operation(summary = "Inicia sesión. Emite access en body + refresh en cookie httpOnly")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
                                              HttpServletRequest http) {
        AuthIssuance issued = authService.login(request, userAgent(http), clientIp(http));
        ResponseCookie cookie = refreshCookieFactory.create(issued.refreshToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(toResponse(issued));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renueva el access token rotando el refresh (lee la cookie httpOnly)")
    public ResponseEntity<RefreshResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletRequest http) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new RefreshTokenInvalidException();
        }
        RefreshIssuance rotated = authService.refresh(refreshToken, userAgent(http), clientIp(http));
        ResponseCookie cookie = refreshCookieFactory.create(rotated.refreshToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new RefreshResponse(rotated.accessToken(), rotated.accessTokenExpiresAt()));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoca el refresh token actual (lee la cookie httpOnly) y la borra")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        ResponseCookie cleared = refreshCookieFactory.clear();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cleared.toString())
                .build();
    }

    @GetMapping("/me")
    @Operation(summary = "Devuelve el usuario autenticado actual")
    public ResponseEntity<CurrentUserResponse> me() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    private static AuthResponse toResponse(AuthIssuance issued) {
        return new AuthResponse(
                issued.userId(),
                issued.email(),
                issued.username(),
                issued.role(),
                issued.accessToken(),
                issued.accessTokenExpiresAt()
        );
    }

    private static String userAgent(HttpServletRequest request) {
        return request.getHeader(HttpHeaders.USER_AGENT);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
