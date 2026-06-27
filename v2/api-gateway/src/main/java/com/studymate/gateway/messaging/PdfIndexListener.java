package com.studymate.gateway.messaging;

import com.studymate.gateway.config.RabbitMQConfig;
import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.repository.PDFDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class PdfIndexListener {

    private static final Logger log = LoggerFactory.getLogger(PdfIndexListener.class);
    private final PDFDocumentRepository pdfRepository;
    private final WebClient aiWebClient;

    public PdfIndexListener(PDFDocumentRepository pdfRepository, WebClient aiWebClient) {
        this.pdfRepository = pdfRepository;
        this.aiWebClient = aiWebClient;
    }

    @RabbitListener(queues = RabbitMQConfig.QUEUE_PDF_INDEX)
    public void handlePdfIndexRequest(Map<String, Object> payload) {
        String pdfIdStr = (String) payload.get("pdf_id");
        String storagePath = (String) payload.get("storage_path");
        String collectionName = (String) payload.get("collection_name");

        log.info("Received PDF index request for PDF ID: {}", pdfIdStr);

        UUID pdfId = UUID.fromString(pdfIdStr);
        Optional<PDFDocument> pdfOpt = pdfRepository.findById(pdfId);
        
        if (pdfOpt.isEmpty()) {
            log.warn("PDF not found for ID: {}", pdfId);
            return;
        }

        PDFDocument pdf = pdfOpt.get();

        try {
            Path path = Paths.get(storagePath);
            if (!Files.exists(path)) {
                throw new RuntimeException("File not found at: " + storagePath);
            }

            byte[] fileBytes = Files.readAllBytes(path);
            String base64Pdf = Base64.getEncoder().encodeToString(fileBytes);

            Map<String, String> aiRequest = new HashMap<>();
            aiRequest.put("pdf_base64", base64Pdf);
            aiRequest.put("collection_name", collectionName);

            log.info("Sending request to AI service for indexing collection: {}", collectionName);

            Map response = aiWebClient.post()
                    .uri("/api/v1/rag/upload")
                    .bodyValue(aiRequest)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            log.info("AI service response: {}", response);

            pdf.setStatus("INDEXED");
            pdfRepository.save(pdf);

        } catch (Exception e) {
            log.error("Failed to index PDF: {}", e.getMessage(), e);
            pdf.setStatus("FAILED");
            pdfRepository.save(pdf);
        }
    }
}
