package com.matchplay.game.dto;

import java.util.List;

public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {

    public static <T> PageResponse<T> of(List<T> allItems, int page, int size) {
        int totalElements = allItems.size();
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        int from = Math.min(page * size, totalElements);
        int to = Math.min(from + size, totalElements);
        List<T> slice = allItems.subList(from, to);
        boolean last = page + 1 >= totalPages;
        return new PageResponse<>(slice, page, size, totalElements, totalPages, last);
    }
}
