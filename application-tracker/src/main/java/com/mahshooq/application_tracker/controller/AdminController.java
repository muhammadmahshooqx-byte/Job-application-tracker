package com.mahshooq.application_tracker.controller;

import com.mahshooq.application_tracker.model.Application;
import com.mahshooq.application_tracker.model.User;
import com.mahshooq.application_tracker.repository.ApplicationRepository;
import com.mahshooq.application_tracker.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    public AdminController(UserRepository userRepository, ApplicationRepository applicationRepository) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> users() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/applications")
    public ResponseEntity<List<Application>> applications() {
        return ResponseEntity.ok(applicationRepository.findAll());
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStats> stats() {
        List<Application> applications = applicationRepository.findAll();
        Map<Application.Status, Long> byStatus = new EnumMap<>(Application.Status.class);
        for (Application.Status status : Application.Status.values()) {
            byStatus.put(status, applications.stream()
                    .filter(application -> application.getStatus() == status)
                    .count());
        }
        return ResponseEntity.ok(new AdminStats(userRepository.count(), applications.size(), byStatus));
    }

    public record AdminStats(long totalUsers, long totalApplications, Map<Application.Status, Long> byStatus) {
    }
}