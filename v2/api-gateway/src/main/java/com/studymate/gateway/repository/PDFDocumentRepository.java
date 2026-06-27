package com.studymate.gateway.repository;

import com.studymate.gateway.domain.PDFDocument;
import com.studymate.gateway.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PDFDocumentRepository extends JpaRepository<PDFDocument, UUID> {
    List<PDFDocument> findByUser(User user);
    Optional<PDFDocument> findByIdAndUser(UUID id, User user);
}
