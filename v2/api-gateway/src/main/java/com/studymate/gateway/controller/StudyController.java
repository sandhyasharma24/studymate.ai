package com.studymate.gateway.controller;

import com.studymate.gateway.domain.Flashcard;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.studymate.gateway.domain.FlashcardDeck;
import com.studymate.gateway.domain.QuizAttempt;
import com.studymate.gateway.domain.StudyPlan;
import com.studymate.gateway.service.FlashcardService;
import com.studymate.gateway.service.QuizService;
import com.studymate.gateway.service.StudyPlanService;
import com.studymate.gateway.service.StudyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/study")
public class StudyController {

    private final StudyService studyService;
    private final FlashcardService flashcardService;
    private final QuizService quizService;
    private final StudyPlanService studyPlanService;

    public StudyController(StudyService studyService,
                           FlashcardService flashcardService,
                           QuizService quizService,
                           StudyPlanService studyPlanService) {
        this.studyService = studyService;
        this.flashcardService = flashcardService;
        this.quizService = quizService;
        this.studyPlanService = studyPlanService;
    }

    private String getAuthenticatedUserEmail() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public record GenerateStudyRequest(
            String topic,
            String pdfId,
            Integer numFlashcards,
            String difficulty,
            Integer questionCount,
            String questionType
    ) {}

    public record ReviewRequest(
            UUID cardId,
            Integer quality
    ) {}

    public record GenerateQuizRequest(
            String topic,
            Integer count,
            String difficulty,
            String type,
            UUID pdfId
    ) {}

    public record SubmitQuizRequest(
            String topic,
            Integer score,
            Integer total,
            String difficulty,
            String type,
            UUID pdfId,
            Integer timeSpentSeconds
    ) {}

    public record CreatePlanRequest(
            String title,
            @JsonAlias({"examDate", "exam_date"}) LocalDate examDate,
            List<String> topics,
            @JsonAlias({"hoursPerDay", "hours_per_day"}) Integer hoursPerDay,
            @JsonAlias({"masteryLevels", "mastery_levels"}) Map<String, Double> masteryLevels,
            @JsonAlias({"pdfCollection", "pdf_collection"}) String pdfCollection
    ) {}

    // === GENERATE ALL ===
    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generate(@RequestBody GenerateStudyRequest request) {
        String email = getAuthenticatedUserEmail();
        Map<String, Object> params = Map.of(
                "topic", request.topic(),
                "numFlashcards", request.numFlashcards() != null ? request.numFlashcards() : 5,
                "difficulty", request.difficulty() != null ? request.difficulty() : "medium",
                "questionCount", request.questionCount() != null ? request.questionCount() : 3,
                "questionType", request.questionType() != null ? request.questionType() : "mcq"
        );
        
        // Mutably construct map to allow null pdfId
        Map<String, Object> paramsMutable = new java.util.HashMap<>(params);
        if (request.pdfId() != null) {
            paramsMutable.put("pdfId", request.pdfId());
        }

        Map<String, Object> result = studyService.generateStudyMaterials(email, paramsMutable);
        return ResponseEntity.ok(result);
    }

    // === FLASHCARDS ===
    @GetMapping("/flashcards/decks")
    public ResponseEntity<List<FlashcardDeck>> getDecks() {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(flashcardService.getDecks(email));
    }

    @GetMapping("/flashcards/decks/{id}")
    public ResponseEntity<FlashcardDeck> getDeck(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(flashcardService.getDeck(id, email));
    }

    @GetMapping("/flashcards/decks/{id}/cards")
    public ResponseEntity<List<Flashcard>> getCards(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(flashcardService.getCardsInDeck(id, email));
    }

    @GetMapping("/flashcards/decks/{id}/due")
    public ResponseEntity<List<Flashcard>> getDueCards(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(flashcardService.getDueCards(id, email));
    }

    @PostMapping("/flashcards/decks/{id}/review")
    public ResponseEntity<Flashcard> submitReview(@PathVariable UUID id, @RequestBody ReviewRequest request) {
        String email = getAuthenticatedUserEmail();
        Flashcard card = flashcardService.submitReview(request.cardId(), email, request.quality());
        return ResponseEntity.ok(card);
    }

    @PostMapping("/flashcards/decks/{id}/export/anki")
    public ResponseEntity<Map<String, Object>> exportAnki(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        Map<String, Object> result = flashcardService.exportAnki(id, email);
        return ResponseEntity.ok(result);
    }

    // === QUIZZES ===
    @GetMapping("/quizzes/attempts")
    public ResponseEntity<List<QuizAttempt>> getAttempts() {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(quizService.getAttempts(email));
    }

    @PostMapping("/quizzes")
    public ResponseEntity<List<Map<String, Object>>> generateQuiz(@RequestBody GenerateQuizRequest request) {
        String email = getAuthenticatedUserEmail();
        List<Map<String, Object>> quiz = quizService.generateQuiz(
                email,
                request.topic(),
                request.count() != null ? request.count() : 3,
                request.difficulty() != null ? request.difficulty() : "medium",
                request.type() != null ? request.type() : "mcq",
                request.pdfId()
        );
        return ResponseEntity.ok(quiz);
    }

    @PostMapping("/quizzes/submit")
    public ResponseEntity<QuizAttempt> submitQuiz(@RequestBody SubmitQuizRequest request) {
        String email = getAuthenticatedUserEmail();
        QuizAttempt attempt = quizService.recordAttempt(
                email,
                request.topic(),
                request.score(),
                request.total(),
                request.difficulty(),
                request.type(),
                request.pdfId(),
                request.timeSpentSeconds() != null ? request.timeSpentSeconds() : 0
        );
        return ResponseEntity.ok(attempt);
    }

    @PostMapping("/quizzes/{id}/submit")
    public ResponseEntity<QuizAttempt> submitQuizWithId(@PathVariable UUID id, @RequestBody SubmitQuizRequest request) {
        return submitQuiz(request);
    }

    // === STUDY PLANS ===
    @GetMapping("/plans")
    public ResponseEntity<List<StudyPlan>> getPlans() {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(studyPlanService.getPlans(email));
    }

    public record DiagnosticRequest(
            List<String> topics,
            String pdfCollection
    ) {}

    @GetMapping("/plans/{id}")
    public ResponseEntity<StudyPlan> getPlan(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        return ResponseEntity.ok(studyPlanService.getPlan(id, email));
    }

    @PostMapping("/plans/diagnostic")
    public ResponseEntity<Map<String, Object>> generateDiagnostic(@RequestBody DiagnosticRequest request) {
        Map<String, Object> response = studyPlanService.generateDiagnostic(request.topics(), request.pdfCollection());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/plans")
    public ResponseEntity<StudyPlan> createPlan(@RequestBody CreatePlanRequest request) {
        String email = getAuthenticatedUserEmail();
        StudyPlan plan = studyPlanService.createStudyPlan(
                email,
                request.title(),
                request.examDate(),
                request.topics(),
                request.hoursPerDay(),
                request.masteryLevels(),
                request.pdfCollection()
        );
        return ResponseEntity.ok(plan);
    }

    @DeleteMapping("/plans/{id}")
    public ResponseEntity<?> deletePlan(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        studyPlanService.deletePlan(id, email);
        return ResponseEntity.ok(Map.of("message", "Study plan deleted successfully"));
    }
}
