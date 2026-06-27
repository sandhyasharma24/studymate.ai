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
public class FlashcardService {

    private final FlashcardRepository flashcardRepository;
    private final FlashcardDeckRepository deckRepository;
    private final UserRepository userRepository;
    private final PDFDocumentRepository pdfRepository;
    private final WebClient aiWebClient;

    public FlashcardService(FlashcardRepository flashcardRepository,
                            FlashcardDeckRepository deckRepository,
                            UserRepository userRepository,
                            PDFDocumentRepository pdfRepository,
                            WebClient aiWebClient) {
        this.flashcardRepository = flashcardRepository;
        this.deckRepository = deckRepository;
        this.userRepository = userRepository;
        this.pdfRepository = pdfRepository;
        this.aiWebClient = aiWebClient;
    }

    public List<FlashcardDeck> getDecks(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return deckRepository.findByUser(user);
    }

    public FlashcardDeck getDeck(UUID deckId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return deckRepository.findByIdAndUser(deckId, user)
                .orElseThrow(() -> new RuntimeException("Deck not found or access denied"));
    }

    public List<Flashcard> getCardsInDeck(UUID deckId, String email) {
        FlashcardDeck deck = getDeck(deckId, email);
        return flashcardRepository.findByDeck(deck);
    }

    public List<Flashcard> getDueCards(UUID deckId, String email) {
        FlashcardDeck deck = getDeck(deckId, email);
        return flashcardRepository.findDueCardsInDeck(deck, LocalDate.now());
    }

    public long getDueCardsCount(UUID userId) {
        return flashcardRepository.countDueCardsForUser(userId, LocalDate.now());
    }

    @Transactional
    public FlashcardDeck createDeck(String email, String name, UUID pdfId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PDFDocument pdf = null;
        if (pdfId != null) {
            pdf = pdfRepository.findByIdAndUser(pdfId, user)
                    .orElseThrow(() -> new RuntimeException("PDF not found"));
        }

        FlashcardDeck deck = FlashcardDeck.builder()
                .user(user)
                .pdf(pdf)
                .name(name)
                .build();

        return deckRepository.save(deck);
    }

    @Transactional
    public List<Flashcard> generateFlashcardsForDeck(UUID deckId, String email, String topic, int count, String difficulty) {
        FlashcardDeck deck = getDeck(deckId, email);
        
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.putAll(Map.of(
            "topic", topic,
            "num_flashcards", count,
            "difficulty", difficulty.toLowerCase()
        ));
        
        if (deck.getPdf() != null) {
            requestBody.put("mode", "pdf");
            requestBody.put("pdf_collection", deck.getPdf().getCollectionName());
        } else {
            requestBody.put("mode", "general");
        }

        // Call FastAPI generate flashcards endpoint (or parse it from generate)
        List<Map<String, Object>> responseList = aiWebClient.post()
                .uri("/api/v1/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .map(res -> (List<Map<String, Object>>) res.get("flashcards"))
                .block();

        if (responseList == null) {
            throw new RuntimeException("Failed to generate flashcards from AI service");
        }

        List<Flashcard> flashcards = responseList.stream().map(item -> Flashcard.builder()
                .deck(deck)
                .question((String) item.get("question"))
                .answer((String) item.get("answer"))
                .intervalDays(1)
                .repetitionCount(0)
                .easeFactor(2.5)
                .nextReviewDate(LocalDate.now())
                .status("new")
                .build()
        ).toList();

        return flashcardRepository.saveAll(flashcards);
    }

    @Transactional
    public Flashcard submitReview(UUID cardId, String email, int quality) {
        // Validate user owns the card
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Flashcard card = flashcardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        if (!card.getDeck().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied to flashcard");
        }

        if (quality < 0 || quality > 5) {
            throw new IllegalArgumentException("Quality score must be between 0 and 5");
        }

        // SM-2 Spaced Repetition Algorithm
        int interval;
        int repetitions = card.getRepetitionCount();
        double ease = card.getEaseFactor();

        if (quality >= 3) {
            if (repetitions == 0) {
                interval = 1;
            } else if (repetitions == 1) {
                interval = 6;
            } else {
                interval = (int) Math.round(card.getIntervalDays() * ease);
            }
            repetitions++;
        } else {
            repetitions = 0;
            interval = 1;
        }

        ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (ease < 1.3) {
            ease = 1.3;
        }

        card.setRepetitionCount(repetitions);
        card.setIntervalDays(interval);
        card.setEaseFactor(ease);
        card.setLastReviewDate(LocalDate.now());
        card.setNextReviewDate(LocalDate.now().plusDays(interval));
        
        if (repetitions == 0) {
            card.setStatus("learning");
        } else if (repetitions > 4) {
            card.setStatus("graduated");
        } else {
            card.setStatus("review");
        }

        return flashcardRepository.save(card);
    }

    public Map<String, Object> exportAnki(UUID deckId, String email) {
        FlashcardDeck deck = getDeck(deckId, email);
        List<Flashcard> cards = flashcardRepository.findByDeck(deck);

        List<Map<String, String>> cardsPayload = cards.stream().map(c -> Map.of(
                "question", c.getQuestion(),
                "answer", c.getAnswer()
        )).toList();

        Map<String, Object> requestBody = Map.of(
                "deck_name", deck.getName(),
                "cards", cardsPayload
        );

        return aiWebClient.post()
                .uri("/api/v1/flashcards/export/anki")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
    }
}
