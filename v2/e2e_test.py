import os
import sys
import time
from reportlab.pdfgen import canvas
from playwright.sync_api import sync_playwright

# Artifacts output path
ARTIFACT_DIR = r"C:\Users\Sandhya Sharma\.gemini\antigravity\brain\d3eb3286-8149-412b-8e63-a137a6b62a23"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

# Generate test PDF
def generate_pdf():
    pdf_path = os.path.join(os.getcwd(), "ml_test.pdf")
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, "Machine Learning and Neural Networks Study Guide")
    c.drawString(100, 730, "This is a test document about machine learning and neural networks.")
    c.drawString(100, 710, "Key concepts include supervised learning, unsupervised learning, and deep learning.")
    c.drawString(100, 690, "Neural networks consist of input layer, hidden layers, and output layer.")
    c.drawString(100, 670, "Backpropagation and gradient descent are used to train the network parameters.")
    c.save()
    print(f"Generated test PDF at: {pdf_path}")
    return pdf_path

def run_tests():
    pdf_path = generate_pdf()
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context to record logs
        context = browser.new_context(
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        
        # Log collection
        console_logs = []
        network_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("request", lambda req: network_logs.append(f"REQ: {req.method} {req.url}"))
        page.on("response", lambda res: network_logs.append(f"RES: {res.status} {res.url}"))
        
        results = {}
        errors = {}
        
        # Helper to take screenshot
        def take_screenshot(name):
            screenshot_path = os.path.join(ARTIFACT_DIR, f"{name}.png")
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved: {name}.png")
        
        # Step 1: Initial Page Load
        try:
            print("Step 1: Loading page...")
            page.goto("http://localhost:3000/login", wait_until="load")
            time.sleep(2)
            take_screenshot("step1_load")
            results["STEP 1: INITIAL PAGE LOAD"] = "PASS"
        except Exception as e:
            results["STEP 1: INITIAL PAGE LOAD"] = "FAIL"
            errors["STEP 1: INITIAL PAGE LOAD"] = str(e)
            take_screenshot("step1_error")
            
        # Step 2: User Registration
        try:
            print("Step 2: Registering user...")
            page.click("text=Create one now")
            time.sleep(1)
            # Make a random email to avoid duplicate user conflicts
            test_email = f"testuser_{int(time.time())}@example.com"
            print(f"Registering with email: {test_email}")
            page.fill("input[type='email']", test_email)
            page.locator("input[type='password']").nth(0).fill("TestPass123!")
            page.locator("input[type='password']").nth(1).fill("TestPass123!")
            page.select_option("select", "STUDENT")
            take_screenshot("step2_register_filled")
            page.click("button[type='submit']")
            time.sleep(2) # wait for redirect
            take_screenshot("step2_register_done")
            # Verify redirected to login
            if "/login" in page.url:
                results["STEP 2: USER REGISTRATION"] = "PASS"
            else:
                results["STEP 2: USER REGISTRATION"] = "FAIL"
                errors["STEP 2: USER REGISTRATION"] = f"Expected /login, got {page.url}"
        except Exception as e:
            results["STEP 2: USER REGISTRATION"] = "FAIL"
            errors["STEP 2: USER REGISTRATION"] = str(e)
            take_screenshot("step2_error")

        # Step 3: User Login
        try:
            print("Step 3: Logging in...")
            page.fill("input[type='email']", test_email)
            page.fill("input[type='password']", "TestPass123!")
            take_screenshot("step3_login_filled")
            page.click("button[type='submit']")
            time.sleep(3) # Wait for redirect to dashboard
            take_screenshot("step3_login_done")
            if page.url == "http://localhost:3000/" or page.url == "http://localhost:3000/dashboard" or page.locator("text=DUE REVIEWS").count() > 0:
                results["STEP 3: USER LOGIN"] = "PASS"
            else:
                # Check for bad credentials error
                toast = page.locator(".toast-message, [role='alert']").text_content() if page.locator("[role='alert']").count() > 0 else "Unknown error"
                results["STEP 3: USER LOGIN"] = "FAIL"
                errors["STEP 3: USER LOGIN"] = f"Expected redirect, got url={page.url}, alert={toast}"
        except Exception as e:
            results["STEP 3: USER LOGIN"] = "FAIL"
            errors["STEP 3: USER LOGIN"] = str(e)
            take_screenshot("step3_error")
            
        # Step 4: Dashboard
        try:
            print("Step 4: Checking Dashboard...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                # Wait for elements to load
                page.wait_for_selector("text=DUE REVIEWS")
                take_screenshot("step4_dashboard")
                results["STEP 4: DASHBOARD"] = "PASS"
            else:
                results["STEP 4: DASHBOARD"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 4: DASHBOARD"] = "FAIL"
            errors["STEP 4: DASHBOARD"] = str(e)
            take_screenshot("step4_error")

        # Step 5: Upload PDF
        try:
            print("Step 5: Uploading PDF...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("a[href='/pdfs']")
                time.sleep(2)
                # Upload file
                page.set_input_files("input[type='file']", pdf_path)
                time.sleep(3) # Wait for upload progress to complete
                take_screenshot("step5_uploaded")
                
                # Check if it indexes automatically
                indexed = False
                start_time = time.time()
                for _ in range(60):
                    time.sleep(2)
                    # Refresh state
                    take_screenshot("step5_indexing_poll")
                    if page.locator("text=INDEXED").count() > 0:
                        indexed = True
                        print(f"PDF indexed automatically in {time.time() - start_time:.1f}s")
                        break
                    # Fallback click if it stayed as UPLOADED and Build Index is available
                    if page.locator("text=Build Index").count() > 0:
                        page.click("text=Build Index")
                        print("Clicked Build Index fallback")
                        
                if indexed:
                    results["STEP 5: UPLOAD PDF"] = "PASS"
                else:
                    results["STEP 5: UPLOAD PDF"] = "FAIL (Indexing timeout)"
                    errors["STEP 5: UPLOAD PDF"] = "PDF stayed in UPLOADED or error state"
            else:
                results["STEP 5: UPLOAD PDF"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 5: UPLOAD PDF"] = "FAIL"
            errors["STEP 5: UPLOAD PDF"] = str(e)
            take_screenshot("step5_error")

        # Step 6: Generate Study Content
        try:
            print("Step 6: Generating content...")
            if results.get("STEP 5: UPLOAD PDF") == "PASS":
                page.click("a[href='/study']")
                time.sleep(2)
                page.fill("input[placeholder*='e.g. Reciprocal']", "Machine Learning")
                page.select_option("select", label="ml_test.pdf")
                take_screenshot("step6_generate_filled")
                page.click("button[type='submit']")
                
                # Wait for loader
                start_time = time.time()
                generated = False
                for _ in range(30):
                    time.sleep(2)
                    if page.locator("text=Reset parameters").count() > 0:
                        generated = True
                        break
                take_screenshot("step6_generate")
                if generated:
                    results["STEP 6: GENERATE STUDY CONTENT"] = "PASS"
                else:
                    results["STEP 6: GENERATE STUDY CONTENT"] = "FAIL (Generation timeout)"
                    errors["STEP 6: GENERATE STUDY CONTENT"] = "Study content did not render in 60s"
            else:
                results["STEP 6: GENERATE STUDY CONTENT"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 6: GENERATE STUDY CONTENT"] = "FAIL"
            errors["STEP 6: GENERATE STUDY CONTENT"] = str(e)
            take_screenshot("step6_error")

        # Step 8: Quiz Tab
        try:
            print("Step 8: Quiz Tab...")
            if results.get("STEP 6: GENERATE STUDY CONTENT") == "PASS":
                page.locator("button:has-text('Interactive Quiz')").first.click()
                time.sleep(1)
                take_screenshot("step8_quiz")
                
                # Answer MCQ questions one by one
                for q_idx in range(5):
                    options = page.locator("input[type='radio']")
                    if options.count() > 0:
                        options.nth(0).click() # Click first option
                        time.sleep(1)
                        # Click Next Question or Submit Quiz
                        next_btn = page.locator("button:has-text('Next Question'), button:has-text('Submit Quiz')")
                        if next_btn.count() > 0:
                            next_btn.first.click()
                            time.sleep(1.5)
                        else:
                            break
                    else:
                        break
                        
                take_screenshot("step8_quiz_submitted")
                results["STEP 8: QUIZ TAB"] = "PASS"
            else:
                results["STEP 8: QUIZ TAB"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 8: QUIZ TAB"] = "FAIL"
            errors["STEP 8: QUIZ TAB"] = str(e)

        # Step 9: Q&A Tab
        try:
            print("Step 9: Q&A Tab...")
            if results.get("STEP 6: GENERATE STUDY CONTENT") == "PASS":
                page.locator("button:has-text('Direct Q&A')").first.click()
                time.sleep(1)
                take_screenshot("step9_qa")
                results["STEP 9: Q&A TAB"] = "PASS"
            else:
                results["STEP 9: Q&A TAB"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 9: Q&A TAB"] = "FAIL"
            errors["STEP 9: Q&A TAB"] = str(e)

        # Step 7: Flashcards Tab (Click this LAST on study page because it navigates away!)
        try:
            print("Step 7: Flashcards Tab...")
            if results.get("STEP 6: GENERATE STUDY CONTENT") == "PASS":
                page.locator("button:has-text('Flashcards')").first.click()
                time.sleep(1)
                take_screenshot("step7_flashcards")
                # Navigate to the actual flashcard deck page
                page.click("text=Study flashcards now")
                time.sleep(2)
                # We are now on /flashcards/:id
                take_screenshot("step7_flashcard_study_page")
                # Check for "No reviews due!" or flip card
                if page.locator("text=No reviews due!").count() > 0:
                    page.click("text=Force study all cards")
                    time.sleep(1.5)
                # Click to flip
                page.click(".perspective-1000")
                time.sleep(1)
                take_screenshot("step7_flashcard_flipped")
                results["STEP 7: FLASHCARDS TAB"] = "PASS"
            else:
                results["STEP 7: FLASHCARDS TAB"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 7: FLASHCARDS TAB"] = "FAIL"
            errors["STEP 7: FLASHCARDS TAB"] = str(e)

        # Step 10: Chat with PDF
        try:
            print("Step 10: Chat with PDF...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("a[href='/chat']")
                time.sleep(2)
                page.click("text=New Chat Session")
                time.sleep(1)
                page.fill("input[placeholder*='e.g. Lesson']", "E2E Chat Session")
                page.select_option("select", label="ml_test.pdf")
                take_screenshot("step10_chat_modal_filled")
                page.click("button:has-text('Create')")
                time.sleep(2)
                
                # Verify input is visible
                page.fill("input[placeholder*='Ask a question']", "What are the key concepts in this document?")
                take_screenshot("step10_chat_input")
                page.click("button[type='submit']")
                time.sleep(5) # Wait for streaming response
                take_screenshot("step10_chat_response")
                results["STEP 10: CHAT WITH PDF"] = "PASS"
            else:
                results["STEP 10: CHAT WITH PDF"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 10: CHAT WITH PDF"] = "FAIL"
            errors["STEP 10: CHAT WITH PDF"] = str(e)

        # Step 11: Flashcard Review (SM-2)
        try:
            print("Step 11: Flashcard Review...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("a[href='/flashcards']")
                time.sleep(2)
                take_screenshot("step11_flashcard_list")
                # Study deck
                study_btn = page.locator("text=Start review")
                if study_btn.count() > 0:
                    study_btn.first.click()
                    time.sleep(2)
                    take_screenshot("step11_review_card")
                    
                    # Force study if no reviews due
                    if page.locator("text=No reviews due!").count() > 0:
                        page.click("text=Force study all cards")
                        time.sleep(1.5)
                        
                    page.click(".perspective-1000")
                    time.sleep(1)
                    # Click quality 4 button
                    page.locator('button[title="Score: 4"]').click()
                    time.sleep(2)
                    take_screenshot("step11_next_card")
                    results["STEP 11: FLASHCARD REVIEW (SM-2)"] = "PASS"
                else:
                    results["STEP 11: FLASHCARD REVIEW (SM-2)"] = "FAIL (No flashcard decks to study)"
            else:
                results["STEP 11: FLASHCARD REVIEW (SM-2)"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 11: FLASHCARD REVIEW (SM-2)"] = "FAIL"
            errors["STEP 11: FLASHCARD REVIEW (SM-2)"] = str(e)

        # Step 12: Export to Anki
        try:
            print("Step 12: Export to Anki...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                # We are already inside a review deck page, so export button is visible
                export_btn = page.locator("text=Export Anki")
                if export_btn.count() > 0:
                    with page.expect_download() as download_info:
                        export_btn.first.click()
                    download = download_info.value
                    download_path = os.path.join(ARTIFACT_DIR, download.suggested_filename)
                    download.save_as(download_path)
                    print(f"Downloaded: {download.suggested_filename} ({os.path.getsize(download_path)} bytes)")
                    results["STEP 12: EXPORT TO ANKI"] = "PASS"
                else:
                    results["STEP 12: EXPORT TO ANKI"] = "FAIL (No export button)"
            else:
                results["STEP 12: EXPORT TO ANKI"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 12: EXPORT TO ANKI"] = "FAIL"
            errors["STEP 12: EXPORT TO ANKI"] = str(e)

        # Step 13: Create Study Plan
        try:
            print("Step 13: Create Study Plan...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("a[href='/plans']")
                time.sleep(2)
                page.click("text=Create Plan")
                time.sleep(1)
                page.fill("input[placeholder*='e.g. Midterm']", "E2E Study Plan")
                page.fill("input[type='date']", "2026-12-31")
                page.fill("textarea", "Machine Learning, Deep Learning")
                take_screenshot("step13_plan_filled")
                page.click("button[type='submit']")
                time.sleep(4)
                take_screenshot("step13_plan_done")
                results["STEP 13: CREATE STUDY PLAN"] = "PASS"
            else:
                results["STEP 13: CREATE STUDY PLAN"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 13: CREATE STUDY PLAN"] = "FAIL"
            errors["STEP 13: CREATE STUDY PLAN"] = str(e)

        # Step 14: Quiz History & Analytics
        try:
            print("Step 14: Analytics...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("a[href='/quizzes']")
                time.sleep(2)
                take_screenshot("step14_quizzes")
                results["STEP 14: QUIZ HISTORY & ANALYTICS"] = "PASS"
            else:
                results["STEP 14: QUIZ HISTORY & ANALYTICS"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 14: QUIZ HISTORY & ANALYTICS"] = "FAIL"
            errors["STEP 14: QUIZ HISTORY & ANALYTICS"] = str(e)

        # Step 15: Settings
        try:
            print("Step 15: Settings...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("a[href='/settings']")
                time.sleep(2)
                take_screenshot("step15_settings")
                results["STEP 15: SETTINGS"] = "PASS"
            else:
                results["STEP 15: SETTINGS"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 15: SETTINGS"] = "FAIL"
            errors["STEP 15: SETTINGS"] = str(e)

        # Step 16: Logout
        try:
            print("Step 16: Logout...")
            if results.get("STEP 3: USER LOGIN") == "PASS":
                page.click("button[title='Logout']")
                time.sleep(2)
                take_screenshot("step16_logout")
                if "/login" in page.url:
                    results["STEP 16: LOGOUT"] = "PASS"
                else:
                    results["STEP 16: LOGOUT"] = "FAIL"
            else:
                results["STEP 16: LOGOUT"] = "FAIL (Dependency)"
        except Exception as e:
            results["STEP 16: LOGOUT"] = "FAIL"
            errors["STEP 16: LOGOUT"] = str(e)

        # Step 17: Observability
        try:
            print("Step 17: Observability...")
            # Use load wait to avoid websocket/polling idle timeouts
            page.goto("http://localhost:9090/targets", wait_until="load")
            time.sleep(2)
            take_screenshot("step17_prometheus")
            page.goto("http://localhost:3001/login", wait_until="load")
            time.sleep(1)
            take_screenshot("step17_grafana")
            results["STEP 17: OBSERVABILITY"] = "PASS"
        except Exception as e:
            results["STEP 17: OBSERVABILITY"] = "FAIL"
            errors["STEP 17: OBSERVABILITY"] = str(e)
            
        browser.close()
        
        # Write report
        print("\n\n=== E2E TEST RUN REPORT ===")
        for step, res in results.items():
            print(f"{step} -> {res}")
            if res.startswith("FAIL") and step in errors:
                print(f"  Error: {errors[step]}")
        
        # Write logs to workspace for debug
        with open("console.log", "w", encoding="utf-8") as f:
            f.write("\n".join(console_logs))
        with open("network.log", "w", encoding="utf-8") as f:
            f.write("\n".join(network_logs))

if __name__ == "__main__":
    run_tests()
