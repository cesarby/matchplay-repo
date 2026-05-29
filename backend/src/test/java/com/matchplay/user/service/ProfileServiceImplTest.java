package com.matchplay.user.service;

import com.matchplay.avatar.entity.Avatar;
import com.matchplay.avatar.repository.AvatarRepository;
import com.matchplay.game.entity.Game;
import com.matchplay.game.service.GameService;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.entity.Province;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.geo.repository.ProvinceRepository;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.entity.User;
import com.matchplay.user.entity.UserFavoriteGame;
import com.matchplay.user.exception.TooManyFavoritesException;
import com.matchplay.user.exception.WrongPasswordException;
import com.matchplay.user.repository.UserFavoriteGameRepository;
import com.matchplay.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ProfileServiceImplTest {

    @Mock CurrentUserProvider currentUserProvider;
    @Mock UserFavoriteGameRepository favoriteRepository;
    @Mock AvatarRepository avatarRepository;
    @Mock GameService gameService;
    @Mock ProvinceRepository provinceRepository;
    @Mock CityRepository cityRepository;
    @Mock AreaRepository areaRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock UserRepository userRepository;

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
        Province p = new Province();
        p.setCode("28");
        p.setName("Madrid");
        u.setProvince(p);
        City c = new City();
        c.setCode("28079");
        c.setName("Madrid");
        u.setCity(c);
        Area ar = new Area();
        ar.setCode("28079001");
        ar.setName("Centro");
        u.setArea(ar);
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

    @Test
    void update_changesAvatarCode() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        Avatar newAv = new Avatar();
        newAv.setCode("avatar_15");
        given(avatarRepository.findById("avatar_15")).willReturn(Optional.of(newAv));
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        UserProfileResponse out = service.update(new UpdateProfileRequest("avatar_15", null, null, null, null, null));

        assertThat(out.avatarCode()).isEqualTo("avatar_15");
        verify(userRepository).save(user);
    }

    @Test
    void update_changesBio() {
        User user = userWith("alice", "alice@a.es", "avatar_01", "old bio");
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        UserProfileResponse out = service.update(new UpdateProfileRequest(null, "new bio", null, null, null, null));

        assertThat(out.bio()).isEqualTo("new bio");
        verify(userRepository).save(user);
    }

    @Test
    void update_truncatesBioTo280Chars_serverSide() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());
        String longBio = "x".repeat(500);

        UserProfileResponse out = service.update(new UpdateProfileRequest(null, longBio, null, null, null, null));

        assertThat(out.bio()).hasSize(280);
    }

    @Test
    void update_replacesFavorites() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        Game g1 = new Game();
        g1.setBggId(11L);
        g1.setName("Game 1");
        Game g2 = new Game();
        g2.setBggId(22L);
        g2.setName("Game 2");
        given(gameService.findOrFetch(11L)).willReturn(g1);
        given(gameService.findOrFetch(22L)).willReturn(g2);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        service.update(new UpdateProfileRequest(null, null, List.of(11L, 22L), null, null, null));

        verify(favoriteRepository).deleteByUserId(42L);
        ArgumentCaptor<UserFavoriteGame> captor = ArgumentCaptor.forClass(UserFavoriteGame.class);
        verify(favoriteRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(f -> f.getGame().getBggId())
                .containsExactly(11L, 22L);
    }

    @Test
    void update_tooManyFavorites_throws() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);

        assertThatThrownBy(() -> service.update(
                new UpdateProfileRequest(null, null, List.of(1L, 2L, 3L, 4L, 5L, 6L), null, null, null)))
                .isInstanceOf(TooManyFavoritesException.class);

        verify(favoriteRepository, never()).deleteByUserId(any());
        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void getCurrent_returnsLocationCodes() {
        User user = userWith("alice", "alice@a.es", "avatar_07", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        UserProfileResponse out = service.getCurrent();

        assertThat(out.provinceCode()).isEqualTo("28");
        assertThat(out.cityCode()).isEqualTo("28079");
        assertThat(out.areaCode()).isEqualTo("28079001");
    }

    @Test
    void update_changesLocationCodes() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        Province newP = new Province();
        newP.setCode("08");
        newP.setName("Barcelona");
        City newC = new City();
        newC.setCode("08019");
        newC.setName("Barcelona");
        Area newA = new Area();
        newA.setCode("08019001");
        newA.setName("Eixample");
        given(provinceRepository.findById("08")).willReturn(Optional.of(newP));
        given(cityRepository.findById("08019")).willReturn(Optional.of(newC));
        given(areaRepository.findById("08019001")).willReturn(Optional.of(newA));

        UserProfileResponse out = service.update(
                new UpdateProfileRequest(null, null, null, "08", "08019", "08019001"));

        assertThat(out.provinceCode()).isEqualTo("08");
        assertThat(out.cityCode()).isEqualTo("08019");
        assertThat(out.areaCode()).isEqualTo("08019001");
        verify(userRepository).save(user);
    }

    @Test
    void update_unknownProvinceCode_throws() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(provinceRepository.findById("99")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(
                new UpdateProfileRequest(null, null, null, "99", null, null)))
                .isInstanceOf(GeoCodeNotFoundException.class);
    }

    @Test
    void update_blankLocationCodes_ignored() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(favoriteRepository.findByUserIdOrderByCreatedAtAsc(42L)).willReturn(List.of());

        // Blanks no deben disparar lookup — la entity es nullable=false y no se
        // puede "limpiar" la ubicación, así que ignoramos.
        UserProfileResponse out = service.update(
                new UpdateProfileRequest(null, null, null, "", "", ""));

        assertThat(out.provinceCode()).isEqualTo("28");
        verify(provinceRepository, never()).findById(any());
    }

    @Test
    void changePassword_correct_persistsNewHash() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        user.setPasswordHash("old-hash");
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(passwordEncoder.matches("currentPass", "old-hash")).willReturn(true);
        given(passwordEncoder.encode("newPass123")).willReturn("new-hash");

        service.changePassword("currentPass", "newPass123");

        assertThat(user.getPasswordHash()).isEqualTo("new-hash");
        verify(userRepository).save(user);
    }

    @Test
    void changePassword_wrongCurrent_throws() {
        User user = userWith("alice", "alice@a.es", "avatar_01", null);
        user.setPasswordHash("old-hash");
        given(currentUserProvider.requireCurrentUser()).willReturn(user);
        given(passwordEncoder.matches("badPass", "old-hash")).willReturn(false);

        assertThatThrownBy(() -> service.changePassword("badPass", "newPass123"))
                .isInstanceOf(WrongPasswordException.class);

        verify(userRepository, never()).save(any());
    }
}
