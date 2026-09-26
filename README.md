# LogLens 🔍🛡️

> **Turn vague "it doesn't work" bug reports into privacy-filtered diagnostic evidence, automated GitHub issues with AI root-cause analysis, and single-script runnable verification tests.**

Built for Hackathons & Developer Productivity.

---

## 🎯 The 3 Core Problems LogLens Solves

| # | The Problem in Software Development | How LogLens Solves It |
|---|-------------------------------------|------------------------|
| **1** | **Vague Reports**: Users just report "it's broken" without technical context or reproduction steps. | **Automatic Evidence Capture**: Silently captures user action breadcrumbs, exact failed HTTP transactions (method, endpoint, payload, response), and client context. |
| **2** | **Blunt Privacy Sanitization**: Blindly wiping everything strips the exact data needed to reproduce the bug. | **Rule-Based Selective Redaction**: Personal identity data (`email`, `student_id`, `phone`) is masked with `[REDACTED]`, while **failure conditions (e.g. `date='25/09/2026'`) are preserved**. Explicit user preview modal guarantees consent before submission. |
| **3** | **Unverified Fixes**: Closing an issue doesn't prove the failure was actually resolved. | **Executable Reproduction Test**: Automatically generates a standalone test script (`test_repro.py`) that returns **FAIL** against the bug, and **PASS** once fixed — using the exact same script. |

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User["End User (Attendance App)"] -->|Submits Date: 25/09/2026| App["Frontend App"]
    App -->|POST /api/attendance| Backend["FastAPI Backend"]
    Backend -->|HTTP 400 Invalid Date| App
    
    App -->|Clicks 'Report this problem'| Capture["Evidence Collector"]
    Capture -->|Action sequence + Network payload + User profile| Redactor["LogLens Privacy Redactor"]
    
    Redactor -->|Email/Phone -> [REDACTED]| Modal["Interactive Consent Review Modal"]
    Redactor -->|Date -> [PRESERVED FOR REPRO]| Modal
    
    BackendCode["backend/date_handler.py Excerpt"] --> AI["AI Explainer (LLM / Gemini / OpenAI)"]
    AI -->|1-2 Sentence Root Cause| Modal
    
    Modal -->|User Approves & Sends| GH["GitHub REST API"]
    GH -->|Creates Issue with 4 Structured Sections| GHIssue["GitHub Issue (Steps, Evidence, AI, Repro)"]
    
    Modal -->|Generates| Repro["test_repro.py (Standalone Test)"]
    Repro -->|Pre-Fix| Fail["Result: FAIL (HTTP 400)"]
    Repro -->|Post-Fix| Pass["Result: PASS (HTTP 200)"]
```

---

## ⚡ Quickstart (One Command)

### 1. Requirements
- Python 3.10+ (FastAPI, Uvicorn, HTTPX)
- *Zero Node.js dependency required* — the frontend is served directly by FastAPI with offline-ready React 18 bundles.

### 2. Install & Run
```bash
# Clone the repository
git clone https://github.com/your-username/loglens.git
cd loglens

# Install Python requirements
pip install -r requirements.txt

# Start the application (automatically opens your browser)
python run.py
```

Application will run at `http://127.0.0.1:8000`.

---

## ⚙️ Environment Configuration (`.env`)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the following variables:

```ini
# GitHub Integration
GITHUB_TOKEN=ghp_yourPersonalAccessTokenHere
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name

# LLM Root-Cause Analysis (Optional - built-in smart engine runs if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

> **Hackathon Demo Guarantee**: If you run LogLens without GitHub or LLM API keys, LogLens automatically enables **Graceful Demo Fallback Mode** so the full end-to-end presentation never crashes or errors on stage.

---

## 🎬 3-Minute Live Demo Script for Judges

1. **Trigger the Bug**:
   - In the web app, keep the pre-filled date `25/09/2026`.
   - Click **Submit Attendance**.
   - Notice the rejection: `❌ Attendance could not be submitted. Expected: YYYY-MM-DD, received: 25/09/2026`.
2. **Review Privacy Redaction & AI Explanation**:
   - Click **🛡️ Report this problem with LogLens**.
   - Show the judges the **Consent Review Modal**:
     - `alex.mercer@university.edu` is masked as `[REDACTED]`.
     - `STU-98421` is masked as `[REDACTED]`.
     - **Critically**: The date `25/09/2026` is **preserved** under `[PRESERVED FOR REPRO]` because stripping it would make reproducing the bug impossible.
     - View the **AI Root-Cause Diagnostic** analyzing the actual `date_handler.py` snippet.
3. **Create the GitHub Issue**:
   - Click **✅ Approve & File GitHub Issue**.
   - The structured markdown issue is filed with:
     - `## Steps to Reproduce`
     - `## Technical Evidence`
     - `## AI Suggestion`
     - `## Verification`
4. **Demonstrate Verifiable Fix (Single Script)**:
   - Run the generated standalone reproduction test in terminal:
     ```bash
     python test_repro.py
     ```
     *Output*:
     ```text
     🔍 REPRODUCTION TEST: attendance-date-format
     Request: POST http://127.0.0.1:8000/api/attendance
     Result: FAIL — still returns 400 Invalid date format
     ```
   - In the web UI, click **Apply Backend Date Fix** (or toggle it via API `/api/toggle-fix`).
   - Run the **exact same** script again in terminal:
     ```bash
     python test_repro.py
     ```
     *Output*:
     ```text
     🔍 REPRODUCTION TEST: attendance-date-format
     Request: POST http://127.0.0.1:8000/api/attendance
     Result: PASS — now returns 200, attendance recorded
     ```

---

## 🌐 Feature 1: Public GitHub Repo Analyzer
- Input any public repository (e.g. `https://github.com/owner/repo`).
- Analyzes entrypoint files and validation logic for fragile date parsing, naked exceptions, and exposed credentials.
- Returns high-level summary, structured issues with line numbers & snippets, recommended step-by-step fixes, and an auto-generated reproduction test script.
- Endpoint: `POST /api/analyze-repo`.

---

## 📁 Feature 2: File Upload Code Reviewer & Refactorer
- Drag & drop or select files (`.py`, `.js`, `.ts`, `.json`).
- Automatically sanitizes API tokens, keys, passwords, and PII before processing.
- Generates line-by-line annotations, improved idiomatic refactored code with comprehensive docstrings and fallbacks, and an actionable developer checklist.
- Endpoint: `POST /api/analyze-file`.

---

## 📂 Project Organization

```text
loglens/
├── .github/
│   ├── workflows/repro_check.yml       # CI/CD action running test_repro.py on Pull Requests
│   └── ISSUE_TEMPLATE/loglens_bug_report.md
├── backend/
│   ├── app.py                          # FastAPI application and route orchestration
│   ├── config.py                       # Configuration & environment loader
│   ├── models.py                       # Pydantic schemas (attendance, evidence, repo/file analysis)
│   ├── date_handler.py                 # Core business logic & demo fix toggle
│   ├── redactor.py                     # Rule-based PII scrubbing preserving failure conditions
│   ├── repo_analyzer.py                # Public GitHub repo fetcher, scanner, and repro generator
│   ├── file_reviewer.py                # File upload sanitizer, line annotator, and smart refactorer
│   ├── ai_service.py                   # Multi-LLM diagnostic engine with code context
│   ├── github_service.py               # GitHub REST API client & markdown generator
│   └── test_generator.py               # Generates standalone test_repro.py scripts
├── frontend/
│   ├── index.html                      # Single page application entry point
│   ├── app.js                          # React 18 dashboard (Tabs: Workflow, Repo Analyzer, File Reviewer)
│   ├── styles.css                      # Clean developer tool UI theme with dark-mode tokens
│   └── vendor/                         # Offline-ready React & Babel bundles
├── test_repro.py                       # Runnable reproduction test
├── test_new_features_browser.py        # Automated headless browser test for all 3 dashboard tabs
├── tests/
│   ├── test_loglens.py                 # Unit tests for core reproduction workflow
│   └── test_features.py                # Unit tests for repo analyzer & file reviewer
├── run.py                              # One-command server runner
└── requirements.txt                    # Minimal Python dependencies
```

---

## 🚀 GitHub Actions Integration

LogLens includes `.github/workflows/repro_check.yml` to automatically verify proposed pull request fixes against the reproduction test in CI before merging.

