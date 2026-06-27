package com.studymate.gateway.service;

import com.studymate.gateway.domain.StudyPlan;
import com.studymate.gateway.domain.StudyPlanActivity;
import com.studymate.gateway.domain.StudyPlanDay;
import com.studymate.gateway.domain.User;
import com.studymate.gateway.repository.StudyPlanActivityRepository;
import com.studymate.gateway.repository.StudyPlanDayRepository;
import com.studymate.gateway.repository.StudyPlanRepository;
import com.studymate.gateway.repository.UserRepository;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StudyPlanService {

    private final StudyPlanRepository planRepository;
    private final StudyPlanDayRepository dayRepository;
    private final StudyPlanActivityRepository activityRepository;
    private final UserRepository userRepository;
    private final WebClient aiWebClient;

    public StudyPlanService(StudyPlanRepository planRepository,
                            StudyPlanDayRepository dayRepository,
                            StudyPlanActivityRepository activityRepository,
                            UserRepository userRepository,
                            WebClient aiWebClient) {
        this.planRepository = planRepository;
        this.dayRepository = dayRepository;
        this.activityRepository = activityRepository;
        this.userRepository = userRepository;
        this.aiWebClient = aiWebClient;
    }

    public List<StudyPlan> getPlans(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return planRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public StudyPlan getPlan(UUID planId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return planRepository.findByIdAndUser(planId, user)
                .orElseThrow(() -> new RuntimeException("Study plan not found"));
    }

    @Transactional
    public StudyPlan createStudyPlan(String email, String title, LocalDate examDate, List<String> topics, int hoursPerDay, Map<String, Double> masteryLevels, String pdfCollection) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("exam_date", examDate.format(DateTimeFormatter.ISO_LOCAL_DATE));
        requestBody.put("topics", topics);
        requestBody.put("hours_per_day", hoursPerDay);
        requestBody.put("mastery_levels", masteryLevels);
        if (pdfCollection != null && !pdfCollection.isEmpty()) {
            requestBody.put("pdf_collection", pdfCollection);
        }

        Map<String, Object> response = aiWebClient.post()
                .uri("/api/v1/study-plan/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        if (response == null) {
            throw new RuntimeException("Failed to generate study plan from AI service");
        }

        int totalDays = ((Number) response.get("total_days")).intValue();
        double totalHours = ((Number) response.get("total_hours")).doubleValue();

        if (title == null || title.trim().isEmpty()) {
            title = "Study Plan for " + String.join(", ", topics);
        }

        StudyPlan plan = StudyPlan.builder()
                .user(user)
                .title(title)
                .examDate(examDate)
                .hoursPerDay(hoursPerDay)
                .totalDays(totalDays)
                .totalHours(totalHours)
                .build();

        StudyPlan savedPlan = planRepository.save(plan);

        Map<String, List<Map<String, Object>>> rawPlanDays = (Map<String, List<Map<String, Object>>>) response.get("plan");
        List<StudyPlanDay> daysToSave = new ArrayList<>();

        if (rawPlanDays != null) {
            for (Map.Entry<String, List<Map<String, Object>>> entry : rawPlanDays.entrySet()) {
                LocalDate date = LocalDate.parse(entry.getKey());
                StudyPlanDay day = StudyPlanDay.builder()
                        .plan(savedPlan)
                        .activityDate(date)
                        .build();
                
                List<StudyPlanActivity> activities = new ArrayList<>();
                for (Map<String, Object> actData : entry.getValue()) {
                    StudyPlanActivity act = StudyPlanActivity.builder()
                            .day(day)
                            .topic((String) actData.get("topic"))
                            .hours(((Number) actData.get("hours")).doubleValue())
                            .activityType((String) actData.get("activity_type"))
                            .build();
                    activities.add(act);
                }
                day.setActivities(activities);
                daysToSave.add(day);
            }
        }

        dayRepository.saveAll(daysToSave);
        savedPlan.setDays(daysToSave);
        return savedPlan;
    }

    @Transactional
    public void deletePlan(UUID planId, String email) {
        StudyPlan plan = getPlan(planId, email);
        planRepository.delete(plan);
    }

    public Map<String, Object> generateDiagnostic(List<String> topics, String pdfCollection) {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("topics", topics);
        if (pdfCollection != null && !pdfCollection.isEmpty()) {
            requestBody.put("pdf_collection", pdfCollection);
        }

        return aiWebClient.post()
                .uri("/api/v1/study-plan/diagnostic")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
    }
}
