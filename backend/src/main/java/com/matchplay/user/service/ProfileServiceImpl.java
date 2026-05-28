package com.matchplay.user.service;

import com.matchplay.security.CurrentUserProvider;
import com.matchplay.user.dto.FavoriteGameSummary;
import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.entity.User;
import com.matchplay.user.entity.UserFavoriteGame;
import com.matchplay.user.repository.UserFavoriteGameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

    private final CurrentUserProvider currentUserProvider;
    private final UserFavoriteGameRepository favoriteRepository;

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
        throw new UnsupportedOperationException("Implemented in T5");
    }

    @Override
    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        throw new UnsupportedOperationException("Implemented in T5");
    }
}
