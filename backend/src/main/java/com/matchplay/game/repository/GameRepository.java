package com.matchplay.game.repository;

import com.matchplay.game.entity.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Acceso a la tabla {@code games}. La PK es {@code bgg_id} (Long).
 *
 * <p>El proyecto cachea juegos de BoardGameGeek en local; este repo expone
 * lo mínimo para que otros módulos (sessions, etc.) puedan referenciar un
 * juego ya cacheado.</p>
 */
@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
}
