package com.studymate.gateway.repository;

import com.studymate.gateway.domain.Flashcard;
import com.studymate.gateway.domain.FlashcardDeck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface FlashcardRepository extends JpaRepository<Flashcard, UUID> {
    List<Flashcard> findByDeck(FlashcardDeck deck);
    
    @Query("SELECT f FROM Flashcard f WHERE f.deck = :deck AND f.nextReviewDate <= :today")
    List<Flashcard> findDueCardsInDeck(@Param("deck") FlashcardDeck deck, @Param("today") LocalDate today);

    @Query("SELECT COUNT(f) FROM Flashcard f WHERE f.deck.user.id = :userId AND f.nextReviewDate <= :today")
    long countDueCardsForUser(@Param("userId") UUID userId, @Param("today") LocalDate today);
}
