-- V8: elimina la tabla game_expansions.
--
-- Era una tabla M:N (base_game_id, expansion_game_id, sort_order) que existía
-- desde el baseline V1 pero quedaba redundante con el modelo final: la columna
-- `games.base_game_bgg_id` (añadida en V7) codifica ya la misma relación
-- 1-base ↔ N-expansiones sin duplicación.
--
-- Para "qué expansiones conocemos del juego base X" basta:
--   SELECT * FROM games WHERE base_game_bgg_id = X;
-- (índice idx_games_base_game_bgg_id ya existe desde V7).
--
-- La columna sort_order tampoco se usaba en runtime (siempre 0), así que se
-- pierde sin impacto.

DROP TABLE IF EXISTS game_expansions;
