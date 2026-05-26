package com.matchplay.exception;

import com.matchplay.auth.exception.EmailAlreadyExistsException;
import com.matchplay.auth.exception.InvalidCredentialsException;
import com.matchplay.auth.exception.RateLimitedException;
import com.matchplay.auth.exception.RefreshTokenInvalidException;
import com.matchplay.auth.exception.UsernameAlreadyExistsException;
import com.matchplay.game.exception.BaseGameNotFoundException;
import com.matchplay.game.exception.BggUnavailableException;
import com.matchplay.game.exception.InvalidGameSearchException;
import com.matchplay.geo.exception.GeoCodeNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;
import java.util.Locale;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSessionNotFound(
            SessionNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Session not found: id={}", ex.getResourceId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "Not Found", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(
            UserNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("User not found: id={}", ex.getResourceId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "Not Found", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionFullException.class)
    public ResponseEntity<ErrorResponse> handleSessionFull(
            SessionFullException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Join attempt to full session: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionAlreadyJoinedException.class)
    public ResponseEntity<ErrorResponse> handleAlreadyJoined(
            SessionAlreadyJoinedException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionJoinOwnException.class)
    public ResponseEntity<ErrorResponse> handleSessionJoinOwn(
            SessionJoinOwnException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionScheduledInPastException.class)
    public ResponseEntity<ErrorResponse> handleSessionScheduledPast(
            SessionScheduledInPastException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionStatusTransitionException.class)
    public ResponseEntity<ErrorResponse> handleSessionStatusTransition(
            SessionStatusTransitionException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionMaxPlayersBelowCurrentException.class)
    public ResponseEntity<ErrorResponse> handleSessionMaxBelow(
            SessionMaxPlayersBelowCurrentException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionMaxPlayersAboveGameException.class)
    public ResponseEntity<ErrorResponse> handleSessionMaxAboveGame(
            SessionMaxPlayersAboveGameException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionMaxPlayersBelowGameMinException.class)
    public ResponseEntity<ErrorResponse> handleSessionMaxBelowGameMin(
            SessionMaxPlayersBelowGameMinException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionExpansionWrongBaseException.class)
    public ResponseEntity<ErrorResponse> handleSessionExpansionWrongBase(
            SessionExpansionWrongBaseException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionExpansionNotExpansionException.class)
    public ResponseEntity<ErrorResponse> handleSessionExpansionNotExpansion(
            SessionExpansionNotExpansionException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionGuestsExceedMaxException.class)
    public ResponseEntity<ErrorResponse> handleSessionGuestsExceedMax(
            SessionGuestsExceedMaxException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(SessionEmptyCannotCloseException.class)
    public ResponseEntity<ErrorResponse> handleSessionEmptyCannotClose(
            SessionEmptyCannotCloseException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(UnauthorizedActionException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedAction(
            UnauthorizedActionException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Unauthorized action attempt: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "Forbidden", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "Unauthorized", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(RefreshTokenInvalidException.class)
    public ResponseEntity<ErrorResponse> handleRefreshInvalid(
            RefreshTokenInvalidException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "Unauthorized", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleEmailDup(
            EmailAlreadyExistsException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<ErrorResponse> handleUsernameDup(
            UsernameAlreadyExistsException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(409, "Conflict", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(RateLimitedException.class)
    public ResponseEntity<ErrorResponse> handleRateLimited(
            RateLimitedException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(ErrorResponse.of(429, "Too Many Requests", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(GeoCodeNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleGeoNotFound(
            GeoCodeNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Geo code not found: key={}", ex.getMessageKey());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "Not Found", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request, Locale locale) {
        Throwable root = ex.getMostSpecificCause();
        if (root instanceof MatchplayException me) {
            String message = resolve(me.getMessageKey(), me.getArgs(), locale);
            return ResponseEntity.badRequest()
                    .body(ErrorResponse.of(400, "Bad Request", me.getMessageKey(), message, request.getRequestURI()));
        }
        String message = resolve("error.validation", null, locale);
        log.warn("Param type mismatch: param={}, value={}", ex.getName(), ex.getValue());
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", "error.validation", message, request.getRequestURI()));
    }

    @ExceptionHandler(InvalidGameSearchException.class)
    public ResponseEntity<ErrorResponse> handleInvalidGameSearch(
            InvalidGameSearchException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Invalid game search: key={}, path={}", ex.getMessageKey(), request.getRequestURI());
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(BaseGameNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleBaseGameNotFound(
            BaseGameNotFoundException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Base game not found in BGG: bggId={}", ex.getBggId());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(404, "Not Found", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(BggUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleBggUnavailable(
            BggUnavailableException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.error("BGG API unavailable: path={}", request.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ErrorResponse.of(502, "Bad Gateway", ex.getMessageKey(), message, request.getRequestURI()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(
            MissingServletRequestParameterException ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.validation", null, locale);
        log.warn("Missing required parameter: name={}, path={}", ex.getParameterName(), request.getRequestURI());
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(400, "Bad Request", "error.validation", message, request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request, Locale locale) {
        List<FieldValidationError> fieldErrors = extractFieldErrors(ex.getBindingResult(), locale);
        String message = resolve("error.validation", null, locale);
        log.warn("Validation failed on {}: {} field errors", request.getRequestURI(), fieldErrors.size());
        return ResponseEntity.badRequest()
                .body(ErrorResponse.ofValidation("error.validation", message, request.getRequestURI(), fieldErrors));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.unauthorized", null, locale);
        log.warn("Access denied: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "Forbidden", "error.unauthorized", message, request.getRequestURI()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(
            AuthenticationException ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.auth.token.invalid", null, locale);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorResponse.of(401, "Unauthorized", "error.auth.token.invalid", message, request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request, Locale locale) {
        String message = resolve("error.internal", null, locale);
        log.error("Unexpected error: path={}", request.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(500, "Internal Server Error", "error.internal", message, request.getRequestURI()));
    }

    private String resolve(String key, Object[] args, Locale locale) {
        return messageSource.getMessage(key, args, locale);
    }

    private List<FieldValidationError> extractFieldErrors(BindingResult result, Locale locale) {
        return result.getFieldErrors().stream()
                .map(fe -> new FieldValidationError(fe.getField(), fe.getDefaultMessage()))
                .toList();
    }
}
