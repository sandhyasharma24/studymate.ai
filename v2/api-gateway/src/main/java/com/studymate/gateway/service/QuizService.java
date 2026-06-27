package com.studymate.gateway.service;

import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.domain.QuizAttempt;
import com.studymate.gateway.domain.User;
import com.studymate.gateway.repository.PDFDocumentRepository;
import com.studymate.gateway.repository.QuizAttemptRepository;
import com.studymate.gateway.repository.UserRepository;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class QuizService {

    private final QuizAttemptRepository attemptRepository;
    private final UserRepository userRepository;
    private final PDFDocumentRepository pdfRepository;
    private final WebClient aiWebClient;

    public QuizService(QuizAttemptRepository attemptRepository,
                       UserRepository userRepository,
                       PDFDocumentRepository pdfRepository,
                       WebClient aiWebClient) {
        this.attemptRepository = attemptRepository;
        this.userRepository = userRepository;
        this.pdfRepository = pdfRepository;
        this.aiWebClient = aiWebClient;
    }

    public List<QuizAttempt> getAttempts(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return attemptRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Transactional
    public List<Map<String, Object>> generateQuiz(String email, String topic, int count, String difficulty, String type, UUID pdfId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("topic", topic);
        requestBody.put("question_count", count);
        requestBody.put("difficulty", difficulty.toLowerCase());
        requestBody.put("question_type", type.toLowerCase());

        if (pdfId != null) {
            PDFDocument pdf = pdfRepository.findByIdAndUser(pdfId, user)
                    .orElseThrow(() -> new RuntimeException("PDF not found"));
            requestBody.put("mode", "pdf");
            requestBody.put("pdf_collection", pdf.getCollectionName());
        } else {
            requestBody.put("mode", "general");
        }

        Map<String, Object> response = aiWebClient.post()
                .uri("/api/v1/quiz/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        if (response == null) {
            throw new RuntimeException("Failed to generate quiz from AI service");
        }

        return (List<Map<String, Object>>) response.get("quiz");
    }

    @Transactional
    public QuizAttempt recordAttempt(String email, String topic, int score, int total, String difficulty, String type, UUID pdfId, int timeSpent) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PDFDocument pdf = null;
        if (pdfId != null) {
            pdf = pdfRepository.findByIdAndUser(pdfId, user).orElse(null);
        }

        QuizAttempt attempt = QuizAttempt.builder()
                .user(user)
                .pdf(pdf)
                .topic(topic)
                .score(score)
                .totalQuestions(total)
                .difficulty(difficulty)
                .type(type)
                .timeSpentSeconds(timeSpent)
                .build();

        return attemptRepository.save(attempt);
    }
}
