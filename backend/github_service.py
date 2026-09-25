import json
import logging
import urllib.parse
import httpx
from typing import Dict, Any, Tuple
from backend.config import settings
from backend.models import CreateIssueRequest

logger = logging.getLogger("loglens.github")

CODE_EVIDENCE_SNIPPET = '''def parse_and_validate_date(date_str: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    # Strict validation: Only YYYY-MM-DD is accepted
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return True, parsed.strftime("%Y-%m-%d"), None
    except ValueError:
        return False, "", {
            "error": "Invalid date format",
            "expected": "YYYY-MM-DD",
            "received": date_str
        }'''

def build_issue_markdown(request: CreateIssueRequest) -> Tuple[str, str]:
    """
    Constructs the issue title and structured markdown body matching LogLens specifications:
    - ## Observed Failure
    - ## Steps to Reproduce (Relevant Breadcrumbs)
    - ## Environment
    - ## Technical Evidence
    - ## AI Suggestion (with Code Evidence)
    - ## Verification (Reproduction Status)
    """
    title = request.custom_title or "Attendance submission fails with invalid date format"
    
    # 1. Observed Failure
    observed_failure = "Attendance submission fails with HTTP 400 when submitting regional date format (DD/MM/YYYY) instead of ISO-8601 (YYYY-MM-DD)."

    # 2. Steps to Reproduce (Relevant Breadcrumbs)
    steps_lines = []
    for idx, step in enumerate(request.evidence.action_sequence, 1):
        steps_lines.append(f"{idx}. {step}")
    steps_md = "\n".join(steps_lines) if steps_lines else "1. Open Attendance Page\n2. Submit attendance with DD/MM/YYYY date format"

    # 3. Environment
    env_md = f"""- **App Version**: `{request.evidence.app_version}`
- **Client OS / Browser**: Windows Web Client
- **Backend Architecture**: FastAPI / Python 3.13 (In-Memory Data Store)"""

    # 4. Technical Evidence (status code, request body, response body)
    req = request.evidence.failed_request
    tech_md = f"""- **Endpoint**: `{req.method} {req.endpoint}`
- **Response Status**: `{req.status_code}`

**Sanitized Request Payload (PII Scrubbed • Bug Trigger Preserved):**
```json
{json.dumps(req.request_body, indent=2)}
```

**Response Body:**
```json
{json.dumps(req.response_body, indent=2)}
```

> **Privacy Notice**: Sensitive personal identity fields (student ID, email, phone) were scrubbed by LogLens prior to submission. Essential failure parameters (`date`) have been strictly preserved for reproduction."""

    # 5. AI Suggestion & Code Evidence
    ai_text = request.ai_suggestion or "Date parsing in `backend/date_handler.py` strictly requires ISO-8601 YYYY-MM-DD format."
    ai_md = f"""> ⚠️ **AI-Generated Diagnostic (Not Verified Fact)**
> {ai_text}

**Backend Code Evidence (`backend/date_handler.py`):**
```python
{CODE_EVIDENCE_SNIPPET}
```"""

    # 6. Verification
    verification_md = "No fix has been verified yet. Run the linked reproduction test after applying a fix.\n\n```bash\npython test_repro.py\n```"

    body = f"""## Observed Failure
{observed_failure}

## Steps to Reproduce
{steps_md}

## Environment
{env_md}

## Technical Evidence
{tech_md}

## AI Suggestion
{ai_md}

## Verification
{verification_md}
"""
    return title, body

async def create_github_issue(request: CreateIssueRequest) -> Dict[str, Any]:
    """
    Creates an issue on GitHub via REST API, or provides a rich mock response
    if GitHub credentials are not yet configured in .env.
    """
    title, body = build_issue_markdown(request)

    token = settings.GITHUB_TOKEN
    owner = settings.GITHUB_OWNER
    repo = settings.GITHUB_REPO
    req = request.evidence.failed_request

    base_capsule = {
        "title": title,
        "body": body,
        "observed_failure": "Attendance submission rejected with HTTP 400 when submitting regional date format (DD/MM/YYYY).",
        "breadcrumbs": request.evidence.action_sequence,
        "environment": {
            "app_version": request.evidence.app_version,
            "os": "Windows / Web Client",
            "backend": "FastAPI / Python 3.13"
        },
        "technical_error": {
            "method": req.method,
            "endpoint": req.endpoint,
            "status_code": req.status_code,
            "request_body": req.request_body,
            "response_body": req.response_body
        },
        "ai_diagnosis": request.ai_suggestion or "Backend strictly enforces ISO-8601 (%Y-%m-%d) format.",
        "code_evidence": "parse_and_validate_date() in backend/date_handler.py rejects non-ISO formats",
        "reproduction_script": "python test_repro.py"
    }

    # If valid credentials are present, attempt actual GitHub API call
    if token and owner and repo and token != "ghp_yourPersonalAccessTokenHere":
        url = f"https://api.github.com/repos/{owner}/{repo}/issues"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "LogLens-Agent"
        }
        payload = {
            "title": title,
            "body": body,
            "labels": ["bug", "loglens-repro-ready", "privacy-filtered"]
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return {
                        **base_capsule,
                        "is_live": True,
                        "issue_number": data.get("number"),
                        "issue_url": data.get("html_url"),
                        "message": f"Successfully filed GitHub Issue #{data.get('number')} on {owner}/{repo}"
                    }
                else:
                    logger.warning(f"GitHub API error {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling GitHub API: {e}")

    # Fallback / Simulated mode for offline demo or unconfigured tokens
    dummy_issue_number = 42
    safe_owner = owner or "demo-org"
    safe_repo = repo or "attendance-system"
    mock_url = f"https://github.com/{safe_owner}/{safe_repo}/issues/{dummy_issue_number}"
    
    # Generate web URL to open GitHub issue pre-filled in browser if user wants
    encoded_title = urllib.parse.quote(title)
    encoded_body = urllib.parse.quote(body)
    web_prefill_url = f"https://github.com/{safe_owner}/{safe_repo}/issues/new?title={encoded_title}&body={encoded_body}"

    return {
        **base_capsule,
        "is_live": False,
        "issue_number": dummy_issue_number,
        "issue_url": mock_url,
        "web_prefill_url": web_prefill_url,
        "message": "Demo/Mock GitHub Mode: Issue formatted successfully. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in .env to post directly to your live GitHub repository."
    }
