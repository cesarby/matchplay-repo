package com.matchplay.exception;

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
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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

    @ExceptionHandler(UnauthorizedActionException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedAction(
            UnauthorizedActionException ex, HttpServletRequest request, Locale locale) {
        String message = resolve(ex.getMessageKey(), ex.getArgs(), locale);
        log.warn("Unauthorized action attempt: path={}", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorResponse.of(403, "Forbidden", ex.getMessageKey(), message, request.getRequestURI()));
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
