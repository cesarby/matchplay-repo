package com.matchplay.user.controller;

import com.matchplay.user.dto.UpdateProfileRequest;
import com.matchplay.user.dto.UserProfileResponse;
import com.matchplay.user.service.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "Perfil del usuario actual")
public class MeController {

    private final ProfileService profileService;

    @GetMapping
    @Operation(summary = "Perfil completo del usuario actual")
    public UserProfileResponse getCurrent() {
        return profileService.getCurrent();
    }

    @PatchMapping
    @Operation(summary = "Actualizar perfil (avatar / bio / juegos favoritos)")
    public UserProfileResponse update(@Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(request);
    }
}
