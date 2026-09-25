import os
import sys
import time
import webbrowser
import threading
import uvicorn
from backend.config import settings

def open_browser_after_delay():
    time.sleep(1.2)
    url = f"http://{settings.HOST}:{settings.PORT}"
    print(f"Opening browser at: {url}")
    webbrowser.open(url)

def main():
    print("=" * 68)
    print("🚀 LOGLENS: Privacy-Filtered Diagnostic & Verification Platform")
    print(f"Listening on: http://{settings.HOST}:{settings.PORT}")
    print("=" * 68)
    print("Demonstration Guide for Hackathon Judges:")
    print("1. Open the UI at http://127.0.0.1:8000")
    print("2. Submit attendance with date '25/09/2026' -> Observe HTTP 400 failure")
    print("3. Click 'Report this problem with LogLens' -> Inspect Privacy Redaction")
    print("   (Notice: student_id/email are [REDACTED], but date is PRESERVED)")
    print("4. Approve -> GitHub Issue created with structured markdown & AI insight")
    print("5. Run `python test_repro.py` in your terminal -> Result: FAIL")
    print("6. Click 'Apply Backend Date Fix' (or toggle via UI)")
    print("7. Run `python test_repro.py` again -> Result: PASS (identical test script!)")
    print("=" * 68)

    # Launch browser automatically in a background daemon thread
    threading.Thread(target=open_browser_after_delay, daemon=True).start()

    # Start FastAPI server
    uvicorn.run("backend.app:app", host=settings.HOST, port=settings.PORT, log_level="info")

if __name__ == "__main__":
    main()
