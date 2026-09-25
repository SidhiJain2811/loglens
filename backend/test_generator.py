import json
from pathlib import Path
from typing import Optional
from backend.models import NetworkCapture

TEST_TEMPLATE = '''"""
LogLens Auto-Generated Reproduction Test
Workflow: attendance-date-format
Generated from Diagnostic Evidence {issue_ref}
"""
import sys
import json
import urllib.request
import urllib.error

ENDPOINT = "http://127.0.0.1:8000{endpoint}"
METHOD = "{method}"
PAYLOAD = {payload_json}

def run_test():
    print("=" * 65)
    print("REPRODUCTION TEST: attendance-date-format")
    print(f"Request: {{METHOD}} {{ENDPOINT}}")
    print(f"Payload: {{json.dumps(PAYLOAD, indent=2)}}")
    print("-" * 65)

    data = json.dumps(PAYLOAD).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={{"Content-Type": "application/json"}},
        method=METHOD
    )

    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = json.loads(response.read().decode("utf-8"))
            
            if status == 200:
                print("Result: PASS -- now returns 200, attendance recorded")
                print(f"Server response: {{body.get('message', body)}}")
                print("=" * 65)
                return 0
            else:
                print(f"Result: UNEXPECTED STATUS {{status}}")
                print(f"Server response: {{body}}")
                print("=" * 65)
                return 1

    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = str(e)
            
        if status == 400:
            print("Result: FAIL -- still returns 400 Invalid date format")
            print(f"Server response: {{body}}")
            print("Explanation: The backend rejected DD/MM/YYYY date format as expected in unfixed state.")
            print("=" * 65)
            return 1
        else:
            print(f"Result: FAIL -- HTTP {{status}}")
            print(f"Server response: {{body}}")
            print("=" * 65)
            return 1

    except urllib.error.URLError as e:
        print(f"Result: ERROR -- Could not connect to backend at {{ENDPOINT}}.")
        print("Please ensure the LogLens backend is running: python run.py")
        print("=" * 65)
        return 2

if __name__ == "__main__":
    exit_code = run_test()
    sys.exit(exit_code)
'''

def generate_reproduction_test(failed_request: NetworkCapture, issue_number: Optional[int] = None) -> str:
    """
    Generates a standalone, executable python test script replicating the exact
    failing request condition. Saves both to `test_repro.py` (default) and
    `test_repro_<issue_number>.py` (versioned).
    """
    issue_ref = f"(Issue #{issue_number})" if issue_number else "(Local Diagnostic)"
    
    # We use the sanitized request body (safe from personal credentials, but retaining the date)
    script_content = TEST_TEMPLATE.format(
        issue_ref=issue_ref,
        endpoint=failed_request.endpoint,
        method=failed_request.method,
        payload_json=json.dumps(failed_request.request_body, indent=4)
    )

    project_root = Path(__file__).resolve().parent.parent

    # Always write to root `test_repro.py` for instant demo running
    default_test_path = project_root / "test_repro.py"
    default_test_path.write_text(script_content, encoding="utf-8")

    # If issue number provided, also write specific version
    if issue_number:
        versioned_path = project_root / f"test_repro_{issue_number}.py"
        versioned_path.write_text(script_content, encoding="utf-8")

    return script_content
