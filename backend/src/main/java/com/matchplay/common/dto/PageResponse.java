package com.matchplay.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Envoltorio común de paginación para todas las APIs.
 *
 * <p>Estabiliza la forma JSON del response paginado (la shape de {@link Page}
 * de Spring incluye campos internos como {@code pageable} que no queremos
 * exponer). Tiene dos factorías:</p>
 *
 * <ul>
 *   <li>{@link #of(List, int, int)} — para fuentes en memoria (ej. resultados
 *       de la API de BGG cargados de golpe).</li>
 *   <li>{@link #fromPage(Page)} — para conversiones desde Spring Data.</li>
 * </ul>
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {

    /** Crea un PageResponse a partir de la lista completa en memoria. */
    public static <T> PageResponse<T> of(List<T> allItems, int page, int size) {
        int totalElements = allItems.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int from = Math.min(page * size, totalElements);
        int to = Math.min(from + size, totalElements);
        List<T> slice = allItems.subList(from, to);
        boolean last = page + 1 >= totalPages;
        return new PageResponse<>(slice, page, size, totalElements, totalPages, last);
    }

    /** Convierte un {@link Page} de Spring Data al envoltorio canónico. */
    public static <T> PageResponse<T> fromPage(Page<T> springPage) {
        return new PageResponse<>(
                springPage.getContent(),
                springPage.getNumber(),
                springPage.getSize(),
                springPage.getTotalElements(),
                springPage.getTotalPages(),
                springPage.isLast()
        );
    }
}
