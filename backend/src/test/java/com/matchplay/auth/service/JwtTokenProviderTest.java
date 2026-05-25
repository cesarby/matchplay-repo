package com.matchplay.auth.service;

import com.matchplay.auth.service.JwtTokenProvider.IssuedToken;
import com.matchplay.auth.service.JwtTokenProvider.ParsedToken;
import com.matchplay.user.entity.Role;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-key-at-least-64-characters-long-for-hmac-sha-512-algorithm";

    private final JwtTokenProvider provider = new JwtTokenProvider(SECRET, 60_000);

    @Test
    void constructor_shortSecret_throws() {
        assertThatThrownBy(() -> new JwtTokenProvider("short", 1000))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void issueAndParse_roundTrip_returnsUserIdAndRole() {
        User user = userWithId(42L, Role.USER);
        IssuedToken issued = provider.issueAccessToken(user);

        Optional<ParsedToken> parsed = provider.parse(issued.token());

        assertThat(parsed).isPresent();
        assertThat(parsed.get().userId()).isEqualTo(42L);
        assertThat(parsed.get().role()).isEqualTo("USER");
        assertThat(issued.expiresAt()).isAfter(Instant.now());
    }

    @Test
    void parse_invalidSignature_returnsEmpty() {
        IssuedToken issued = provider.issueAccessToken(userWithId(1L, Role.USER));
        JwtTokenProvider other = new JwtTokenProvider(
                "another-secret-key-with-different-bytes-but-also-64-chars-or-more!!", 60_000);
        assertThat(other.parse(issued.token())).isEmpty();
    }

    @Test
    void parse_tampered_returnsEmpty() {
        IssuedToken issued = provider.issueAccessToken(userWithId(1L, Role.USER));
        String tampered = issued.token() + "x";
        assertThat(provider.parse(tampered)).isEmpty();
    }

    @Test
    void parse_expired_returnsEmpty() throws InterruptedException {
        JwtTokenProvider shortLived = new JwtTokenProvider(SECRET, 1);
        IssuedToken issued = shortLived.issueAccessToken(userWithId(1L, Role.ADMIN));
        Thread.sleep(20);
        assertThat(shortLived.parse(issued.token())).isEmpty();
    }

    private static User userWithId(Long id, Role role) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        return u;
    }
}
