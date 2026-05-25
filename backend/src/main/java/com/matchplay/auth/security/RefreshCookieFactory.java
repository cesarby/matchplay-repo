package com.matchplay.auth.security;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@EnableConfigurationProperties(RefreshCookieProperties.class)
public class RefreshCookieFactory {

    private final RefreshCookieProperties props;

    public RefreshCookieFactory(RefreshCookieProperties props) {
        this.props = props;
    }

    public ResponseCookie create(String plainToken) {
        return ResponseCookie.from(props.name(), plainToken)
                .httpOnly(true)
                .secure(props.secure())
                .sameSite(props.sameSite())
                .path(props.path())
                .maxAge(Duration.ofSeconds(props.maxAgeSeconds()))
                .build();
    }

    public ResponseCookie clear() {
        return ResponseCookie.from(props.name(), "")
                .httpOnly(true)
                .secure(props.secure())
                .sameSite(props.sameSite())
                .path(props.path())
                .maxAge(Duration.ZERO)
                .build();
    }

    public String cookieName() {
        return props.name();
    }
}
