package com.matchplay.user.service;

import com.matchplay.avatar.entity.Avatar;
import com.matchplay.avatar.repository.AvatarRepository;
import com.matchplay.game.entity.Game;
import com.matchplay.game.exception.GameNotFoundException;
import com.matchplay.game.repository.GameRepository;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.user.dto.FavoriteGameSummary;
import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.entity.User;
import com.matchplay.user.entity.UserFavoriteGame;
import com.matchplay.user.exception.InvalidAvatarCodeException;
import com.matchplay.user.exception.TooManyFavoritesException;
import com.matchplay.user.exception.WrongPasswordException;
import com.matchplay.user.repository.UserFavoriteGameRepository;
import com.matchplay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private static final int BIO_MAX_LENGTH = 280;
    private static final int MAX_FAVORITES = 5;

    private final CurrentUserProvider currentUserProvider;
    private final UserFavoriteGameRepository favoriteRepository;
    private final AvatarRepository avatarRepository;
    private final GameRepository gameRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

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
                Game game = gameRepository.findById(bggId)
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
}
