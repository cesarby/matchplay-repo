package com.matchplay.user.repository;

import com.matchplay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndActiveTrueAndDeletedFalse(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);
}
