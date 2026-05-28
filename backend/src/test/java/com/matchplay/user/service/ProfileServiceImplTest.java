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
