package com.matchplay.avatar.repository;

import com.matchplay.avatar.entity.Avatar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvatarRepository extends JpaRepository<Avatar, String> {

    /** Avatares disponibles para asignación inicial: activos y sin coste de puntos. */
    List<Avatar> findByActiveTrueAndRequiredPointsLessThanEqual(int requiredPoints);
}
