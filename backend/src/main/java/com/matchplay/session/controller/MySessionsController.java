package com.matchplay.session.controller;

import com.matchplay.session.dto.MySessionsResponse;
import com.matchplay.session.service.MySessionsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/sessions")
@RequiredArgsConstructor
@Tag(name = "Sessions", description = "Mis partidas (auth requerida)")
public class MySessionsController {

    private static final int MAX_PAGE_SIZE = 50;

    private final MySessionsService service;

    @GetMapping
    @Operation(summary = "Listado de mis partidas filtrado por tab")
    public MySessionsResponse findMine(
            @RequestParam(defaultValue = "CREATED") MySessionsService.Tab tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        return service.findMine(tab, PageRequest.of(safePage, safeSize));
    }
}
