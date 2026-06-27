package com.studymate.gateway.controller;

import com.studymate.gateway.domain.ChatMessage;
import com.studymate.gateway.domain.ChatSession;
import com.studymate.gateway.service.ChatService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    private String getAuthenticatedUserEmail() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public record SessionCreateRequest(
            String title,
            UUID pdfId
    ) {}

    public record MessageRequest(
            String content
    ) {}

    @PostMapping({"/sessions", "/sessions/"})
    public ResponseEntity<ChatSession> createSession(@RequestBody SessionCreateRequest request) {
        String email = getAuthenticatedUserEmail();
        ChatSession session = chatService.createSession(email, request.title(), request.pdfId());
        return ResponseEntity.ok(session);
    }

    @GetMapping({"/sessions", "/sessions/"})
    public ResponseEntity<List<ChatSession>> getSessions() {
        String email = getAuthenticatedUserEmail();
        List<ChatSession> sessions = chatService.getSessions(email);
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<List<ChatMessage>> getMessages(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        List<ChatMessage> messages = chatService.getMessages(id, email);
        return ResponseEntity.ok(messages);
    }

    @PostMapping(value = "/sessions/{id}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> sendMessageStream(@PathVariable UUID id, @RequestBody MessageRequest request) {
        String email = getAuthenticatedUserEmail();
        return chatService.streamChatResponse(id, email, request.content());
    }
}
