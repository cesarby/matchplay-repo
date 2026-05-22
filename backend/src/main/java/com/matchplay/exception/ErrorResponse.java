package com.matchplay.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        int status,
        String error,
        String code,
        String message,
        LocalDateTime timestamp,
        String path,
        List<FieldValidationError> fieldErrors
) {
    public static ErrorResponse of(int status, String error, String code, String message, String path) {
        return new ErrorResponse(status, error, code, message, LocalDateTime.now(), path, null);
    }

    public static ErrorResponse ofValidation(String code, String message, String path, List<FieldValidationError> fieldErrors) {
        return new ErrorResponse(400, "Bad Request", code, message, LocalDateTime.now(), path, fieldErrors);
    }
}
