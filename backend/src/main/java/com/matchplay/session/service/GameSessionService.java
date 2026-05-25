package com.matchplay.session.service;

import com.matchplay.session.dto.ChangeStatusRequest;
import com.matchplay.session.dto.CreateSessionRequest;
import com.matchplay.session.dto.SessionDetailResponse;
import com.matchplay.session.dto.SessionPlayerResponse;
import com.matchplay.session.dto.SessionSearchCriteria;
import com.matchplay.session.dto.SessionSummaryResponse;
import com.matchplay.session.dto.UpdateSessionRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface GameSessionService {

    Page<SessionSummaryResponse> search(SessionSearchCriteria criteria, Pageable pageable);

    SessionDetailResponse findById(Long sessionId);

    SessionDetailResponse create(CreateSessionRequest request);

    SessionDetailResponse update(Long sessionId, UpdateSessionRequest request);

    SessionDetailResponse changeStatus(Long sessionId, ChangeStatusRequest request);

    SessionDetailResponse join(Long sessionId);

    SessionDetailResponse leave(Long sessionId);

    List<SessionPlayerResponse> listPlayers(Long sessionId);
}
