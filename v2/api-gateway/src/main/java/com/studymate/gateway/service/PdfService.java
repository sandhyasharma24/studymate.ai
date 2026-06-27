package com.studymate.gateway.service;

import com.studymate.gateway.config.RabbitMQConfig;
import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.domain.User;
import com.studymate.gateway.repository.PDFDocumentRepository;
import com.studymate.gateway.repository.UserRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PdfService {

    @Value("${app.pdf.storage-dir}")
    private String storageDir;

    private final PDFDocumentRepository pdfRepository;
    private final UserRepository userRepository;
    private final RabbitTemplate rabbitTemplate;

    public PdfService(PDFDocumentRepository pdfRepository,
                      UserRepository userRepository,
                      RabbitTemplate rabbitTemplate) {
        this.pdfRepository = pdfRepository;
        this.userRepository = userRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public List<PDFDocument> getPdfs(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return pdfRepository.findByUser(user);
    }

    public PDFDocument getPdf(UUID id, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return pdfRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new RuntimeException("PDF not found or access denied"));
    }

    @Transactional
    public PDFDocument uploadPdf(String email, MultipartFile file) throws IOException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Create storage directory if not exists
        Path dirPath = Paths.get(storageDir);
        if (!Files.exists(dirPath)) {
            Files.createDirectories(dirPath);
        }

        String uniqueFilename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = dirPath.resolve(uniqueFilename);
        
        // Save file to disk
        Files.createDirectories(filePath.getParent());
        Files.copy(file.getInputStream(), filePath);

        String collectionName = "collection_" + user.getId().toString().replace("-", "") 
                + "_" + UUID.randomUUID().toString().substring(0, 8);

        PDFDocument pdf = PDFDocument.builder()
                .user(user)
                .filename(file.getOriginalFilename())
                .storagePath(filePath.toAbsolutePath().toString())
                .fileSize(file.getSize())
                .collectionName(collectionName)
                .status("UPLOADED")
                .build();

        PDFDocument savedPdf = pdfRepository.save(pdf);
        triggerIndexing(savedPdf.getId(), email);
        return savedPdf;
    }

    @Transactional
    public void deletePdf(UUID id, String email) {
        PDFDocument pdf = getPdf(id, email);
        
        // Delete disk file
        try {
            Files.deleteIfExists(Paths.get(pdf.getStoragePath()));
        } catch (IOException e) {
            // Log warning but proceed with DB deletion
        }

        pdfRepository.delete(pdf);
    }

    @Transactional
    public void triggerIndexing(UUID id, String email) {
        PDFDocument pdf = getPdf(id, email);
        pdf.setStatus("INDEXING");
        pdfRepository.save(pdf);

        // Send task payload to RabbitMQ
        Map<String, Object> messagePayload = new HashMap<>();
        messagePayload.put("pdf_id", pdf.getId().toString());
        messagePayload.put("storage_path", pdf.getStoragePath());
        messagePayload.put("collection_name", pdf.getCollectionName());

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_PDF_INDEX,
                RabbitMQConfig.ROUTING_KEY_PDF_INDEX,
                messagePayload
        );
    }
}
