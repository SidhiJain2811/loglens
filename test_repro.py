"""
LogLens Auto-Generated Reproduction Test
Workflow: attendance-date-format
Generated from Diagnostic Evidence (Attendance Verification)
"""
import sys
import json
import urllib.request
import urllib.error

# Ensure terminal stdout handles output safely on all platforms
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ENDPOINT = "http://127.0.0.1:8000/api/attendance"
METHOD = "POST"
PAYLOAD = {
    "course_id": "CS101",
    "student_name": "Alex Mercer",
    "student_id": "[REDACTED]",
    "email": "[REDACTED]",
    "phone": "[REDACTED]",
    "date": "25/09/2026"
}

def run_test():
    print("=" * 65)
    print("LOGLENS REPRODUCTION TEST: attendance-date-format")
    print(f"Target: {METHOD} {ENDPOINT}")
    print(f"Payload Date: '{PAYLOAD.get('date')}'")
    print("-" * 65)

    data = json.dumps(PAYLOAD).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json"},
        method=METHOD
    )

    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            status = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            
            if status == 200:
                print(">>> TEST RESULT: PASS")
                print(">>> STATUS: HTTP 200 OK")
                print(f">>> DETAIL: {body.get('message', 'Attendance recorded')}")
                print(">>> VERIFICATION: Fix verified! Request succeeded.")
                print("=" * 65)
                return 0
            else:
                print(f">>> TEST RESULT: UNEXPECTED STATUS ({status})")
                print(f">>> DETAIL: {body}")
                print("=" * 65)
                return 1

    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = {"raw_error": str(e)}
            
        if status == 400:
            print(">>> TEST RESULT: FAIL")
            print(">>> STATUS: HTTP 400 Bad Request")
            print(f">>> ERROR: {body.get('error', 'Invalid date format')}")
            print(f">>> EXPECTED: {body.get('expected', 'YYYY-MM-DD')} | RECEIVED: '{body.get('received', PAYLOAD.get('date'))}'")
            print(">>> EXPLANATION: Original bug reproduced (backend rejects DD/MM/YYYY date format).")
            print("=" * 65)
            return 1
        else:
            print(f">>> TEST RESULT: FAIL (HTTP {status})")
            print(f">>> DETAIL: {body}")
            print("=" * 65)
            return 1

    except urllib.error.URLError as e:
        print(f">>> TEST RESULT: ERROR")
        print(f">>> DETAIL: Could not connect to backend at {ENDPOINT}.")
        print(">>> ACTION: Please ensure the LogLens server is running: python run.py")
        print("=" * 65)
        return 2

if __name__ == "__main__":
    exit_code = run_test()
    sys.exit(exit_code)
