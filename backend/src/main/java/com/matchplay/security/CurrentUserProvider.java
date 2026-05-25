package com.matchplay.security;

import com.matchplay.exception.UnauthorizedActionException;
import com.matchplay.user.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CurrentUserProvider {

    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return Optional.empty();
        }
        if (auth.getPrincipal() instanceof User user) {
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public Optional<Long> getCurrentUserId() {
        return getCurrentUser().map(User::getId);
    }

    public User requireCurrentUser() {
        return getCurrentUser()
                .orElseThrow(() -> new UnauthorizedActionException("error.unauthorized"));
    }

    public Long requireCurrentUserId() {
        return getCurrentUserId()
                .orElseThrow(() -> new UnauthorizedActionException("error.unauthorized"));
    }

    public static void assertOwner(Long resourceOwnerId, Long currentUserId) {
        if (resourceOwnerId == null || !resourceOwnerId.equals(currentUserId)) {
            throw new UnauthorizedActionException("error.unauthorized");
        }
    }
}
