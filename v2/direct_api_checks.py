import subprocess
import json
import requests

results = {}

# 16a. AI Service Health
try:
    r = requests.get("http://localhost:8001/health")
    results["16a"] = f"STATUS: {r.status_code}, BODY: {r.json()}"
except Exception as e:
    results["16a"] = f"FAILED: {e}"

# 16b. Gateway Health
try:
    r = requests.get("http://localhost:8080/health")
    results["16b"] = f"STATUS: {r.status_code}, BODY: {r.json()}"
except Exception as e:
    results["16b"] = f"FAILED: {e}"

# 16c. Prometheus Targets
try:
    r = requests.get("http://localhost:9090/api/v1/targets")
    results["16c"] = f"STATUS: {r.status_code}, TARGETS_COUNT: {len(r.json().get('data', {}).get('activeTargets', []))}"
except Exception as e:
    results["16c"] = f"FAILED: {e}"

# 16d. Direct RAG Query (bypass gateway)
try:
    payload = {"query": "machine learning", "collection_name": "test", "top_k": 3}
    r = requests.post("http://localhost:8001/api/v1/rag/query", json=payload)
    results["16d"] = f"STATUS: {r.status_code}, BODY: {r.text[:200]}"
except Exception as e:
    results["16d"] = f"FAILED: {e}"

# 16e. Direct LLM Generate (bypass gateway)
try:
    payload = {"topic": "Python", "num_flashcards": 2, "difficulty": "easy", "mode": "general"}
    r = requests.post("http://localhost:8001/api/v1/generate", json=payload)
    results["16e"] = f"STATUS: {r.status_code}, BODY: {r.text[:200]}"
except Exception as e:
    results["16e"] = f"FAILED: {e}"

# 16f. Rate Limiting Test (run 110 requests in loop)
try:
    status_codes = []
    for _ in range(110):
        # We use a dummy request to login
        res = requests.post("http://localhost:8080/api/v1/auth/login", json={"email":"dummy@test.com", "password":"foo"})
        status_codes.append(res.status_code)
    # Count how many 400 and how many 429
    codes_count = {}
    for c in status_codes:
        codes_count[c] = codes_count.get(c, 0) + 1
    results["16f"] = f"STATUS_CODES: {codes_count}"
except Exception as e:
    results["16f"] = f"FAILED: {e}"

# 16g. Database Connectivity
try:
    out = subprocess.check_output('docker compose exec -T postgres psql -U studymate -d studymate -c "SELECT COUNT(*) FROM users;"', shell=True)
    results["16g_db"] = out.decode().strip()
except Exception as e:
    results["16g_db"] = f"FAILED: {e}"

try:
    out = subprocess.check_output('docker compose exec -T redis redis-cli ping', shell=True)
    results["16g_redis"] = out.decode().strip()
except Exception as e:
    results["16g_redis"] = f"FAILED: {e}"

# 16h. RabbitMQ Management
try:
    r = requests.get("http://localhost:15672/api/overview", auth=("guest", "guest"))
    results["16h"] = f"STATUS: {r.status_code}, OVERVIEW: {r.text[:200]}"
except Exception as e:
    results["16h"] = f"FAILED: {e}"

print(json.dumps(results, indent=2))
