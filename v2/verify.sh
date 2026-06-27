#!/bin/bash
echo "=== StudyMate v2 Verification ==="
echo ""

PASS=0
FAIL=0

check() {
    if eval "$2" > /dev/null 2>&1; then
        echo "✅ $1"
        ((PASS++))
    else
        echo "❌ $1"
        ((FAIL++))
    fi
}

check "AI Service Dockerfile exists" "[ -f ai-service/Dockerfile ]"
check "API Gateway pom.xml exists" "[ -f api-gateway/pom.xml ]"
check "Frontend package.json exists" "[ -f frontend/package.json ]"
check "docker-compose.yml exists" "[ -f docker-compose.yml ]"
check "build.sh exists" "[ -f build.sh ]"
check ".env.example exists" "[ -f .env.example ]"
check "README.md exists" "[ -f README.md ]"
check "Prometheus config exists" "[ -f prometheus.yml ]"
check "AI Service has rag_service.py" "[ -f ai-service/services/rag_service.py ]"
check "Spring Boot has SecurityConfig" "[ -f api-gateway/src/main/java/com/studymate/gateway/config/SecurityConfig.java ]"
check "React has FlashCard.tsx" "[ -f frontend/src/components/FlashCard.tsx ]"
check "Flyway V1 migration exists" "[ -f api-gateway/src/main/resources/db/migration/V1__create_users.sql ]"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "🎉 All checks passed!" || echo "⚠️  Some checks failed. Review above."