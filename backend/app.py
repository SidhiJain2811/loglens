import os
import sys
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.config import settings
from backend.models import (
    AttendanceSubmission,
    RawEvidence,
    RedactedEvidence,
    CreateIssueRequest,
    ToggleFixRequest
)
from backend.date_handler import process_attendance, attendance_records
from backend.redactor import redact_evidence
from backend.ai_service import generate_ai_explanation
from backend.github_service import create_github_issue
from backend.test_generator import generate_reproduction_test

app = FastAPI(
    title="LogLens Diagnostic Platform",
    description="Privacy-preserving bug reproduction & GitHub issue automation engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = Path(__file__).resolve().parent.parent / "frontend"

@app.get("/api/status")
def get_system_status():
    has_github = bool(
        settings.GITHUB_TOKEN and 
        settings.GITHUB_TOKEN != "ghp_yourPersonalAccessTokenHere" and
        settings.GITHUB_OWNER and 
        settings.GITHUB_REPO
    )
    has_llm = bool(
        settings.GEMINI_API_KEY or 
        settings.OPENAI_API_KEY or 
        settings.ANTHROPIC_API_KEY
    )
    return {
        "fix_enabled": settings.FIX_ENABLED,
        "github_connected": has_github,
        "github_owner": settings.GITHUB_OWNER or "demo-org",
        "github_repo": settings.GITHUB_REPO or "attendance-system",
        "llm_connected": has_llm,
        "llm_provider": "Gemini" if settings.GEMINI_API_KEY else ("OpenAI" if settings.OPENAI_API_KEY else ("Anthropic" if settings.ANTHROPIC_API_KEY else "LogLens Built-in Engine")),
        "records_count": len(attendance_records)
    }

from pydantic import BaseModel
class UpdateConfigRequest(BaseModel):
    github_token: str = ""
    github_owner: str = ""
    github_repo: str = ""
    gemini_api_key: str = ""

@app.post("/api/config")
def update_system_config(payload: UpdateConfigRequest):
    if payload.github_token:
        settings.GITHUB_TOKEN = payload.github_token.strip()
    if payload.github_owner:
        settings.GITHUB_OWNER = payload.github_owner.strip()
    if payload.github_repo:
        settings.GITHUB_REPO = payload.github_repo.strip()
    if payload.gemini_api_key:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip()
        
    return get_system_status()

@app.post("/api/attendance")
def submit_attendance(submission: AttendanceSubmission):
    status_code, response_data = process_attendance(submission, settings.FIX_ENABLED)
    if status_code != 200:
        return JSONResponse(status_code=status_code, content=response_data)
    return response_data

@app.post("/api/toggle-fix")
def toggle_fix(payload: ToggleFixRequest):
    settings.FIX_ENABLED = payload.enabled
    return {
        "fix_enabled": settings.FIX_ENABLED,
        "message": f"Backend date validation fix {'ENABLED (accepts DD/MM/YYYY)' if settings.FIX_ENABLED else 'DISABLED (requires ISO YYYY-MM-DD)'}"
    }

@app.post("/api/loglens/redact")
async def prepare_diagnostic_evidence(raw_evidence: RawEvidence):
    """
    Applies rule-based privacy redactor, generates AI explanation,
    and constructs the initial reproduction test script.
    """
    # 1. Redact sensitive PII while strictly protecting bug conditions
    redacted = redact_evidence(raw_evidence)

    # 2. Generate AI explanation with real code context
    ai_explanation = await generate_ai_explanation(redacted.failed_request)

    # 3. Generate initial reproduction test script
    test_script = generate_reproduction_test(redacted.failed_request)

    return {
        "evidence": redacted,
        "ai_suggestion": ai_explanation,
        "test_script_preview": test_script
    }

@app.post("/api/loglens/create-issue")
async def file_issue(request: CreateIssueRequest):
    """
    Files structured issue to GitHub and persists reproduction test.
    """
    issue_result = await create_github_issue(request)
    issue_num = issue_result.get("issue_number")
    
    # Save versioned reproduction test script
    generate_reproduction_test(request.evidence.failed_request, issue_number=issue_num)

    return issue_result

@app.get("/api/loglens/test-script")
def get_current_test_script():
    project_root = Path(__file__).resolve().parent.parent
    test_path = project_root / "test_repro.py"
    if test_path.exists():
        return {"content": test_path.read_text(encoding="utf-8")}
    return {"content": "# Reproduction test not yet generated."}

@app.post("/api/loglens/run-test")
def execute_reproduction_test():
    """
    Executes the standalone reproduction test script in a sub-process
    and returns its output and exit code.
    """
    project_root = Path(__file__).resolve().parent.parent
    test_path = project_root / "test_repro.py"
    
    if not test_path.exists():
        raise HTTPException(status_code=404, detail="test_repro.py has not been generated yet.")

    try:
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        proc = subprocess.run(
            [sys.executable, str(test_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
            timeout=8
        )
        combined_output = proc.stdout or ""
        if proc.stderr:
            combined_output = f"{combined_output}\n{proc.stderr}".strip()

        return {
            "exit_code": proc.returncode,
            "passed": proc.returncode == 0,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "output": combined_output
        }
    except subprocess.TimeoutExpired:
        return {
            "exit_code": -1,
            "passed": False,
            "stdout": "",
            "stderr": "Execution timed out after 8s",
            "output": ">>> TEST TIMED OUT: Could not reach backend in 8 seconds. Please check if server is active."
        }
    except Exception as e:
        return {
            "exit_code": -1,
            "passed": False,
            "stdout": "",
            "stderr": str(e),
            "output": f">>> TEST RUN ERROR: {str(e)}"
        }

# Mount static frontend
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

@app.get("/")
def serve_frontend_index():
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "LogLens API Running. Frontend directory not found."}
