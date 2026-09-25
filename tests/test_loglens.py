import sys
import unittest
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.models import AttendanceSubmission, RawEvidence, NetworkCapture, CreateIssueRequest
from backend.date_handler import process_attendance, parse_and_validate_date
from backend.redactor import redact_evidence
from backend.github_service import build_issue_markdown
from backend.test_generator import generate_reproduction_test

class TestLogLensCore(unittest.TestCase):
    def test_date_validation_unfixed_rejects_dd_mm_yyyy(self):
        valid, iso_date, error = parse_and_validate_date("25/09/2026", fix_enabled=False)
        self.assertFalse(valid)
        self.assertEqual(error["error"], "Invalid date format")
        self.assertEqual(error["expected"], "YYYY-MM-DD")
        self.assertEqual(error["received"], "25/09/2026")

    def test_date_validation_fixed_accepts_dd_mm_yyyy(self):
        valid, iso_date, error = parse_and_validate_date("25/09/2026", fix_enabled=True)
        self.assertTrue(valid)
        self.assertEqual(iso_date, "2026-09-25")
        self.assertIsNone(error)

    def test_privacy_redactor_scrubs_pii_and_preserves_bug_conditions(self):
        raw = RawEvidence(
            action_sequence=["Opened page", "User said contact me at admin@test.com", "Selected date: 25/09/2026"],
            failed_request=NetworkCapture(
                method="POST",
                endpoint="/api/attendance",
                request_body={
                    "course_id": "CS101",
                    "student_name": "Alex Mercer",
                    "student_id": "STU-98421",
                    "email": "alex.mercer@university.edu",
                    "phone": "+1-555-0199",
                    "date": "25/09/2026"
                },
                status_code=400,
                response_body={"error": "Invalid date format", "expected": "YYYY-MM-DD", "received": "25/09/2026"}
            ),
            app_version="v1.2.4-beta",
            user_profile={
                "student_id": "STU-98421",
                "email": "alex.mercer@university.edu",
                "phone": "+1-555-0199",
                "role": "student"
            }
        )

        redacted = redact_evidence(raw)

        # 1. PII should be [REDACTED]
        self.assertEqual(redacted.user_profile["student_id"], "[REDACTED]")
        self.assertEqual(redacted.user_profile["email"], "[REDACTED]")
        self.assertEqual(redacted.user_profile["phone"], "[REDACTED]")
        self.assertEqual(redacted.failed_request.request_body["student_id"], "[REDACTED]")
        self.assertEqual(redacted.failed_request.request_body["email"], "[REDACTED]")
        self.assertEqual(redacted.failed_request.request_body["phone"], "[REDACTED]")

        # 2. Free text email in actions should be [REDACTED_EMAIL]
        self.assertIn("[REDACTED_EMAIL]", redacted.action_sequence[1])

        # 3. CRITICAL: The date value MUST be preserved intact for bug reproduction!
        self.assertEqual(redacted.failed_request.request_body["date"], "25/09/2026")
        self.assertEqual(redacted.failed_request.request_body["course_id"], "CS101")

    def test_github_issue_markdown_structure(self):
        raw = RawEvidence(
            action_sequence=["Step 1: Open page", "Step 2: Submit 25/09/2026"],
            failed_request=NetworkCapture(
                method="POST",
                endpoint="/api/attendance",
                request_body={"date": "25/09/2026"},
                status_code=400,
                response_body={"error": "Invalid date format"}
            ),
            app_version="v1.2.4-beta",
            user_profile={"email": "[REDACTED]"}
        )
        redacted = redact_evidence(raw)
        req = CreateIssueRequest(
            evidence=redacted,
            ai_suggestion="Function parse_and_validate_date requires YYYY-MM-DD."
        )
        title, body = build_issue_markdown(req)

        self.assertIn("## Steps to Reproduce", body)
        self.assertIn("## Technical Evidence", body)
        self.assertIn("## AI Suggestion", body)
        self.assertIn("## Verification", body)
        self.assertIn("python test_repro.py", body)

    def test_reproduction_test_generator(self):
        failed_req = NetworkCapture(
            method="POST",
            endpoint="/api/attendance",
            request_body={"course_id": "CS101", "student_name": "Alex Mercer", "date": "25/09/2026"},
            status_code=400,
            response_body={"error": "Invalid date format"}
        )
        script = generate_reproduction_test(failed_req)
        self.assertIn("REPRODUCTION TEST: attendance-date-format", script)
        self.assertIn("/api/attendance", script)
        self.assertIn("25/09/2026", script)

if __name__ == "__main__":
    unittest.main()
