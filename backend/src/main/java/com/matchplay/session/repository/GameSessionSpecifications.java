package com.matchplay.session.repository;

import com.matchplay.session.dto.SessionSearchCriteria;
import com.matchplay.session.entity.GameSession;
import org.springframework.data.jpa.domain.Specification;

/**
 * Specifications dinámicas para filtrar partidas en el listado público.
 *
 * <p>Cada filtro se compone solo si su valor está presente. El resultado
 * final es un {@link Specification} apto para
 * {@code GameSessionRepository.findAll(spec, pageable)}.</p>
 */
public final class GameSessionSpecifications {

    private GameSessionSpecifications() {}

    public static Specification<GameSession> withCriteria(SessionSearchCriteria criteria) {
        return Specification
                .where(byProvince(criteria.provinceCode()))
                .and(byCity(criteria.cityCode()))
                .and(byArea(criteria.areaCode()))
                .and(byGame(criteria.gameId()))
                .and(scheduledFrom(criteria.scheduledFrom()))
                .and(scheduledTo(criteria.scheduledTo()))
                .and(byStatus(criteria.status()));
    }

    private static Specification<GameSession> byProvince(String provinceCode) {
        if (provinceCode == null || provinceCode.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("city").get("province").get("code"), provinceCode);
    }

    private static Specification<GameSession> byCity(String cityCode) {
        if (cityCode == null || cityCode.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("city").get("code"), cityCode);
    }

    private static Specification<GameSession> byArea(String areaCode) {
        if (areaCode == null || areaCode.isBlank()) return null;
        return (root, query, cb) -> cb.equal(root.get("area").get("code"), areaCode);
    }

    private static Specification<GameSession> byGame(Long gameId) {
        if (gameId == null) return null;
        return (root, query, cb) -> cb.equal(root.get("baseGame").get("bggId"), gameId);
    }

    private static Specification<GameSession> scheduledFrom(java.time.Instant from) {
        if (from == null) return null;
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("scheduledAt"), from);
    }

    private static Specification<GameSession> scheduledTo(java.time.Instant to) {
        if (to == null) return null;
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("scheduledAt"), to);
    }

    private static Specification<GameSession> byStatus(com.matchplay.session.entity.SessionStatus status) {
        if (status == null) return null;
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
}
