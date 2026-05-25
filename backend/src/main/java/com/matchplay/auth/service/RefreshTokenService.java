package com.matchplay.auth.service;

import com.matchplay.auth.entity.RefreshToken;
import com.matchplay.auth.exception.RefreshTokenInvalidException;
import com.matchplay.auth.repository.RefreshTokenRepository;
import com.matchplay.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.jwt.refresh-expiration-ms}")
    private long refreshTtlMs;

    public IssuedRefresh issue(User user, String userAgent, String ipAddress) {
        String plain = generatePlainToken();
        return persist(user, plain, userAgent, ipAddress, null);
    }

    public RotatedRefresh rotate(String presentedPlainToken, String userAgent, String ipAddress) {
        RefreshToken existing = repository.findByTokenHash(hash(presentedPlainToken))
                .orElseThrow(RefreshTokenInvalidException::new);

        if (!existing.isActive()) {
            log.warn("Reused or expired refresh token: id={}, userId={}",
                    existing.getId(), existing.getUser().getId());
            throw new RefreshTokenInvalidException();
        }

        User user = existing.getUser();
        String newPlain = generatePlainToken();
        IssuedRefresh issued = persist(user, newPlain, userAgent, ipAddress, null);

        existing.setRevoked(true);
        existing.setRevokedAt(LocalDateTime.now());
        existing.setReplacedByTokenId(issued.entityId());
        repository.save(existing);

        return new RotatedRefresh(issued, user);
    }

    public void revoke(String presentedPlainToken) {
        repository.findByTokenHash(hash(presentedPlainToken)).ifPresent(token -> {
            if (!token.isRevoked()) {
                token.setRevoked(true);
                token.setRevokedAt(LocalDateTime.now());
                repository.save(token);
            }
        });
    }

    public User validateAndGetUser(String presentedPlainToken) {
        RefreshToken token = repository.findByTokenHash(hash(presentedPlainToken))
                .orElseThrow(RefreshTokenInvalidException::new);
        if (!token.isActive()) {
            throw new RefreshTokenInvalidException();
        }
        return token.getUser();
    }

    private IssuedRefresh persist(User user, String plain, String userAgent, String ipAddress, Long replacedById) {
        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(hash(plain));
        entity.setExpiresAt(Instant.now().plusMillis(refreshTtlMs));
        entity.setRevoked(false);
        entity.setUserAgent(userAgent);
        entity.setIpAddress(ipAddress);
        entity.setReplacedByTokenId(replacedById);
        RefreshToken saved = repository.save(entity);
        return new IssuedRefresh(plain, saved.getExpiresAt(), saved.getId());
    }

    private String generatePlainToken() {
        byte[] random = new byte[32];
        secureRandom.nextBytes(random);
        return UUID.randomUUID() + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    }

    static String hash(String plain) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(plain.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    public record IssuedRefresh(String token, Instant expiresAt, Long entityId) {}

    public record RotatedRefresh(IssuedRefresh issued, User user) {}
}
