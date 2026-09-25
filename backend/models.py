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
