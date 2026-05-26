package com.matchplay.game.service;

import com.matchplay.ai.AiSummaryClient;
import com.matchplay.ai.GameSummary;
import com.matchplay.game.client.BggClient;
import com.matchplay.game.client.xml.BggThingResult;
import com.matchplay.game.entity.Game;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.mapper.BggGameMapper;
import com.matchplay.game.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Implementación de {@link GameService}.
 *
 * <p>Política de caché: lazy-load por demanda. Cuando otro módulo necesita
 * un juego por {@code bggId} y no está en la tabla {@code games}, se hace
 * un fetch a BGG vía {@link BggClient#getThing(long)}, se mapea con
 * {@link BggGameMapper#toEntity} y se persiste. Las llamadas posteriores
 * son hits locales sin tocar BGG.</p>
 *
 * <p>La relación base ↔ expansión vive en {@code games.base_game_bgg_id}
 * (rellenado al persistir): {@code SELECT ... WHERE base_game_bgg_id = X}
 * basta para listar las expansiones conocidas de X sin tabla auxiliar.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GameServiceImpl implements GameService {

    private final GameRepository gameRepository;
    private final BggClient bggClient;
    private final BggGameMapper bggGameMapper;
    private final AiSummaryClient aiSummaryClient;

    @Override
    @Transactional
    public Game findOrFetch(Long bggId) {
        if (bggId == null) {
            throw new BaseGameNotFoundException(null);
        }
        Optional<Game> cached = gameRepository.findById(bggId);
        if (cached.isPresent()) {
            return cached.get();
        }

        log.info("Game {} not in local cache; fetching from BGG", bggId);
        BggThingResult.Item item = bggClient.getThing(bggId)
                .orElseThrow(() -> new BaseGameNotFoundException(bggId));

        Game entity = bggGameMapper.toEntity(item);
        if (entity.getDescription() != null && !entity.getDescription().isBlank()) {
            GameSummary summary = aiSummaryClient.summarize(entity.getDescription());
            entity.setSummaryEs(summary.es());
            entity.setSummaryEn(summary.en());
        }
        Game saved = gameRepository.save(entity);
        log.info("Game {} persisted locally (isExpansion={}, baseGameBggId={})",
                saved.getBggId(), saved.isExpansion(), saved.getBaseGameBggId());
        return saved;
    }
}
