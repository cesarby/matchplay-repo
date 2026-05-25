package com.matchplay.config;

import com.matchplay.security.CurrentUserProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<Long> auditorAware(CurrentUserProvider currentUserProvider) {
        return () -> {
            Optional<Long> id = currentUserProvider.getCurrentUserId();
            return id;
        };
    }
}
