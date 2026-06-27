package com.studymate.gateway.repository;

import com.studymate.gateway.domain.StudyPlanActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StudyPlanActivityRepository extends JpaRepository<StudyPlanActivity, UUID> {
}
