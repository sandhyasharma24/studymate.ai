package com.studymate.gateway.repository;

import com.studymate.gateway.domain.StudyPlanDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StudyPlanDayRepository extends JpaRepository<StudyPlanDay, UUID> {
}
