package com.studymate.gateway.domain;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "study_plan_activities")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudyPlanActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @JsonIgnore

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "day_id", nullable = false)
    private StudyPlanDay day;

    @Column(nullable = false)
    private String topic;

    @Column(nullable = false)
    private Double hours;

    @Column(name = "activity_type", nullable = false)
    private String activityType;
}
