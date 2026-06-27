package com.studymate.gateway.repository;

import com.studymate.gateway.domain.QuizAttempt;
import com.studymate.gateway.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {
    List<QuizAttempt> findByUserOrderByCreatedAtDesc(User user);
}
