from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class AttendanceSubmission(BaseModel):
    course_id: str = Field(..., example="CS101")
    student_name: str = Field(..., example="Alex Mercer")
    student_id: Optional[str] = Field("STU-98421", example="STU-98421")
    email: Optional[str] = Field("alex.mercer@university.edu", example="alex.mercer@university.edu")
    phone: Optional[str] = Field("+1-555-0199", example="+1-555-0199")
    date: str = Field(..., example="25/09/2026")

class NetworkCapture(BaseModel):
    method: str
    endpoint: str
    request_body: Dict[str, Any]
    status_code: int
    response_body: Dict[str, Any]

class RawEvidence(BaseModel):
    action_sequence: List[str]
    failed_request: NetworkCapture
    app_version: str = "v1.2.4-beta"
    user_profile: Dict[str, Any]

class RedactedEvidence(BaseModel):
    action_sequence: List[str]
    failed_request: NetworkCapture
    app_version: str
    user_profile: Dict[str, Any]
    redacted_fields_summary: List[str] = []
    preserved_bug_fields: List[str] = []

class CreateIssueRequest(BaseModel):
    evidence: RedactedEvidence
    ai_suggestion: Optional[str] = None
    custom_title: Optional[str] = None

class ToggleFixRequest(BaseModel):
    enabled: bool

# Feature 1: GitHub Repo Analyzer Models
class AnalyzeRepoRequest(BaseModel):
    repo_url: str = Field(..., example="https://github.com/fastapi/fastapi")

class RepoIssueItem(BaseModel):
    id: str
    file: str
    line: Optional[int] = None
    type: str
    severity: str  # 'critical' | 'warning' | 'info'
    description: str
    snippet: Optional[str] = None

class AnalyzeRepoResponse(BaseModel):
    repo: str
    repo_url: str
    summary: str
    scanned_files: List[str]
    issues_found: List[RepoIssueItem]
    recommended_fixes: List[str]
    repro_script_preview: str

# Feature 2: File Upload Code Reviewer Models
class FileAnnotation(BaseModel):
    line: int
    category: str
    severity: str  # 'high' | 'medium' | 'low'
    comment: str

class AnalyzeFileResponse(BaseModel):
    filename: str
    language: str
    line_count: int
    annotations: List[FileAnnotation]
    improved_code: str
    checklist: List[str]
    sanitized_secrets_count: int

