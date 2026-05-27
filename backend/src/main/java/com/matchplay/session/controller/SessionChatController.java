package com.matchplay.session.controller;

import com.matchplay.session.dto.CreateMessageRequest;
import com.matchplay.session.dto.SessionMessageResponse;
import com.matchplay.session.service.SessionChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sessions/{id}/messages")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Partidas de juegos de mesa: listar, crear, unirse y gestionar")
public class SessionChatController {

    private final SessionChatService chatService;

    @GetMapping
    @Operation(summary = "Lista los mensajes del chat de la partida (delta opcional con ?since=)")
    public List<SessionMessageResponse> list(
            @PathVariable Long id,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant since
    ) {
        return chatService.list(id, since);
    }

    @PostMapping
    @Operation(summary = "Envía un mensaje al chat (PLAYER o creador)")
    public SessionMessageResponse send(
            @PathVariable Long id,
            @Valid @RequestBody CreateMessageRequest request
    ) {
        return chatService.send(id, request);
    }

    @PostMapping("/mark-read")
    @Operation(summary = "Marca el chat como leído por el caller (idempotente)")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        chatService.markRead(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
