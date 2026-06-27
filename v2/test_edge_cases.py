import os
import time
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = r"C:\Users\Sandhya Sharma\.gemini\antigravity\brain\d3eb3286-8149-412b-8e63-a137a6b62a23"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def run_edge_cases():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Capture toasts
        toasts = []
        page.on("console", lambda msg: print(f"[CONSOLE] {msg.text}"))
        
        # We login first
        page.goto("http://localhost:3000/login")
        time.sleep(2)
        # Find user from earlier or create new
        # We will use the testjourney email that was registered
        page.fill("input[type='email']", "testjourney_1782541425@example.com")
        page.fill("input[type='password']", "TestJourney123!")
        page.click("button[type='submit']")
        time.sleep(3)
        
        results = {}
        
        # 17a. Upload non-PDF file
        try:
            print("--- TEST 17a: Non-PDF Upload ---")
            page.goto("http://localhost:3000/pdfs")
            time.sleep(2)
            
            # Create a dummy txt file
            txt_path = os.path.join(os.getcwd(), "dummy.txt")
            with open(txt_path, "w") as f:
                f.write("This is a dummy text file.")
                
            page.set_input_files("input[type='file']", txt_path)
            time.sleep(2)
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "edge_17a.png"))
            
            # Check if toast appeared or file rejected
            body_text = page.locator("body").text_content()
            if "Only PDF" in body_text or "PDF files" in body_text:
                results["17a"] = "PASS (Rejected non-PDF with toast)"
            else:
                results["17a"] = "FAIL (No warning displayed)"
                
            # Clean up dummy
            try:
                os.remove(txt_path)
            except:
                pass
        except Exception as e:
            results["17a"] = f"FAIL: {e}"
            
        # 17b. Generate with empty topic
        try:
            print("--- TEST 17b: Empty Topic Generate ---")
            page.goto("http://localhost:3000/study")
            time.sleep(2)
            
            btn = page.locator("button[type='submit']")
            is_disabled = btn.is_disabled()
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "edge_17b.png"))
            if is_disabled:
                results["17b"] = "PASS (Submit button disabled on empty topic)"
            else:
                results["17b"] = "FAIL (Submit button active)"
        except Exception as e:
            results["17b"] = f"FAIL: {e}"

        # 17c. Chat with empty message
        try:
            print("--- TEST 17c: Empty Chat Message ---")
            page.goto("http://localhost:3000/chat")
            time.sleep(2)
            
            # Verify if chat send button is disabled initially
            send_btn = page.locator("button[type='submit']")
            is_disabled = send_btn.is_disabled()
            page.screenshot(path=os.path.join(ARTIFACT_DIR, "edge_17c.png"))
            if is_disabled:
                results["17c"] = "PASS (Send button disabled on empty input)"
            else:
                results["17c"] = "FAIL (Send button active)"
        except Exception as e:
            results["17c"] = f"FAIL: {e}"

        browser.close()
        print("Edge Cases Results:", results)
        
if __name__ == "__main__":
    run_edge_cases()
