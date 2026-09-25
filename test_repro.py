"""
LogLens Auto-Generated Reproduction Test
Workflow: attendance-date-format
Generated from Diagnostic Evidence (Issue #42)
"""
import sys
import json
import urllib.request
import urllib.error

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
    print("🔍 REPRODUCTION TEST: attendance-date-format")
    print(f"Request: {METHOD} {ENDPOINT}")
    print(f"Payload: {json.dumps(PAYLOAD, indent=2)}")
    print("-" * 65)

    data = json.dumps(PAYLOAD).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json"},
        method=METHOD
    )

    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            
            if status == 200:
                print("Result: PASS — now returns 200, attendance recorded")
                print(f"Server response: {body.get('message', body)}")
                print("=" * 65)
                return 0
            else:
                print(f"Result: UNEXPECTED STATUS {status}")
                print(f"Server response: {body}")
                print("=" * 65)
                return 1

    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = str(e)
            
        if status == 400:
            print("Result: FAIL — still returns 400 Invalid date format")
            print(f"Server response: {body}")
            print("Explanation: The backend rejected DD/MM/YYYY date format as expected in unfixed state.")
            print("=" * 65)
            return 1
        else:
            print(f"Result: FAIL — HTTP {status}")
            print(f"Server response: {body}")
            print("=" * 65)
            return 1

    except urllib.error.URLError as e:
        print(f"Result: ERROR — Could not connect to backend at {ENDPOINT}.")
        print("Please ensure the LogLens backend is running: python run.py")
        print("=" * 65)
        return 2

if __name__ == "__main__":
    exit_code = run_test()
    sys.exit(exit_code)
