---
name: LogLens Verified Bug Report
about: Structured, privacy-filtered diagnostic evidence with runnable reproduction test
title: '[LogLens]: '
labels: ['bug', 'loglens-repro-ready']
assignees: ''
---

## Steps to Reproduce
<!-- The sequential client-side user actions recorded leading up to the failure -->
1. Open Attendance Page
2. Select course CS101
3. Select date 25/09/2026
4. Click 'Submit Attendance'

## Technical Evidence
<!-- Network details with PII automatically redacted by LogLens -->
- **Endpoint**: `POST /api/attendance`
- **Response Status**: `400`
- **App Version**: `v1.2.4-beta`

**Request Payload:**
```json
{
  "course_id": "CS101",
  "student_name": "Alex Mercer",
  "student_id": "[REDACTED]",
  "email": "[REDACTED]",
  "phone": "[REDACTED]",
  "date": "25/09/2026"
}
```

**Response Body:**
```json
{
  "error": "Invalid date format",
  "expected": "YYYY-MM-DD",
  "received": "25/09/2026"
}
```

## AI Suggestion
> ⚠️ **AI-Generated Diagnostic (Not Verified Fact)**
> The backend function `parse_and_validate_date` in `backend/date_handler.py` strictly expects ISO format 'YYYY-MM-DD' and rejects regional 'DD/MM/YYYY'.

## Verification
No fix has been verified yet. Run the linked reproduction test after applying a fix:

```bash
python test_repro.py
```
