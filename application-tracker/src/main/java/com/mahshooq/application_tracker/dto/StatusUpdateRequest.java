package com.mahshooq.application_tracker.dto;

import com.mahshooq.application_tracker.model.Application;

import jakarta.validation.constraints.NotNull;

public class StatusUpdateRequest {

    @NotNull(message = "Status is required")
    private Application.Status status;

    public Application.Status getStatus() {
        return status;
    }

    public void setStatus(Application.Status status) {
        this.status = status;
    }
}
