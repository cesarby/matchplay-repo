package com.matchplay.user.service;

import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;

public interface ProfileService {
    UserProfileResponse getCurrent();
    UserProfileResponse update(UpdateProfileRequest request);
    void changePassword(String currentPassword, String newPassword);
}
