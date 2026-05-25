package com.matchplay.game.controller;

import com.matchplay.game.dto.GameSearchResponse;
import com.matchplay.game.dto.GameSearchType;
import com.matchplay.game.dto.PageResponse;
import com.matchplay.game.service.GameSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
@Tag(name = "Games", description = "Búsqueda de juegos y expansiones en BoardGameGeek")
public class GameSearchController {

    private final GameSearchService gameSearchService;

    @GetMapping
    @Operation(summary = "Busca juegos base o expansiones contra la API de BGG")
    public ResponseEntity<PageResponse<GameSearchResponse>> search(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "type", required = false, defaultValue = "BASE") GameSearchType type,
            @RequestParam(value = "baseGameId", required = false) Long baseGameId,
            @RequestParam(value = "page", required = false, defaultValue = "0") int page,
            @RequestParam(value = "size", required = false, defaultValue = "20") int size
    ) {
        PageResponse<GameSearchResponse> result = gameSearchService.search(query, type, baseGameId, page, size);
        return ResponseEntity.ok(result);
    }
}
