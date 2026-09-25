from datetime import datetime
from typing import Tuple, Optional, Dict, Any
from backend.models import AttendanceSubmission

# In-memory storage for attendance records (no database required)
attendance_records = []

def parse_and_validate_date(date_str: str, fix_enabled: bool = False) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Validates and standardizes attendance date format.
    
    ORIGINAL BUG:
    Requires strict ISO-8601 (YYYY-MM-DD). If frontend sends DD/MM/YYYY,
    it raises a validation error and rejects the request with HTTP 400.
    
    PROPOSED FIX:
    Accepts both ISO-8601 (YYYY-MM-DD) and common regional format (DD/MM/YYYY),
    normalizing DD/MM/YYYY to standard ISO format for storage.
    """
    if not fix_enabled:
        # Strict validation: Only YYYY-MM-DD is accepted
        try:
            parsed = datetime.strptime(date_str, "%Y-%m-%d")
            return True, parsed.strftime("%Y-%m-%d"), None
        except ValueError:
            return False, "", {
                "error": "Invalid date format",
                "expected": "YYYY-MM-DD",
                "received": date_str
            }
    else:
        # FIX APPLIED: Support both ISO and DD/MM/YYYY formats
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                parsed = datetime.strptime(date_str, fmt)
                return True, parsed.strftime("%Y-%m-%d"), None
            except ValueError:
                continue
        
        return False, "", {
            "error": "Invalid date format",
            "expected": "YYYY-MM-DD or DD/MM/YYYY",
            "received": date_str
        }

def process_attendance(submission: AttendanceSubmission, fix_enabled: bool = False) -> Tuple[int, Dict[str, Any]]:
    """
    Processes attendance record. Returns (status_code, response_data).
    """
    valid, iso_date, error_details = parse_and_validate_date(submission.date, fix_enabled)
    
    if not valid:
        return 400, error_details
        
    record = {
        "id": len(attendance_records) + 1,
        "course_id": submission.course_id,
        "student_name": submission.student_name,
        "student_id": submission.student_id,
        "email": submission.email,
        "phone": submission.phone,
        "date": iso_date,
        "recorded_at": datetime.now().isoformat()
    }
    attendance_records.append(record)
    
    return 200, {
        "success": True,
        "message": f"Attendance recorded for {submission.student_name} on {iso_date}",
        "record": record
    }

def get_date_handler_code_excerpt() -> str:
    """
    Returns the actual backend implementation snippet for LLM diagnostic context.
    """
    return '''def parse_and_validate_date(date_str: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
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
