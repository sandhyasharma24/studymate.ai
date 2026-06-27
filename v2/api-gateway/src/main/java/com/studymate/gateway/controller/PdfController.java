package com.studymate.gateway.controller;

import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.service.PdfService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pdfs")
public class PdfController {

    private final PdfService pdfService;

    public PdfController(PdfService pdfService) {
        this.pdfService = pdfService;
    }

    private String getAuthenticatedUserEmail() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @PostMapping("/upload")
    public ResponseEntity<PDFDocument> upload(@RequestParam("file") MultipartFile file) throws IOException {
        String email = getAuthenticatedUserEmail();
        PDFDocument pdf = pdfService.uploadPdf(email, file);
        return ResponseEntity.ok(pdf);
    }

    @GetMapping
    public ResponseEntity<List<PDFDocument>> list() {
        String email = getAuthenticatedUserEmail();
        List<PDFDocument> pdfs = pdfService.getPdfs(email);
        return ResponseEntity.ok(pdfs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PDFDocument> get(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        PDFDocument pdf = pdfService.getPdf(id, email);
        return ResponseEntity.ok(pdf);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        pdfService.deletePdf(id, email);
        return ResponseEntity.ok(Map.of("message", "PDF deleted successfully"));
    }

    @PostMapping("/{id}/index")
    public ResponseEntity<?> triggerIndexing(@PathVariable UUID id) {
        String email = getAuthenticatedUserEmail();
        pdfService.triggerIndexing(id, email);
        return ResponseEntity.ok(Map.of("message", "PDF indexing triggered"));
    }
}
