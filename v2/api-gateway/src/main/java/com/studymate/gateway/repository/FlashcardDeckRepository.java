package com.studymate.gateway.repository;

import com.studymate.gateway.domain.FlashcardDeck;
import com.studymate.gateway.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FlashcardDeckRepository extends JpaRepository<FlashcardDeck, UUID> {
    List<FlashcardDeck> findByUser(User user);
    Optional<FlashcardDeck> findByIdAndUser(UUID id, User user);
}
