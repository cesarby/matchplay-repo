package com.matchplay.security;

import com.matchplay.exception.UnauthorizedActionException;
import com.matchplay.user.entity.Role;
import com.matchplay.user.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CurrentUserProviderTest {

    private final CurrentUserProvider provider = new CurrentUserProvider();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUser_noContext_returnsEmpty() {
        assertThat(provider.getCurrentUser()).isEmpty();
        assertThat(provider.getCurrentUserId()).isEmpty();
    }

    @Test
    void getCurrentUser_withAuthenticatedUser_returnsUser() {
        User user = userWithId(11L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));

        assertThat(provider.getCurrentUser()).contains(user);
        assertThat(provider.getCurrentUserId()).contains(11L);
        assertThat(provider.requireCurrentUserId()).isEqualTo(11L);
    }

    @Test
    void requireCurrentUser_noAuth_throwsUnauthorized() {
        assertThatThrownBy(provider::requireCurrentUser)
                .isInstanceOf(UnauthorizedActionException.class)
                .hasMessage("error.unauthorized");
    }

    @Test
    void requireCurrentUserId_anonymousAuth_throwsUnauthorized() {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("key", "anon",
                        List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        assertThatThrownBy(provider::requireCurrentUserId)
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    void assertOwner_matching_doesNotThrow() {
        CurrentUserProvider.assertOwner(5L, 5L);
    }

    @Test
    void assertOwner_mismatch_throws() {
        assertThatThrownBy(() -> CurrentUserProvider.assertOwner(5L, 6L))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    void assertOwner_nullOwner_throws() {
        assertThatThrownBy(() -> CurrentUserProvider.assertOwner(null, 5L))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    private static User userWithId(Long id) {
        User u = new User();
        u.setId(id);
        u.setRole(Role.USER);
        u.setActive(true);
        return u;
    }
}
