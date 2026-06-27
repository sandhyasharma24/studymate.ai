package com.studymate.gateway.controller;

import com.studymate.gateway.auth.JwtService;
import com.studymate.gateway.auth.RefreshTokenService;
import com.studymate.gateway.domain.RefreshToken;
import com.studymate.gateway.domain.User;
import com.studymate.gateway.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 6) String password,
            String role
    ) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record RefreshRequest(
            @NotBlank String refreshToken
    ) {}

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            String email,
            String role,
            UUID userId
    ) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body(MapResponse.of("Error: Email is already registered!"));
        }

        String role = request.role() != null ? request.role().toUpperCase() : "STUDENT";
        if (!role.equals("STUDENT") && !role.equals("TEACHER") && !role.equals("ADMIN")) {
            role = "STUDENT";
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(role)
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(MapResponse.of("User registered successfully!"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        if (!userRepository.existsByEmail(request.email())) {
            return ResponseEntity.status(404).body(MapResponse.of("User not found, please register first."));
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401).body(MapResponse.of("Bad credentials. Incorrect password."));
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String accessToken = jwtService.generateToken(user.getEmail(), user.getRole());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        return ResponseEntity.ok(new AuthResponse(
                accessToken,
                refreshToken.getToken(),
                user.getEmail(),
                user.getRole(),
                user.getId()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request) {
        return refreshTokenService.findByToken(request.refreshToken())
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String accessToken = jwtService.generateToken(user.getEmail(), user.getRole());
                    return ResponseEntity.ok(new AuthResponse(
                            accessToken,
                            request.refreshToken(),
                            user.getEmail(),
                            user.getRole(),
                            user.getId()
                    ));
                })
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) java.util.Map<String, String> request,
                                    @RequestHeader(value = "Refresh-Token", required = false) String headerRefreshToken) {
        String tokenToRevoke = null;
        if (request != null && request.containsKey("refreshToken")) {
            tokenToRevoke = request.get("refreshToken");
        } else if (headerRefreshToken != null) {
            tokenToRevoke = headerRefreshToken;
        }

        if (tokenToRevoke != null) {
            refreshTokenService.findByToken(tokenToRevoke)
                    .ifPresent(token -> refreshTokenService.deleteByUser(token.getUser().getId()));
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(MapResponse.of("Logged out successfully!"));
    }

    private static class MapResponse {
        private final String message;
        private MapResponse(String message) { this.message = message; }
        public String getMessage() { return message; }
        public static MapResponse of(String message) { return new MapResponse(message); }
    }
}
