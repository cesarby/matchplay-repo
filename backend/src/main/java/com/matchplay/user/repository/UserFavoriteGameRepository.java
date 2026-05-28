package com.matchplay.user.repository;

import com.matchplay.user.entity.UserFavoriteGame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserFavoriteGameRepository extends JpaRepository<UserFavoriteGame, Long> {

    /** Favoritos del usuario ordenados por fecha de añadido (asc). */
    List<UserFavoriteGame> findByUserIdOrderByCreatedAtAsc(Long userId);

    /** Borra todos los favoritos del usuario — paso previo al replace en PATCH /me. */
    void deleteByUserId(Long userId);

    long countByUserId(Long userId);
}
