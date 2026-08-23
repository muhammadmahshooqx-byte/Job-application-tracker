package com.mahshooq.application_tracker.repository;

import com.mahshooq.application_tracker.model.Application;
import com.mahshooq.application_tracker.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByUser(User user);
    List<Application> findByUserAndStatus(User user, Application.Status status);
}