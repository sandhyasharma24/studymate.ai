package com.studymate.gateway.repository;

import com.studymate.gateway.domain.StudyPlan;
import com.studymate.gateway.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudyPlanRepository extends JpaRepository<StudyPlan, UUID> {
    List<StudyPlan> findByUserOrderByCreatedAtDesc(User user);
    Optional<StudyPlan> findByIdAndUser(UUID id, User user);
}
