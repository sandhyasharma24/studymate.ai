package com.studymate.gateway.service;

import com.studymate.gateway.domain.Flashcard;
import com.studymate.gateway.domain.FlashcardDeck;
import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.domain.User;
import com.studymate.gateway.repository.FlashcardDeckRepository;
import com.studymate.gateway.repository.FlashcardRepository;
import com.studymate.gateway.repository.PDFDocumentRepository;
import com.studymate.gateway.repository.UserRepository;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StudyService {

    private final UserRepository userRepository;
    private final PDFDocumentRepository pdfRepository;
    private final FlashcardDeckRepository deckRepository;
    private final FlashcardRepository flashcardRepository;
    private final WebClient aiWebClient;

    public StudyService(UserRepository userRepository,
                        PDFDocumentRepository pdfRepository,
                        FlashcardDeckRepository deckRepository,
                        FlashcardRepository flashcardRepository,
                        WebClient aiWebClient) {
        this.userRepository = userRepository;
        this.pdfRepository = pdfRepository;
        this.deckRepository = deckRepository;
        this.flashcardRepository = flashcardRepository;
        this.aiWebClient = aiWebClient;
    }

    @Transactional
    public Map<String, Object> generateStudyMaterials(String email, Map<String, Object> requestParams) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String topic = (String) requestParams.get("topic");
        UUID pdfId = requestParams.get("pdfId") != null ? UUID.fromString((String) requestParams.get("pdfId")) : null;

        PDFDocument pdf = null;
        if (pdfId != null) {
            pdf = pdfRepository.findByIdAndUser(pdfId, user)
                    .orElseThrow(() -> new RuntimeException("PDF not found"));
        }

        Map<String, Object> aiRequest = new HashMap<>();
        aiRequest.put("topic", topic);
        aiRequest.put("num_flashcards", requestParams.getOrDefault("numFlashcards", 5));
        aiRequest.put("difficulty", requestParams.getOrDefault("difficulty", "medium"));
        aiRequest.put("question_count", requestParams.getOrDefault("questionCount", 3));
        aiRequest.put("question_type", requestParams.getOrDefault("questionType", "mcq"));

        if (pdf != null) {
            aiRequest.put("mode", "pdf");
            aiRequest.put("pdf_collection", pdf.getCollectionName());
        } else {
            aiRequest.put("mode", "general");
        }

        // Call parallel generate endpoint on FastAPI
        Map<String, Object> response = aiWebClient.post()
                .uri("/api/v1/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(aiRequest)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        if (response == null) {
            throw new RuntimeException("Failed to call AI Service for study material generation");
        }

        // Save flashcards as a deck in our DB
        String deckName = "Deck: " + topic + " (" + (pdf != null ? pdf.getFilename() : "General") + ")";
        FlashcardDeck deck = FlashcardDeck.builder()
                .user(user)
                .pdf(pdf)
                .name(deckName)
                .build();
        FlashcardDeck savedDeck = deckRepository.save(deck);

        List<Map<String, Object>> flashcardsData = (List<Map<String, Object>>) response.get("flashcards");
        if (flashcardsData != null) {
            List<Flashcard> cards = flashcardsData.stream().map(item -> Flashcard.builder()
                    .deck(savedDeck)
                    .question((String) item.get("question"))
                    .answer((String) item.get("answer"))
                    .intervalDays(1)
                    .repetitionCount(0)
                    .easeFactor(2.5)
                    .nextReviewDate(LocalDate.now())
                    .status("new")
                    .build()
            ).toList();
            flashcardRepository.saveAll(cards);
        }

        // Prepare combined payload
        Map<String, Object> result = new HashMap<>();
        result.put("summary", response.get("summary"));
        result.put("answer", response.get("answer"));
        result.put("quiz", response.get("quiz"));
        result.put("deckId", savedDeck.getId());
        result.put("retrievedChunks", response.get("retrieved_chunks"));

        return result;
    }
}
