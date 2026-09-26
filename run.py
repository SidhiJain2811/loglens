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
    print("🚀 LOGLENS: AI Code & Repository Diagnostic Platform")
    print(f"Listening on: http://{settings.HOST}:{settings.PORT}")
    print("=" * 68)
    print("Platform Capabilities:")
    print("1. 🌐 Public GitHub Repository Analyzer:")
    print("   - Scan public repositories for date parsing traps, schema issues, and exposed keys.")
    print("   - Auto-generates structured issues, recommended fixes, and reproduction test scripts.")
    print("2. 📁 File Upload Code Reviewer & Refactorer:")
    print("   - Drag & drop code files (.py, .js, .ts, .json) with automatic secret/PII sanitization.")
    print("   - Generates line-by-line annotations, refactored code with copy, and developer checklists.")
    print("=" * 68)


    # Launch browser automatically in a background daemon thread
    threading.Thread(target=open_browser_after_delay, daemon=True).start()

    # Start FastAPI server
    uvicorn.run("backend.app:app", host=settings.HOST, port=settings.PORT, log_level="info")

if __name__ == "__main__":
    main()
