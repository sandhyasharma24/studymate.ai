package com.studymate.gateway.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studymate.gateway.config.RateLimitConfig;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final LettuceBasedProxyManager<String> proxyManager;
    private final JwtService jwtService;
    private final RateLimitConfig rateLimitConfig;
    private final ObjectMapper objectMapper;

    public RateLimitFilter(LettuceBasedProxyManager<String> proxyManager,
                           JwtService jwtService,
                           RateLimitConfig rateLimitConfig,
                           ObjectMapper objectMapper) {
        this.proxyManager = proxyManager;
        this.jwtService = jwtService;
        this.rateLimitConfig = rateLimitConfig;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String key = resolveKey(request);

        BucketConfiguration config = BucketConfiguration.builder()
                .addLimit(Bandwidth.simple(rateLimitConfig.getCapacity(), Duration.ofSeconds(rateLimitConfig.getDurationSeconds())))
                .build();

        Bucket bucket = proxyManager.builder().build(key, config);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Rate limit exceeded. You are allowed " + rateLimitConfig.getCapacity() + " requests per " + rateLimitConfig.getDurationSeconds() + " seconds."
            );
            problemDetail.setTitle("Too Many Requests");
            problemDetail.setType(URI.create("https://studymate.com/errors/too-many-requests"));
            problemDetail.setProperty("timestamp", Instant.now());

            response.getWriter().write(objectMapper.writeValueAsString(problemDetail));
        }
    }

    private String resolveKey(HttpServletRequest request) {
        final String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7);
            try {
                String username = jwtService.extractUsername(jwt);
                if (username != null) {
                    return "rate-limit:user:" + username;
                }
            } catch (Exception e) {
                // Ignore parsing errors and fallback to IP
            }
        }

        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return "rate-limit:ip:" + ip;
    }
}
