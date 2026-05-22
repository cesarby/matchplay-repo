package com.matchplay.exception;

public class ResourceNotFoundException extends MatchplayException {

    private final Long resourceId;

    public ResourceNotFoundException(String messageKey, Long resourceId) {
        super(messageKey, resourceId);
        this.resourceId = resourceId;
    }

    public Long getResourceId() { return resourceId; }
}
