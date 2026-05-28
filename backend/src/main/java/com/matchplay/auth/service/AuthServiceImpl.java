package com.matchplay.auth.service;

import com.matchplay.auth.dto.CurrentUserResponse;
import com.matchplay.auth.dto.LoginRequest;
import com.matchplay.auth.dto.RegisterRequest;
import com.matchplay.auth.exception.EmailAlreadyExistsException;
import com.matchplay.auth.exception.InvalidCredentialsException;
import com.matchplay.auth.exception.UsernameAlreadyExistsException;
import com.matchplay.auth.service.JwtTokenProvider.IssuedToken;
import com.matchplay.auth.service.RefreshTokenService.IssuedRefresh;
import com.matchplay.auth.service.RefreshTokenService.RotatedRefresh;
import com.matchplay.avatar.entity.Avatar;
import com.matchplay.avatar.repository.AvatarRepository;
import com.matchplay.geo.entity.Area;
import com.matchplay.geo.entity.City;
import com.matchplay.geo.entity.Province;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import com.matchplay.geo.repository.AreaRepository;
import com.matchplay.geo.repository.CityRepository;
import com.matchplay.geo.repository.ProvinceRepository;
import com.matchplay.security.CurrentUserProvider;
import com.matchplay.user.entity.Role;
import com.matchplay.user.entity.User;
import com.matchplay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final ProvinceRepository provinceRepository;
    private final CityRepository cityRepository;
    private final AreaRepository areaRepository;
    private final AvatarRepository avatarRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional
    public AuthIssuance register(RegisterRequest request, String userAgent, String ipAddress) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException();
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new UsernameAlreadyExistsException();
        }

        Province province = provinceRepository.findById(request.provinceCode())
                .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.province.not.found", request.provinceCode()));
        City city = cityRepository.findById(request.cityCode())
                .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.city.not.found", request.cityCode()));
        Area area = areaRepository.findById(request.areaCode())
                .orElseThrow(() -> new GeoCodeNotFoundException("error.geo.area.not.found", request.areaCode()));
        List<Avatar> eligibleAvatars = avatarRepository.findByActiveTrueAndRequiredPointsLessThanEqual(0);
        if (eligibleAvatars.isEmpty()) {
            throw new IllegalStateException("No avatars available for signup. Seed the avatars table (V12).");
        }
        Avatar randomAvatar = eligibleAvatars.get(new SecureRandom().nextInt(eligibleAvatars.size()));

        User user = new User();
        user.setEmail(request.email());
        user.setUsername(request.username());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProvince(province);
        user.setCity(city);
        user.setArea(area);
        user.setRole(Role.USER);
        user.setActive(true);
        user.setDeleted(false);
        user.setSelectedAvatar(randomAvatar);
        user.setRatingAvg(BigDecimal.ZERO);
        user.setRatingCount(0);
        user.setRewardPoints(0);
        user.setNoShowCount(0);
        user.setChatEmailNotificationsEnabled(true);
        user.setFavoriteGameEmailNotificationsEnabled(true);

        User saved = userRepository.save(user);
        log.info("User registered: id={}, email={}", saved.getId(), saved.getEmail());

        return issueTokens(saved, userAgent, ipAddress);
    }

    @Override
    @Transactional
    public AuthIssuance login(LoginRequest request, String userAgent, String ipAddress) {
        User user = userRepository.findByEmailAndActiveTrueAndDeletedFalse(request.email())
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        log.info("User login: id={}, email={}", user.getId(), user.getEmail());
        return issueTokens(user, userAgent, ipAddress);
    }

    @Override
    @Transactional
    public RefreshIssuance refresh(String refreshToken, String userAgent, String ipAddress) {
        RotatedRefresh rotated = refreshTokenService.rotate(refreshToken, userAgent, ipAddress);
        IssuedToken access = jwtTokenProvider.issueAccessToken(rotated.user());
        return new RefreshIssuance(
                access.token(),
                access.expiresAt(),
                rotated.issued().token(),
                rotated.issued().expiresAt()
        );
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    @Override
    public CurrentUserResponse getCurrentUser() {
        User user = currentUserProvider.requireCurrentUser();
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getUsernameValue(),
                user.getRole(),
                user.getProvince() != null ? user.getProvince().getCode() : null,
                user.getCity() != null ? user.getCity().getCode() : null,
                user.getArea() != null ? user.getArea().getCode() : null,
                user.getRatingAvg(),
                user.getRewardPoints(),
                user.getSelectedAvatar() != null ? user.getSelectedAvatar().getCode() : null,
                user.getBio()
        );
    }

    private AuthIssuance issueTokens(User user, String userAgent, String ipAddress) {
        IssuedToken access = jwtTokenProvider.issueAccessToken(user);
        IssuedRefresh refresh = refreshTokenService.issue(user, userAgent, ipAddress);
        return new AuthIssuance(
                user.getId(),
                user.getEmail(),
                user.getUsernameValue(),
                user.getRole(),
                access.token(),
                access.expiresAt(),
                refresh.token(),
                refresh.expiresAt()
        );
    }
}
