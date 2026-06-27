#!/bin/bash

# StudyMate AI v2 Stack Build Helper

echo "=== StudyMate AI v2: Initializing Build ==="

# Check for .env file
if [ ! -f .env ]; then
    echo "WARNING: .env file not found!"
    echo "Creating one from .env.example. Please populate your GROQ_API_KEY in it."
    copy .env.example .env
fi

# Run docker compose
echo "Starting multi-container Docker compilation..."
docker compose up --build -d

echo "=== System running at: ==="
echo "Frontend:   http://localhost:3000"
echo "Gateway:    http://localhost:8080"
echo "AI Service: http://localhost:8001"
echo "Prometheus: http://localhost:9090"
echo "Grafana:    http://localhost:3001"
echo "=========================================="
