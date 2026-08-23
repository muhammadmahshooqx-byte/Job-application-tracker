package com.mahshooq.application_tracker.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mahshooq.application_tracker.dto.AuthResponse;
import com.mahshooq.application_tracker.dto.LoginRequest;
import com.mahshooq.application_tracker.dto.RegisterRequest;
import com.mahshooq.application_tracker.model.User;
import com.mahshooq.application_tracker.repository.UserRepository;
import com.mahshooq.application_tracker.security.JwtUtil;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().body("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword())
        );
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return ResponseEntity.ok(new AuthResponse(token));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        var userOpt = userRepository.findByUsername(request.getUsername());

        if (userOpt.isEmpty() ||
            !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body("Invalid username or password");
        }

        String token = jwtUtil.generateToken(userOpt.get().getUsername(), userOpt.get().getRole());
        return ResponseEntity.ok(new AuthResponse(token));
    }
}