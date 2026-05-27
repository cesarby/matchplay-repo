package com.matchplay.game.controller;

import com.matchplay.game.dto.GameDetailResponse;
import com.matchplay.game.entity.Game;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.repository.GameRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
@Tag(name = "Games — detalle", description = "Lectura pública de juegos cacheados")
public class GameDetailController {

    private final GameRepository gameRepository;

    @GetMapping("/{bggId}")
    @Operation(summary = "Detalle de un juego (lectura del caché local; 404 si no está cacheado)")
    public GameDetailResponse findById(@PathVariable Long bggId) {
        Game g = gameRepository.findById(bggId)
                .orElseThrow(() -> new BaseGameNotFoundException(bggId));
        String lang = LocaleContextHolder.getLocale().getLanguage();
        String summary = "en".equals(lang) ? g.getSummaryEn() : g.getSummaryEs();
        return new GameDetailResponse(
                g.getBggId(),
                g.getName(),
                g.getYearPublished(),
                g.getMinPlayers(),
                g.getMaxPlayers(),
                g.getPlayingTime(),
                g.getThumbnailUrl(),
                g.getImageUrl(),
                g.isExpansion(),
                g.getBaseGameBggId(),
                summary
        );
    }
}
