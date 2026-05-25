package com.matchplay.game.service;

import com.matchplay.game.dto.GameSearchResponse;
import com.matchplay.game.dto.GameSearchType;
import com.matchplay.common.dto.PageResponse;

public interface GameSearchService {

    PageResponse<GameSearchResponse> search(String query,
                                            GameSearchType type,
                                            Long baseGameId,
                                            int page,
                                            int size);
}
