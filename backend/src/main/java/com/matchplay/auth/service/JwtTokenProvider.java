package com.matchplay.auth.service;

import com.matchplay.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Slf4j
@Component
public class JwtTokenProvider {

    private final SecretKey signingKey;
    private final long accessTokenTtlMs;

    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long accessTokenTtlMs) {
        if (secret == null || secret.length() < 64) {
            throw new IllegalStateException("app.jwt.secret must be at least 64 characters");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtlMs = accessTokenTtlMs;
    }

    public IssuedToken issueAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(accessTokenTtlMs);
        String jwt = Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey, Jwts.SIG.HS512)
                .compact();
        return new IssuedToken(jwt, expiresAt);
    }

    public Optional<ParsedToken> parse(String jwt) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(jwt)
                    .getPayload();
            return Optional.of(new ParsedToken(
                    Long.parseLong(claims.getSubject()),
                    claims.get("role", String.class),
                    claims.getExpiration().toInstant()
            ));
        } catch (ExpiredJwtException ex) {
            log.debug("JWT expired");
            return Optional.empty();
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("JWT invalid: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    public record IssuedToken(String token, Instant expiresAt) {}

    public record ParsedToken(Long userId, String role, Instant expiresAt) {}
}
