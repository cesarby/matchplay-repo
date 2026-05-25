package com.matchplay.auth.service;

import com.matchplay.auth.entity.RefreshToken;
import com.matchplay.auth.exception.RefreshTokenInvalidException;
import com.matchplay.auth.repository.RefreshTokenRepository;
import com.matchplay.auth.service.RefreshTokenService.IssuedRefresh;
import com.matchplay.auth.service.RefreshTokenService.RotatedRefresh;
import com.matchplay.user.entity.Role;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.atLeastOnce;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock RefreshTokenRepository repository;
    RefreshTokenService service;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(repository);
        ReflectionTestUtils.setField(service, "refreshTtlMs", 60_000L);
    }

    @Test
    void issue_persistsHashedTokenAndReturnsPlain() {
        User user = userWithId(7L);
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        given(repository.save(any(RefreshToken.class))).willAnswer(inv -> {
            RefreshToken t = inv.getArgument(0);
            t.setId(100L);
            return t;
        });

        IssuedRefresh issued = service.issue(user, "Mozilla", "10.0.0.1");

        assertThat(issued.token()).isNotBlank();
        assertThat(issued.entityId()).isEqualTo(100L);
        then(repository).should().save(captor.capture());
        RefreshToken persisted = captor.getValue();
        assertThat(persisted.getTokenHash()).hasSize(64);
        assertThat(persisted.getTokenHash()).isNotEqualTo(issued.token());
        assertThat(persisted.getExpiresAt()).isAfter(Instant.now());
        assertThat(persisted.isRevoked()).isFalse();
    }

    @Test
    void rotate_validToken_revokesOldAndIssuesNew() {
        User user = userWithId(7L);
        String plain = "original-token-plain";
        RefreshToken existing = active(user, plain);
        existing.setId(50L);

        given(repository.findByTokenHash(RefreshTokenService.hash(plain)))
                .willReturn(Optional.of(existing));
        given(repository.save(any(RefreshToken.class))).willAnswer(inv -> {
            RefreshToken t = inv.getArgument(0);
            if (t.getId() == null) t.setId(51L);
            return t;
        });

        RotatedRefresh rotated = service.rotate(plain, "UA", "1.1.1.1");

        assertThat(rotated.user()).isSameAs(user);
        assertThat(rotated.issued().token()).isNotEqualTo(plain);
        assertThat(existing.isRevoked()).isTrue();
        assertThat(existing.getReplacedByTokenId()).isEqualTo(rotated.issued().entityId());
        then(repository).should(atLeastOnce()).save(any(RefreshToken.class));
    }

    @Test
    void rotate_alreadyRevoked_throws() {
        User user = userWithId(7L);
        String plain = "revoked-plain";
        RefreshToken revoked = active(user, plain);
        revoked.setRevoked(true);
        given(repository.findByTokenHash(RefreshTokenService.hash(plain)))
                .willReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.rotate(plain, "UA", "1.1.1.1"))
                .isInstanceOf(RefreshTokenInvalidException.class);
    }

    @Test
    void rotate_unknown_throws() {
        given(repository.findByTokenHash(any())).willReturn(Optional.empty());
        assertThatThrownBy(() -> service.rotate("ghost", "UA", "1.1.1.1"))
                .isInstanceOf(RefreshTokenInvalidException.class);
    }

    @Test
    void revoke_unknown_noOp() {
        given(repository.findByTokenHash(any())).willReturn(Optional.empty());
        service.revoke("ghost");
        then(repository).shouldHaveNoMoreInteractions();
    }

    @Test
    void revoke_active_marksRevoked() {
        User user = userWithId(7L);
        String plain = "to-revoke";
        RefreshToken token = active(user, plain);
        given(repository.findByTokenHash(RefreshTokenService.hash(plain))).willReturn(Optional.of(token));

        service.revoke(plain);

        assertThat(token.isRevoked()).isTrue();
        then(repository).should().save(token);
    }

    @Test
    void hash_isDeterministic() {
        assertThat(RefreshTokenService.hash("abc")).isEqualTo(RefreshTokenService.hash("abc"));
        assertThat(RefreshTokenService.hash("abc")).isNotEqualTo(RefreshTokenService.hash("abcd"));
    }

    private static User userWithId(Long id) {
        User u = new User();
        u.setId(id);
        u.setRole(Role.USER);
        return u;
    }

    private static RefreshToken active(User user, String plain) {
        RefreshToken t = new RefreshToken();
        t.setUser(user);
        t.setTokenHash(RefreshTokenService.hash(plain));
        t.setExpiresAt(Instant.now().plusSeconds(60));
        t.setRevoked(false);
        return t;
    }
}
