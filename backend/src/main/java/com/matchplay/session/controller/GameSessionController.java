package com.matchplay.session.controller;

import com.matchplay.session.dto.ChangeStatusRequest;
import com.matchplay.session.dto.CreateSessionRequest;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionPlayerResponse;
import com.matchplay.session.dto.SessionSearchCriteria;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.UpdateSessionRequest;
import com.matchplay.session.entity.SessionStatus;
import com.matchplay.session.service.GameSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.List;

/**
 * REST endpoints para partidas (game sessions) — Fase 1 (core MVP).
 *
 * <p>Lectura pública: listado y detalle. Escritura: requiere autenticación
 * (configurada en {@code SecurityConfig}).</p>
 */
@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Partidas de juegos de mesa: listar, crear, unirse y gestionar")
public class GameSessionController {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final GameSessionService sessionService;

    @GetMapping
    @Operation(summary = "Listado paginado y filtrado de partidas")
    public Page<SessionSummaryResponse> search(
            @RequestParam(required = false) String provinceCode,
            @RequestParam(required = false) String cityCode,
            @RequestParam(required = false) String areaCode,
            @RequestParam(required = false) Long gameId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant scheduledFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant scheduledTo,
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by("scheduledAt").ascending());

        SessionSearchCriteria criteria = new SessionSearchCriteria(
                provinceCode, cityCode, areaCode, gameId, scheduledFrom, scheduledTo, status);
        return sessionService.search(criteria, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle de una partida (incluye participantes)")
    public SessionDetailResponse findById(@PathVariable Long id) {
        return sessionService.findById(id);
    }

    @GetMapping("/{id}/players")
    @Operation(summary = "Listado de participantes de una partida")
    public List<SessionPlayerResponse> listPlayers(@PathVariable Long id) {
        return sessionService.listPlayers(id);
    }

    @PostMapping
    @Operation(summary = "Crear una partida (creator = usuario autenticado)")
    public ResponseEntity<SessionDetailResponse> create(
            @Valid @RequestBody CreateSessionRequest request,
            UriComponentsBuilder uriBuilder
    ) {
        SessionDetailResponse created = sessionService.create(request);
        URI location = uriBuilder.path("/api/v1/sessions/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualización parcial (solo creador)")
    public SessionDetailResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSessionRequest request
    ) {
        return sessionService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cambio manual de estado (cerrar inscripciones / cancelar)")
    public SessionDetailResponse changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeStatusRequest request
    ) {
        return sessionService.changeStatus(id, request);
    }

    @PostMapping("/{id}/join")
    @Operation(summary = "Unirse a una partida")
    public SessionDetailResponse join(@PathVariable Long id) {
        return sessionService.join(id);
    }

    @DeleteMapping("/{id}/join")
    @Operation(summary = "Salirse de una partida")
    public SessionDetailResponse leave(@PathVariable Long id) {
        return sessionService.leave(id);
    }
}
