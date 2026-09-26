import sys
import unittest
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.repo_analyzer import parse_github_url, analyze_source_code
from backend.file_reviewer import sanitize_code_content, analyze_and_refactor_file
from fastapi.testclient import TestClient
from backend.app import app

class TestNewFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_parse_github_url(self):
        # Valid URLs
        cases = [
            ("https://github.com/fastapi/fastapi", ("fastapi", "fastapi")),
            ("http://github.com/owner/repo.git", ("owner", "repo")),
            ("github.com/my-org/my-project/", ("my-org", "my-project")),
            ("demo-org/attendance-system", ("demo-org", "attendance-system"))
        ]
        for url, expected in cases:
            self.assertEqual(parse_github_url(url), expected)

        # Invalid URLs
        with self.assertRaises(ValueError):
            parse_github_url("https://notgithub.com/justafile.txt")
        with self.assertRaises(ValueError):
            parse_github_url("just-a-single-string")

    def test_code_sanitizer(self):
        raw_code = '''
api_key = "ghp_123456789012345678901234567890123456"
openai_secret = "sk-abcdef1234567890abcdef1234567890"
author_email = "student.alex@university.edu"
'''
        sanitized, count = sanitize_code_content(raw_code)
        self.assertNotIn("ghp_123456789012345678901234567890123456", sanitized)
        self.assertNotIn("sk-abcdef1234567890abcdef1234567890", sanitized)
        self.assertNotIn("student.alex@university.edu", sanitized)
        self.assertIn("[REDACTED_GITHUB_TOKEN]", sanitized)
        self.assertIn("[REDACTED_OPENAI_KEY]", sanitized)
        self.assertIn("[REDACTED_EMAIL]", sanitized)
        self.assertGreaterEqual(count, 3)

    def test_analyze_repo_endpoint(self):
        res = self.client.post("/api/analyze-repo", json={"repo_url": "https://github.com/demo-org/attendance-system"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("repo", data)
        self.assertIn("summary", data)
        self.assertIn("issues_found", data)
        self.assertIn("recommended_fixes", data)
        self.assertIn("repro_script_preview", data)
        self.assertGreater(len(data["issues_found"]), 0)
        # Check that repro script contains runnable code
        self.assertIn("def run_reproduction", data["repro_script_preview"])

    def test_analyze_repo_invalid_url(self):
        res = self.client.post("/api/analyze-repo", json={"repo_url": "invalid-url"})
        self.assertEqual(res.status_code, 400)

    def test_analyze_file_endpoint_python(self):
        sample_py = '''
from datetime import datetime
def check_date(d):
    try:
        return datetime.strptime(d, "%Y-%m-%d")
    except:
        return None
'''
        res = self.client.post("/api/analyze-code", json={"filename": "date_checker.py", "content": sample_py})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["language"], "python")
        self.assertGreaterEqual(len(data["annotations"]), 1)
        self.assertIn("parse_and_validate_date", data["improved_code"])
        self.assertGreaterEqual(len(data["checklist"]), 2)

    def test_analyze_file_multipart_upload(self):
        sample_js = '''
function parseInput(val) {
    console.log("Debug:", val);
    const d = new Date(val);
    return d;
}
'''
        files = {"file": ("test_script.js", sample_js.encode("utf-8"), "application/javascript")}
        res = self.client.post("/api/analyze-file", files=files)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["language"], "javascript")
        self.assertIn("improved_code", data)

    def test_analyze_file_unsupported_extension(self):
        files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}
        res = self.client.post("/api/analyze-file", files=files)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file format", res.json()["detail"])

if __name__ == "__main__":
    unittest.main()
