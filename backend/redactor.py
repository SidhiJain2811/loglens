import re
from typing import Any, Dict, List, Tuple
from copy import deepcopy
from backend.models import RawEvidence, RedactedEvidence, NetworkCapture

# Exact sensitive field names to redact
SENSITIVE_FIELD_KEYS = {
    "email",
    "student_id",
    "phone",
    "studentId",
    "phoneNumber",
    "ssn",
    "password",
    "secret"
}

# Critical fields that MUST be preserved for bug reproduction
PRESERVED_FAILURE_KEYS = {
    "date",
    "expected",
    "received",
    "status_code",
    "error",
    "course_id",
    "endpoint",
    "method"
}

EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

def redact_text_content(text: str) -> Tuple[str, bool]:
    """Redacts any email addresses found in free text strings."""
    if not isinstance(text, str):
        return text, False
    redacted_text, count = EMAIL_REGEX.subn("[REDACTED_EMAIL]", text)
    return redacted_text, count > 0

def sanitize_value(val: Any, key_name: str = "", path: str = "", summary: List[str] = None) -> Any:
    """
    Recursively redacts sensitive values while preserving bug reproduction conditions.
    """
    if summary is None:
        summary = []

    current_key = key_name.lower().strip()

    # Never redact critical failure conditions (like date)
    if current_key in PRESERVED_FAILURE_KEYS:
        return val

    # Direct sensitive key name match
    if current_key in SENSITIVE_FIELD_KEYS:
        if val != "[REDACTED]":
            summary.append(f"{path or key_name}: replaced with [REDACTED]")
        return "[REDACTED]"

    if isinstance(val, dict):
        new_dict = {}
        for k, v in val.items():
            child_path = f"{path}.{k}" if path else k
            new_dict[k] = sanitize_value(v, key_name=k, path=child_path, summary=summary)
        return new_dict

    elif isinstance(val, list):
        new_list = []
        for idx, item in enumerate(val):
            child_path = f"{path}[{idx}]"
            new_list.append(sanitize_value(item, key_name=key_name, path=child_path, summary=summary))
        return new_list

    elif isinstance(val, str):
        redacted_str, was_redacted = redact_text_content(val)
        if was_redacted:
            summary.append(f"{path or key_name}: free-text email replaced with [REDACTED_EMAIL]")
        return redacted_str

    return val

def redact_evidence(raw_evidence: RawEvidence) -> RedactedEvidence:
    """
    Transforms raw captured diagnostic data into privacy-filtered evidence.
    Ensures PII (email, student_id, phone) is scrubbed, while critical failure data
    (such as date='25/09/2026') is strictly preserved.
    """
    summary: List[str] = []
    preserved: List[str] = []

    # 1. Sanitize user profile (high PII risk)
    sanitized_profile = sanitize_value(deepcopy(raw_evidence.user_profile), path="user_profile", summary=summary)

    # 2. Sanitize request body
    req_body_copy = deepcopy(raw_evidence.failed_request.request_body)
    
    # Check failure condition preservation
    if "date" in req_body_copy:
        preserved.append(f"request_body.date = '{req_body_copy['date']}' (kept intact for reproduction)")

    sanitized_req_body = sanitize_value(req_body_copy, path="request_body", summary=summary)

    # 3. Sanitize response body
    sanitized_resp_body = sanitize_value(deepcopy(raw_evidence.failed_request.response_body), path="response_body", summary=summary)

    # 4. Action sequence free-text check
    sanitized_actions = []
    for idx, action in enumerate(raw_evidence.action_sequence):
        s_action, had_email = redact_text_content(action)
        if had_email:
            summary.append(f"action_sequence[{idx}]: stripped email in action step")
        sanitized_actions.append(s_action)

    sanitized_network = NetworkCapture(
        method=raw_evidence.failed_request.method,
        endpoint=raw_evidence.failed_request.endpoint,
        request_body=sanitized_req_body,
        status_code=raw_evidence.failed_request.status_code,
        response_body=sanitized_resp_body
    )

    return RedactedEvidence(
        action_sequence=sanitized_actions,
        failed_request=sanitized_network,
        app_version=raw_evidence.app_version,
        user_profile=sanitized_profile,
        redacted_fields_summary=summary,
        preserved_bug_fields=preserved
    )
