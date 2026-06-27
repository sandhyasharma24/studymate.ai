import requests
import json
import time
import uuid

BASE_URL = "http://localhost:8080/api/v1"

def print_result(name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} | {name} | {details}")
    if not success:
        print(f"    --> Details: {details}")

print("=== STUDYMATE AI v2 QA TEST SUITE ===")

# 1. Test Authentication
email = f"qa_test_{uuid.uuid4().hex[:6]}@example.com"
password = "password123"

# Register
resp = requests.post(f"{BASE_URL}/auth/register", json={
    "email": email,
    "password": password,
    "role": "STUDENT"
})
print_result("Register User", resp.status_code == 200, resp.text)

# Login
resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": email,
    "password": password
})
print_result("Login User", resp.status_code == 200, f"Status: {resp.status_code}, Response: {resp.text}")
token = resp.json().get("accessToken") if resp.status_code == 200 else None

headers = {"Authorization": f"Bearer {token}"} if token else {}

# 2. Test Flashcards Empty State
resp = requests.get(f"{BASE_URL}/study/flashcards/decks", headers=headers)
print_result("Get Decks (Initial)", resp.status_code == 200, f"Found {len(resp.json()) if resp.status_code == 200 else 0} decks")

# 3. Test Generate Study Materials (No PDF)
start_time = time.time()
resp = requests.post(f"{BASE_URL}/study/generate", headers=headers, json={
    "topic": "Photosynthesis",
    "numFlashcards": 2,
    "difficulty": "easy",
    "questionCount": 2,
    "questionType": "mcq"
})
elapsed = time.time() - start_time
print_result("AI Generate (No PDF)", resp.status_code == 200, f"Took: {elapsed:.2f}s")
if resp.status_code != 200:
    print(resp.text)

# 4. Check generated decks
resp = requests.get(f"{BASE_URL}/study/flashcards/decks", headers=headers)
decks = resp.json() if resp.status_code == 200 else []
print_result("Check Generated Decks", len(decks) > 0, f"Found {len(decks)} decks")

# 5. Review a flashcard
if len(decks) > 0:
    deck_id = decks[0]["id"]
    resp = requests.get(f"{BASE_URL}/study/flashcards/decks/{deck_id}/cards", headers=headers)
    cards = resp.json() if resp.status_code == 200 else []
    print_result("Get Cards in Deck", len(cards) > 0, f"Found {len(cards)} cards")
    
    if len(cards) > 0:
        card_id = cards[0]["id"]
        resp = requests.post(f"{BASE_URL}/study/flashcards/decks/{deck_id}/review", headers=headers, json={
            "cardId": card_id,
            "quality": 5
        })
        print_result("Submit Flashcard Review", resp.status_code == 200, f"Status: {resp.status_code}, Resp: {resp.text}")
else:
    print_result("Submit Flashcard Review", False, "No decks available")

# 6. Test Quiz Generation
resp = requests.post(f"{BASE_URL}/study/quizzes", headers=headers, json={
    "topic": "Python Programming",
    "count": 2,
    "difficulty": "medium",
    "type": "mcq"
})
print_result("Generate Quiz", resp.status_code == 200, f"Status: {resp.status_code}")

# 7. Test Quiz Submission
resp = requests.post(f"{BASE_URL}/study/quizzes/submit", headers=headers, json={
    "topic": "Python Programming",
    "score": 2,
    "total": 2,
    "difficulty": "medium",
    "type": "mcq",
    "timeSpentSeconds": 120
})
print_result("Submit Quiz Result", resp.status_code == 200, f"Status: {resp.status_code}")

# 8. Test Study Plan Generation
resp = requests.post(f"{BASE_URL}/study/plans", headers=headers, json={
    "title": "Finals Prep",
    "examDate": "2026-12-01",
    "topics": ["Math", "Physics"],
    "hoursPerDay": 2,
    "masteryLevels": {"Math": 0.5, "Physics": 0.2}
})
print_result("Create Study Plan", resp.status_code == 200, f"Status: {resp.status_code}")

# 9. Get Study Plans
resp = requests.get(f"{BASE_URL}/study/plans", headers=headers)
print_result("Get Study Plans", resp.status_code == 200, f"Status: {resp.status_code}")

print("=== QA TEST SUITE COMPLETE ===")
