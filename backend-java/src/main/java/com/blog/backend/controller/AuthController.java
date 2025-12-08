package com.blog.backend.controller;

import com.blog.backend.entity.User;
import com.blog.backend.service.UserService;
import com.blog.backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    // User registration endpoint
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            // Register user
            User registeredUser = userService.register(user);

            // Generate JWT token
            String token = jwtUtil.generateToken(registeredUser.getUsername(), registeredUser.getId());

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            response.put("user", registeredUser);
            response.put("token", token);

            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return new ResponseEntity<>(Map.of("message", e.getMessage()), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("message", "Error registering user"), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // User login endpoint
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        try {
            String username = loginRequest.get("username");
            String password = loginRequest.get("password");

            // Validate input
            if (username == null || password == null) {
                return new ResponseEntity<>(Map.of("message", "Username and password are required"), HttpStatus.BAD_REQUEST);
            }

            // Get user by username
            User user = userService.findByUsername(username);
            if (user == null) {
                return new ResponseEntity<>(Map.of("message", "Invalid username or password"), HttpStatus.UNAUTHORIZED);
            }

            // Check password
            if (!userService.checkPassword(password, user.getPasswordHash())) {
                return new ResponseEntity<>(Map.of("message", "Invalid username or password"), HttpStatus.UNAUTHORIZED);
            }

            // Generate JWT token
            String token = jwtUtil.generateToken(user.getUsername(), user.getId());

            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Login successful");
            response.put("user", user);
            response.put("token", token);

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("message", "Error logging in"), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // User logout endpoint
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // Clear security context
        SecurityContextHolder.clearContext();
        return new ResponseEntity<>(Map.of("message", "Logout successful"), HttpStatus.OK);
    }

    // Get current user endpoint
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            // Get authenticated user
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userService.findByUsername(username);

            return new ResponseEntity<>(user, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(Map.of("message", "Error getting current user"), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
