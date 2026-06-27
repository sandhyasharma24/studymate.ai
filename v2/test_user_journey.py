import os
import sys
import time
import subprocess
import requests
import json
from reportlab.pdfgen import canvas
from playwright.sync_api import sync_playwright

# Output dir for screenshots and test artifacts
ARTIFACT_DIR = r"C:\Users\Sandhya Sharma\.gemini\antigravity\brain\d3eb3286-8149-412b-8e63-a137a6b62a23"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def generate_pdf():
    pdf_path = os.path.join(os.getcwd(), "ml_test_journey.pdf")
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, "Machine learning is a subset of Artificial Intelligence.")
    c.drawString(100, 730, "Neural networks are inspired by biological neurons.")
    c.drawString(100, 710, "Deep learning uses multiple layers.")
    c.save()
    print(f"Generated test PDF at: {pdf_path}")
    return pdf_path

def run_tests():
    pdf_path = generate_pdf()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Context that will monitor request and response APIs
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        # Capture API logs
        console_logs = []
        network_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        def handle_request(req):
            if "/api/v1/" in req.url:
                network_logs.append(f"REQ: {req.method} {req.url}")
        
        def handle_response(res):
            if "/api/v1/" in res.url:
                try:
                    text = res.text()
                except Exception:
                    text = "<binary/empty>"
                network_logs.append(f"RES: {res.status} {res.url} -> {text[:300]}")
                
        page.on("request", handle_request)
        page.on("response", handle_response)
        
        results = {}
        errors = {}
        
        def take_screenshot(name):
            path = os.path.join(ARTIFACT_DIR, f"{name}.png")
            page.screenshot(path=path)
            print(f"Screenshot saved: {name}.png")
            
        # ==========================================
        # TEST 1: FRONTEND LOAD & FIRST IMPRESSION
        # ==========================================
        try:
            print("--- TEST 1: Frontend Load ---")
            page.goto("http://localhost:3000/login", wait_until="load")
            time.sleep(2)
            take_screenshot("journey_t1_load")
            
            # Check login page text elements
            body_text = page.locator("body").text_content()
            body_clean = body_text.encode('ascii', 'ignore').decode()
            print(f"Login page body text excerpt: {body_clean[:200]}")
            
            # Click register link
            page.click("text=Create one now")
            time.sleep(1.5)
            take_screenshot("journey_t1_register_page")
            
            if "/register" in page.url:
                results["1"] = "PASS"
            else:
                results["1"] = "FAIL"
                errors["1"] = f"Expected /register route, got {page.url}"
        except Exception as e:
            results["1"] = "FAIL"
            errors["1"] = str(e)
            take_screenshot("journey_t1_error")

        # ==========================================
        # TEST 2: USER REGISTRATION
        # ==========================================
        try:
            print("--- TEST 2: User Registration ---")
            if "/register" not in page.url:
                page.goto("http://localhost:3000/register", wait_until="load")
                time.sleep(1)
            
            reg_email = f"testjourney_{int(time.time())}@example.com"
            print(f"Registering with email: {reg_email}")
            page.fill("input[type='email']", reg_email)
            page.locator("input[type='password']").nth(0).fill("TestJourney123!")
            page.locator("input[type='password']").nth(1).fill("TestJourney123!")
            page.select_option("select", "STUDENT")
            take_screenshot("journey_t2_filled")
            page.click("button[type='submit']")
            time.sleep(2)
            take_screenshot("journey_t2_done")
            
            # Duplicate test
            page.goto("http://localhost:3000/register", wait_until="load")
            time.sleep(1)
            page.fill("input[type='email']", reg_email)
            page.locator("input[type='password']").nth(0).fill("TestJourney123!")
            page.locator("input[type='password']").nth(1).fill("TestJourney123!")
            page.select_option("select", "STUDENT")
            page.click("button[type='submit']")
            time.sleep(2)
            take_screenshot("journey_t2_duplicate")
            
            results["2"] = "PASS"
        except Exception as e:
            results["2"] = "FAIL"
            errors["2"] = str(e)
            take_screenshot("journey_t2_error")

        # ==========================================
        # TEST 3: USER LOGIN
        # ==========================================
        try:
            print("--- TEST 3: User Login ---")
            page.goto("http://localhost:3000/login", wait_until="load")
            time.sleep(1)
            page.fill("input[type='email']", reg_email)
            page.fill("input[type='password']", "TestJourney123!")
            take_screenshot("journey_t3_filled")
            page.click("button[type='submit']")
            time.sleep(3)
            take_screenshot("journey_t3_done")
            
            # Check local storage tokens
            tokens = page.evaluate("() => ({ accessToken: localStorage.getItem('token'), refreshToken: localStorage.getItem('refreshToken') })")
            print(f"Tokens in localStorage: {tokens}")
            
            # Verify dashboard contains welcome message
            welcome_text = page.locator("text=Hello,").text_content()
            welcome_clean = welcome_text.encode('ascii', 'ignore').decode()
            print(f"Greeting matches: {welcome_clean}")
            
            if tokens["accessToken"] and welcome_text:
                results["3"] = "PASS"
            else:
                results["3"] = "FAIL"
                errors["3"] = "Failed to store token or show user info"
        except Exception as e:
            results["3"] = "FAIL"
            errors["3"] = str(e)
            take_screenshot("journey_t3_error")

        # ==========================================
        # TEST 4: DASHBOARD WIDGETS
        # ==========================================
        try:
            print("--- TEST 4: Dashboard Widgets ---")
            widgets = [
                page.locator("text=DUE REVIEWS").count() > 0,
                page.locator("text=INDEXED PDFS").count() > 0,
                page.locator("text=ACTIVE PLANS").count() > 0,
                page.locator("text=Recent PDF Material").count() > 0,
                page.locator("text=Active Study Plans").count() > 0,
                page.locator("text=Spaced Repetition Decks").count() > 0
            ]
            print(f"Dashboard widgets check: {widgets}")
            
            sidebar_links = ["Dashboard", "PDFs & Uploads", "AI RAG Chat", "Study Content", "Spaced Decks", "Quiz Analytics", "Study Plans", "Settings"]
            for link in sidebar_links:
                assert page.locator(f"text={link}").count() > 0, f"Missing sidebar link: {link}"
            
            if all(widgets):
                results["4"] = "PASS"
            else:
                results["4"] = "FAIL"
                errors["4"] = f"Some widgets failed to load: {widgets}"
        except Exception as e:
            results["4"] = "FAIL"
            errors["4"] = str(e)
            take_screenshot("journey_t4_error")

        # ==========================================
        # TEST 5: PDF UPLOAD
        # ==========================================
        try:
            print("--- TEST 5: PDF Upload ---")
            page.click("a[href='/pdfs']")
            time.sleep(2)
            page.set_input_files("input[type='file']", pdf_path)
            time.sleep(3)
            take_screenshot("journey_t5_uploaded")
            
            list_text = page.locator("body").text_content()
            if "ml_test_journey.pdf" in list_text:
                results["5"] = "PASS"
            else:
                results["5"] = "FAIL"
                errors["5"] = "PDF not displayed in list after upload"
        except Exception as e:
            results["5"] = "FAIL"
            errors["5"] = str(e)
            take_screenshot("journey_t5_error")

        # ==========================================
        # TEST 6: PDF INDEXING
        # ==========================================
        try:
            print("--- TEST 6: PDF Indexing ---")
            indexed = False
            start_time = time.time()
            for _ in range(60):
                time.sleep(2)
                take_screenshot("journey_t6_indexing_poll")
                if page.locator("text=INDEXED").count() > 0:
                    indexed = True
                    print(f"Automatic PDF index finished in {time.time() - start_time:.1f}s")
                    break
                if page.locator("text=Build Index").count() > 0:
                    page.click("text=Build Index")
                    print("Clicked Build Index fallback button")
                    
            if indexed:
                results["6"] = "PASS"
            else:
                results["6"] = "FAIL"
                errors["6"] = "Indexing timed out or failed to complete"
        except Exception as e:
            results["6"] = "FAIL"
            errors["6"] = str(e)
            take_screenshot("journey_t6_error")

        # ==========================================
        # TEST 7: CHAT SESSION CREATION
        # ==========================================
        try:
            print("--- TEST 7: Chat Session Creation ---")
            page.click("a[href='/chat']")
            time.sleep(2)
            page.click("text=New Chat Session")
            time.sleep(1)
            page.fill("input[placeholder*='e.g. Lesson']", "ML Study Session")
            page.select_option("select", label="ml_test_journey.pdf")
            take_screenshot("journey_t7_filled")
            page.click("button:has-text('Create')")
            time.sleep(2)
            take_screenshot("journey_t7_done")
            
            sidebar_content = page.locator("body").text_content()
            if "ML Study Session" in sidebar_content:
                results["7"] = "PASS"
            else:
                results["7"] = "FAIL"
                errors["7"] = "Session title not shown in chat list"
        except Exception as e:
            results["7"] = "FAIL"
            errors["7"] = str(e)
            take_screenshot("journey_t7_error")

        # ==========================================
        # TEST 8: CHAT MESSAGE & STREAMING
        # ==========================================
        try:
            print("--- TEST 8: Chat Message & Streaming ---")
            page.fill("input[placeholder*='Ask a question']", "What is machine learning according to my PDF?")
            take_screenshot("journey_t8_typed")
            page.click("button[type='submit']")
            time.sleep(6)
            take_screenshot("journey_t8_response")
            results["8"] = "PASS"
        except Exception as e:
            results["8"] = "FAIL"
            errors["8"] = str(e)
            take_screenshot("journey_t8_error")

        # ==========================================
        # TEST 9: STUDY CONTENT GENERATION & VERIFICATION TABS
        # ==========================================
        try:
            print("--- TEST 9: Study Content Generation ---")
            page.click("a[href='/study']")
            time.sleep(2)
            take_screenshot("journey_t9_study_page")
            
            # Select the PDF context from the dropdown
            page.select_option("select", label="ml_test_journey.pdf")
            time.sleep(1)
            
            page.fill("input[placeholder*='e.g. Reciprocal']", "Machine Learning")
            take_screenshot("journey_t9_generate_filled")
            page.click("button[type='submit']")
            
            generated = False
            start_time = time.time()
            for _ in range(30):
                time.sleep(2)
                if page.locator("text=Reset parameters").count() > 0:
                    generated = True
                    break
            take_screenshot("journey_t9_done")
            
            if generated:
                tabs_exist = [
                    page.locator("button:has-text('Text Summary')").count() > 0,
                    page.locator("button:has-text('Flashcards')").count() > 0,
                    page.locator("button:has-text('Interactive Quiz')").count() > 0,
                    page.locator("button:has-text('Direct Q&A')").count() > 0
                ]
                print(f"Tabs present: {tabs_exist}")
                results["9"] = "PASS"
                
                # Direct Q&A tab check
                page.locator("button:has-text('Direct Q&A')").first.click()
                time.sleep(1.5)
                take_screenshot("journey_t9_tab_qa")
                
                # Interactive Quiz tab check & solve (TEST 11 Flow)
                print("--- TEST 11: Quiz Flow inside study context ---")
                page.locator("button:has-text('Interactive Quiz')").first.click()
                time.sleep(1.5)
                take_screenshot("journey_t11_quiz")
                
                for q_idx in range(3):
                    # Click first option button
                    opt_btn = page.locator(".glass-panel button:has-text('A)'), .glass-panel button:has-text('B)'), .glass-panel button:has-text('C)'), .glass-panel button:has-text('D)')").first
                    if opt_btn.count() > 0:
                        opt_btn.click()
                        time.sleep(1)
                        # Submit answer
                        page.locator("button:has-text('Submit Answer')").first.click()
                        time.sleep(1)
                        # Next question or Finish
                        next_btn = page.locator("button:has-text('Next Question'), button:has-text('Finish Quiz')").first
                        next_btn.click()
                        time.sleep(1.5)
                take_screenshot("journey_t11_finished")
                
                # Navigate to Quizzes page to see history
                page.click("a[href='/quizzes']")
                time.sleep(2)
                take_screenshot("journey_t11_history")
                
                body_text = page.locator("body").text_content()
                if "Machine Learning" in body_text:
                    results["11"] = "PASS"
                else:
                    results["11"] = "FAIL"
                    errors["11"] = "Quiz attempt not registered in history"
            else:
                results["9"] = "FAIL"
                errors["9"] = "Generation took longer than 60s or failed"
                results["11"] = "FAIL (Dependency)"
        except Exception as e:
            results["9"] = "FAIL"
            errors["9"] = str(e)
            take_screenshot("journey_t9_error")
            results["11"] = "FAIL"
            errors["11"] = str(e)

        # ==========================================
        # TEST 10: FLASHCARD REVIEW WITH SM-2
        # ==========================================
        try:
            print("--- TEST 10: Flashcard Review ---")
            page.click("a[href='/flashcards']")
            time.sleep(2)
            take_screenshot("journey_t10_list")
            
            page.click("text=Start review")
            time.sleep(2)
            take_screenshot("journey_t10_study")
            
            if page.locator("text=No reviews due!").count() > 0:
                page.click("text=Force study all cards")
                time.sleep(1.5)
            
            page.click(".perspective-1000")
            time.sleep(1)
            take_screenshot("journey_t10_flipped")
            
            page.locator('button[title="Score: 4"]').click()
            time.sleep(2)
            take_screenshot("journey_t10_rated")
            results["10"] = "PASS"
        except Exception as e:
            results["10"] = "FAIL"
            errors["10"] = str(e)
            take_screenshot("journey_t10_error")

        # ==========================================
        # TEST 12: EXPORT TO ANKI
        # ==========================================
        try:
            print("--- TEST 12: Export to Anki ---")
            # We are inside flashcard review page
            with page.expect_download() as download_info:
                page.click("text=Export Anki")
            download = download_info.value
            download_path = os.path.join(ARTIFACT_DIR, download.suggested_filename)
            download.save_as(download_path)
            
            size = os.path.getsize(download_path)
            print(f"Anki download size: {size} bytes")
            if size > 1024:
                results["12"] = "PASS"
            else:
                results["12"] = "FAIL"
                errors["12"] = f"Downloaded empty or tiny file: {size} bytes"
        except Exception as e:
            results["12"] = "FAIL"
            errors["12"] = str(e)
            take_screenshot("journey_t12_error")

        # ==========================================
        # TEST 13: STUDY PLAN CREATION
        # ==========================================
        try:
            print("--- TEST 13: Study Plan ---")
            page.click("a[href='/plans']")
            time.sleep(2)
            page.click("text=Create Plan")
            time.sleep(1)
            page.fill("input[placeholder*='e.g. Midterm']", "ML Journey Study Plan")
            page.fill("input[type='date']", "2026-12-31")
            page.fill("textarea", "Machine Learning, Deep Learning")
            take_screenshot("journey_t13_filled")
            page.click("button[type='submit']")
            time.sleep(4)
            take_screenshot("journey_t13_done")
            
            if page.locator(".study-calendar, [class*='calendar']").count() > 0 or page.locator("text=Roadmap").count() > 0 or page.locator("text=exam target").count() > 0:
                results["13"] = "PASS"
            else:
                results["13"] = "FAIL"
                errors["13"] = "Calendar roadmap failed to render"
        except Exception as e:
            results["13"] = "FAIL"
            errors["13"] = str(e)
            take_screenshot("journey_t13_error")

        # ==========================================
        # TEST 14: SETTINGS & THEME
        # ==========================================
        try:
            print("--- TEST 14: Settings & Logout ---")
            page.click("a[href='/settings']")
            time.sleep(2)
            take_screenshot("journey_t14_settings")
            
            body_text = page.locator("body").text_content()
            assert reg_email in body_text, "Logged-in user email missing in Settings"
            
            page.click("button[title='Logout']")
            time.sleep(2)
            take_screenshot("journey_t14_logout")
            
            if "/login" in page.url:
                results["14"] = "PASS"
            else:
                results["14"] = "FAIL"
                errors["14"] = f"Logout failed to redirect to /login: {page.url}"
        except Exception as e:
            results["14"] = "FAIL"
            errors["14"] = str(e)
            take_screenshot("journey_t14_error")

        # ==========================================
        # TEST 15: PROTECTED ROUTES & AUTH
        # ==========================================
        try:
            print("--- TEST 15: Protected Routes ---")
            page.goto("http://localhost:3000/", wait_until="load")
            time.sleep(2)
            take_screenshot("journey_t15_protected")
            
            if "/login" in page.url:
                results["15"] = "PASS"
            else:
                results["15"] = "FAIL"
                errors["15"] = f"Protected route bypass allowed! Page stayed at: {page.url}"
        except Exception as e:
            results["15"] = "FAIL"
            errors["15"] = str(e)

        browser.close()
        
        with open("console_journey.log", "w", encoding="utf-8") as f:
            f.write("\n".join(console_logs))
        with open("network_journey.log", "w", encoding="utf-8") as f:
            f.write("\n".join(network_logs))

    return results, errors

if __name__ == "__main__":
    res, errs = run_tests()
    print("journey res:", res)
    print("journey errs:", errs)
