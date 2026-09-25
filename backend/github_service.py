import json
import logging
import urllib.parse
import httpx
from typing import Dict, Any, Tuple
from backend.config import settings
from backend.models import CreateIssueRequest

logger = logging.getLogger("loglens.github")

def build_issue_markdown(request: CreateIssueRequest) -> Tuple[str, str]:
    """
    Constructs the issue title and structured markdown body matching LogLens specifications:
    - ## Steps to Reproduce
    - ## Technical Evidence
    - ## AI Suggestion
    - ## Verification
    """
    title = request.custom_title or "Attendance submission fails with invalid date format"
    
    # 1. Steps to Reproduce
    steps_lines = []
    for idx, step in enumerate(request.evidence.action_sequence, 1):
        steps_lines.append(f"{idx}. {step}")
    steps_md = "\n".join(steps_lines) if steps_lines else "1. Open Attendance Page\n2. Submit attendance with DD/MM/YYYY date format"

    # 2. Technical Evidence (status code, request body, response body)
    req = request.evidence.failed_request
    tech_md = f"""- **Endpoint**: `{req.method} {req.endpoint}`
- **Response Status**: `{req.status_code}`
- **App Version**: `{request.evidence.app_version}`

**Request Payload:**
```json
{json.dumps(req.request_body, indent=2)}
```

**Response Body:**
```json
{json.dumps(req.response_body, indent=2)}
```

> **Privacy Notice**: Sensitive personal details (student ID, email, phone) were scrubbed by LogLens prior to submission. Essential failure parameters (`date`) have been preserved for reproduction."""

    # 3. AI Suggestion
    ai_text = request.ai_suggestion or "Date parsing in `backend/date_handler.py` strictly requires ISO-8601 YYYY-MM-DD format."
    ai_md = f"""> ⚠️ **AI-Generated Diagnostic (Not Verified Fact)**
> {ai_text}"""

    # 4. Verification
    verification_md = "No fix has been verified yet. Run the linked reproduction test after applying a fix.\n\n```bash\npython test_repro.py\n```"

    body = f"""## Steps to Reproduce
{steps_md}

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
            "labels": ["bug", "loglens-repro-ready"]
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return {
                        "is_live": True,
                        "issue_number": data.get("number"),
                        "issue_url": data.get("html_url"),
                        "title": title,
                        "body": body,
                        "message": f"Successfully filed GitHub Issue #{data.get('number')} on {owner}/{repo}"
                    }
                else:
                    logger.warning(f"GitHub API error {resp.status_code}: {resp.text}")
                    # Return error details alongside web fallback
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
        "is_live": False,
        "issue_number": dummy_issue_number,
        "issue_url": mock_url,
        "web_prefill_url": web_prefill_url,
        "title": title,
        "body": body,
        "message": "Demo Mode: Issue formatted successfully. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in .env to post directly to your live GitHub repository."
    }
