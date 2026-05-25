package com.matchplay.user.repository;

import com.matchplay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndActiveTrueAndDeletedFalse(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    /** Total de cuentas activas (no eliminadas, no desactivadas). Usado por el trust strip público. */
    long countByActiveTrueAndDeletedFalse();

    /** Ciudades distintas con al menos un usuario activo. Usado por el trust strip público. */
    @Query("SELECT COUNT(DISTINCT u.city.code) FROM User u WHERE u.active = true AND u.deleted = false")
    long countDistinctCitiesByActiveTrueAndDeletedFalse();
}
