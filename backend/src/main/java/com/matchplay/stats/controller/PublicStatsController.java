package com.matchplay.stats.controller;

import com.matchplay.stats.dto.PublicStatsResponse;
import com.matchplay.stats.service.PublicStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/stats")
@RequiredArgsConstructor
@Tag(name = "Stats", description = "Métricas agregadas públicas de la comunidad")
public class PublicStatsController {

    private static final Duration CACHE_DURATION = Duration.ofMinutes(5);

    private final PublicStatsService statsService;

    @GetMapping("/public")
    @Operation(summary = "Devuelve agregados públicos (partidas activas, jugadores, ciudades)")
    public ResponseEntity<PublicStatsResponse> getPublicStats() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(CACHE_DURATION).cachePublic())
                .body(statsService.getPublicStats());
    }
}
