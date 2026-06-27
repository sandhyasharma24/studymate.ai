package com.studymate.gateway.service;

import com.studymate.gateway.domain.ChatMessage;
import com.studymate.gateway.domain.ChatSession;
import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.domain.User;
import com.studymate.gateway.repository.ChatMessageRepository;
import com.studymate.gateway.repository.ChatSessionRepository;
import com.studymate.gateway.repository.PDFDocumentRepository;
import com.studymate.gateway.repository.UserRepository;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ChatService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PDFDocumentRepository pdfRepository;
    private final WebClient aiWebClient;

    public ChatService(ChatSessionRepository sessionRepository,
                       ChatMessageRepository messageRepository,
                       UserRepository userRepository,
                       PDFDocumentRepository pdfRepository,
                       WebClient aiWebClient) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.pdfRepository = pdfRepository;
        this.aiWebClient = aiWebClient;
    }

    public List<ChatSession> getSessions(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return sessionRepository.findByUserOrderByUpdatedAtDesc(user);
    }

    public ChatSession getSession(UUID sessionId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return sessionRepository.findByIdAndUser(sessionId, user)
                .orElseThrow(() -> new RuntimeException("Chat session not found"));
    }

    public List<ChatMessage> getMessages(UUID sessionId, String email) {
        ChatSession session = getSession(sessionId, email);
        return messageRepository.findBySessionOrderByCreatedAtAsc(session);
    }

    @Transactional
    public ChatSession createSession(String email, String title, UUID pdfId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        PDFDocument pdf = null;
        if (pdfId != null) {
            pdf = pdfRepository.findByIdAndUser(pdfId, user)
                    .orElseThrow(() -> new RuntimeException("PDF not found"));
        }

        ChatSession session = ChatSession.builder()
                .user(user)
                .pdf(pdf)
                .title(title)
                .build();

        return sessionRepository.save(session);
    }

    @Transactional
    public ChatMessage saveUserMessage(ChatSession session, String content) {
        ChatMessage message = ChatMessage.builder()
                .session(session)
                .role("USER")
                .content(content)
                .build();
        ChatMessage saved = messageRepository.save(message);
        
        session.setUpdatedAt(ZonedDateTime.now());
        sessionRepository.save(session);
        return saved;
    }

    @Transactional
    public ChatMessage saveAssistantMessage(ChatSession session, String content) {
        ChatMessage message = ChatMessage.builder()
                .session(session)
                .role("ASSISTANT")
                .content(content)
                .build();
        ChatMessage saved = messageRepository.save(message);

        session.setUpdatedAt(ZonedDateTime.now());
        sessionRepository.save(session);
        return saved;
    }

    public Flux<String> streamChatResponse(UUID sessionId, String email, String query) {
        ChatSession session = getSession(sessionId, email);
        saveUserMessage(session, query);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("query", query);

        if (session.getPdf() != null) {
            requestBody.put("mode", "pdf");
            requestBody.put("collection_name", session.getPdf().getCollectionName());
        } else {
            requestBody.put("mode", "general");
            requestBody.put("collection_name", null);
        }

        StringBuilder responseBuilder = new StringBuilder();

        return aiWebClient.post()
                .uri("/api/v1/rag/ask/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToFlux(String.class)
                .doOnNext(responseBuilder::append)
                .doOnComplete(() -> {
                    // Save complete response to DB
                    saveAssistantMessage(session, responseBuilder.toString());
                });
    }
}
