package com.matchplay.session.service;

import com.matchplay.session.dto.MySessionsResponse;
import org.springframework.data.domain.Pageable;

public interface MySessionsService {

    enum Tab { CREATED, PLAYER, WAITLIST, HISTORY }

    /**
     * Lista las partidas del usuario actual filtradas por tab.
     * <ul>
     *   <li>{@code CREATED}: creadas por mí, status activo, ASC scheduledAt.</li>
     *   <li>{@code PLAYER}: donde soy PLAYER, status activo, ASC scheduledAt.</li>
     *   <li>{@code WAITLIST}: donde soy WAITLIST, status activo, ASC scheduledAt.</li>
     *   <li>{@code HISTORY}: creadas por mí, status terminal, DESC scheduledAt.</li>
     * </ul>
     *
     * <p>La respuesta SIEMPRE incluye los 4 counts.</p>
     */
    MySessionsResponse findMine(Tab tab, Pageable pageable);
}
