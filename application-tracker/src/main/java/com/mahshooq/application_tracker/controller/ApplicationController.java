package com.mahshooq.application_tracker.controller;

import com.mahshooq.application_tracker.model.Application;
import com.mahshooq.application_tracker.model.User;
import com.mahshooq.application_tracker.repository.ApplicationRepository;
import com.mahshooq.application_tracker.repository.UserRepository;
import com.mahshooq.application_tracker.dto.ErrorResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;

    public ApplicationController(ApplicationRepository applicationRepository,
                                 UserRepository userRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
    }

    @PostMapping
    public ResponseEntity<Application> create(@Valid @RequestBody Application application,
                                               Authentication authentication) {
        User user = findCurrentUser(authentication);
        application.setId(null);
        application.setUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationRepository.save(application));
    }

    @GetMapping
    public ResponseEntity<List<Application>> list(Authentication authentication) {
        User user = findCurrentUser(authentication);
        return ResponseEntity.ok(applicationRepository.findByUser(user));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<?> listByStatus(@PathVariable String status,
                                           Authentication authentication) {
        Application.Status applicationStatus;
        try {
            applicationStatus = Application.Status.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Invalid application status: " + status));
        }

        User user = findCurrentUser(authentication);
        return ResponseEntity.ok(applicationRepository.findByUserAndStatus(user, applicationStatus));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody Application application,
                                    Authentication authentication) {
        User user = findCurrentUser(authentication);
        return applicationRepository.findById(id)
                .filter(existing -> existing.getUser().getId().equals(user.getId()))
                .map(existing -> {
                    existing.setCompanyName(application.getCompanyName());
                    existing.setJobRole(application.getJobRole());
                    existing.setStatus(application.getStatus());
                    existing.setDateApplied(application.getDateApplied());
                    existing.setNotes(application.getNotes());
                    return ResponseEntity.ok(applicationRepository.save(existing));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       Authentication authentication) {
        User user = findCurrentUser(authentication);
        return applicationRepository.findById(id)
                .filter(application -> application.getUser().getId().equals(user.getId()))
                .map(application -> {
                    applicationRepository.delete(application);
                    return ResponseEntity.noContent().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private User findCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }
}
