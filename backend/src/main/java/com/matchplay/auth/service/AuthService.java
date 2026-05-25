package com.matchplay.auth.service;

import com.matchplay.auth.dto.CurrentUserResponse;
import com.matchplay.auth.dto.LoginRequest;
import com.matchplay.auth.dto.RegisterRequest;

public interface AuthService {

    AuthIssuance register(RegisterRequest request, String userAgent, String ipAddress);

    AuthIssuance login(LoginRequest request, String userAgent, String ipAddress);

    RefreshIssuance refresh(String refreshToken, String userAgent, String ipAddress);

    void logout(String refreshToken);

    CurrentUserResponse getCurrentUser();
}
