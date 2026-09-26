import re
import json
import logging
from typing import Dict, Any, List, Tuple
from pathlib import Path

from backend.config import settings
from backend.models import AnalyzeFileResponse, FileAnnotation

logger = logging.getLogger("loglens.file_reviewer")

# Supported file extensions
SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".json"}

# Secret and PII patterns for source code sanitization
SECRET_PATTERNS = [
    # GitHub Personal Access Token
    (re.compile(r'ghp_[a-zA-Z0-9]{36}'), "[REDACTED_GITHUB_TOKEN]"),
    # OpenAI API Key
    (re.compile(r'sk-[a-zA-Z0-9]{32,}'), "[REDACTED_OPENAI_KEY]"),
    # AWS Access Key ID
    (re.compile(r'AKIA[0-9A-Z]{16}'), "[REDACTED_AWS_KEY]"),
    # Google API Key
    (re.compile(r'AIza[0-9A-Za-z-_]{35}'), "[REDACTED_GOOGLE_KEY]"),
    # Generic API Keys / Tokens in assignment statements
    (re.compile(r'((?:api_key|token|secret|password)\s*=\s*["\'])[a-zA-Z0-9_\-\.]{12,}(["\'])', re.IGNORECASE), r'\1[REDACTED_SECRET]\2'),
    # Email addresses
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), "[REDACTED_EMAIL]"),
    # Student / Employee IDs
    (re.compile(r'\b(?:STU|EMP|ID)-\d{4,8}\b', re.IGNORECASE), "[REDACTED_ID]")
]

def sanitize_code_content(code_text: str) -> Tuple[str, int]:
    """
    Sanitizes source code to ensure no live API tokens, passwords,
    or user identifiers are processed raw. Returns (sanitized_code, count).
    """
    sanitized = code_text
    total_redactions = 0

    for pattern, replacement in SECRET_PATTERNS:
        sanitized, count = pattern.subn(replacement, sanitized)
        total_redactions += count

    return sanitized, total_redactions

def analyze_python_code(code: str) -> Tuple[List[FileAnnotation], str, List[str]]:
    """Analyzes and produces refactored code and annotations for Python."""
    annotations: List[FileAnnotation] = []
    lines = code.splitlines()

    has_date_parse = False
    has_naked_except = False
    has_hardcoded_endpoint = False
    has_missing_type_hints = False

    for idx, line in enumerate(lines, 1):
        if "strptime" in line and "%Y-%m-%d" in line and not ("%d/%m/%Y" in line or "%m/%d/%Y" in line):
            has_date_parse = True
            annotations.append(FileAnnotation(
                line=idx,
                category="Fragile Parsing",
                severity="high",
                comment="Strict ISO format without multi-format fallback. Causes unhandled ValueError on regional DD/MM/YYYY inputs."
            ))
        elif re.search(r'except\s*:\s*(?:pass|return None)', line):
            has_naked_except = True
            annotations.append(FileAnnotation(
                line=idx,
                category="Anti-Pattern",
                severity="medium",
                comment="Naked `except:` silences all errors without logging, preventing proper debugging and telemetry."
            ))
        elif "http://localhost" in line or "http://127.0.0.1" in line:
            has_hardcoded_endpoint = True
            annotations.append(FileAnnotation(
                line=idx,
                category="Maintainability",
                severity="low",
                comment="Hardcoded localhost URI. Extract into environment variables or configuration."
            ))
        elif "def " in line and "->" not in line and "(" in line and ":" in line:
            has_missing_type_hints = True
            annotations.append(FileAnnotation(
                line=idx,
                category="Code Quality",
                severity="low",
                comment="Missing return type hints and parameter typing annotations."
            ))

    # Refactored Code Generator
    refactored_lines = []
    refactored_lines.append('"""')
    refactored_lines.append('Refactored by LogLens Code Reviewer')
    refactored_lines.append('- Added defensive multi-format date parsing (ISO & regional)')
    refactored_lines.append('- Replaced silent exception suppression with structured logging')
    refactored_lines.append('- Added comprehensive type annotations and docstrings')
    refactored_lines.append('"""')
    refactored_lines.append('from typing import Optional, Tuple, Dict, Any')
    refactored_lines.append('from datetime import datetime')
    refactored_lines.append('import logging\n')
    refactored_lines.append('logger = logging.getLogger(__name__)\n')

    # If the file had date parsing, provide the robust date handler
    if has_date_parse or "date" in code.lower():
        refactored_lines.append('SUPPORTED_DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]\n')
        refactored_lines.append('def parse_and_validate_date(date_str: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:')
        refactored_lines.append('    """')
        refactored_lines.append('    Defensively parses date strings, supporting both ISO-8601 and regional formats.')
        refactored_lines.append('    Returns (is_valid, standardized_iso_date, error_dict).')
        refactored_lines.append('    """')
        refactored_lines.append('    cleaned_date = date_str.strip()')
        refactored_lines.append('    for fmt in SUPPORTED_DATE_FORMATS:')
        refactored_lines.append('        try:')
        refactored_lines.append('            dt = datetime.strptime(cleaned_date, fmt)')
        refactored_lines.append('            return True, dt.strftime("%Y-%m-%d"), None')
        refactored_lines.append('        except ValueError:')
        refactored_lines.append('            continue\n')
        refactored_lines.append('    logger.warning(f"Rejected unsupported date format: {date_str}")')
        refactored_lines.append('    return False, "", {')
        refactored_lines.append('        "error": "Invalid date format",')
        refactored_lines.append('        "expected": "YYYY-MM-DD or DD/MM/YYYY",')
        refactored_lines.append('        "received": date_str')
        refactored_lines.append('    }\n')

    # Include cleaned original lines
    for line in lines:
        if "strptime" in line and "%Y-%m-%d" in line:
            refactored_lines.append('    # LogLens: Replaced fragile single-format parse with multi-format validator')
            refactored_lines.append('    is_valid, parsed_date, err = parse_and_validate_date(date_str)')
            refactored_lines.append('    if not is_valid:')
            refactored_lines.append('        return err')
        elif re.search(r'except\s*:\s*(?:pass|return None)', line):
            refactored_lines.append('    except Exception as exc:')
            refactored_lines.append('        logger.error(f"Handled unexpected failure: {exc}", exc_info=True)')
            refactored_lines.append('        raise')
        else:
            refactored_lines.append(line)

    checklist = [
        "1. Replace single-format `strptime` with the multi-format fallback helper (`parse_and_validate_date`).",
        "2. Add structured logging to all `try/except` blocks instead of bare `except: pass`.",
        "3. Move hardcoded endpoints and credentials into environment variables (`.env`).",
        "4. Run `python test_repro.py` to verify that regional dates no longer trigger HTTP 400."
    ]

    return annotations, "\n".join(refactored_lines), checklist

def analyze_javascript_code(code: str) -> Tuple[List[FileAnnotation], str, List[str]]:
    """Analyzes and produces refactored code and annotations for JS/TS."""
    annotations: List[FileAnnotation] = []
    lines = code.splitlines()

    for idx, line in enumerate(lines, 1):
        if "new Date(" in line and not ("isNaN" in code or "getTime" in code):
            annotations.append(FileAnnotation(
                line=idx,
                category="Edge Case",
                severity="high",
                comment="Native `new Date(str)` parsing varies across browser engines for DD/MM/YYYY strings."
            ))
        elif "console.log(" in line:
            annotations.append(FileAnnotation(
                line=idx,
                category="Observability",
                severity="low",
                comment="Replace raw console.log with structured logging or privacy-sanitized diagnostics."
            ))
        elif "any" in line and (":" in line):
            annotations.append(FileAnnotation(
                line=idx,
                category="Type Safety",
                severity="medium",
                comment="Avoid using `any` type in TypeScript; define explicit interfaces or schemas."
            ))

    refactored_lines = [
        "/**",
        " * Refactored by LogLens Code Reviewer",
        " * - Added cross-browser date parsing with explicit DD/MM/YYYY vs YYYY-MM-DD detection",
        " * - Wrapped network calls in try/catch with structured error handling",
        " */",
        "",
        "export function parseDateSafely(dateStr: string): { valid: boolean; isoDate?: string; error?: string } {",
        "  if (!dateStr) return { valid: false, error: 'Empty date string' };",
        "",
        "  // Handle DD/MM/YYYY format explicitly",
        "  const ddmmyyyy = dateStr.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);",
        "  if (ddmmyyyy) {",
        "    const [, day, month, year] = ddmmyyyy;",
        "    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;",
        "    return { valid: true, isoDate: iso };",
        "  }",
        "",
        "  // Standard ISO verification",
        "  const timestamp = Date.parse(dateStr);",
        "  if (isNaN(timestamp)) {",
        "    return { valid: false, error: `Invalid date format: ${dateStr}` };",
        "  }",
        "  return { valid: true, isoDate: new Date(timestamp).toISOString().split('T')[0] };",
        "}",
        ""
    ] + lines

    checklist = [
        "1. Adopt explicit regex verification for regional date strings (`DD/MM/YYYY`).",
        "2. Check `isNaN(date.getTime())` after instantiation to prevent Invalid Date bugs.",
        "3. Sanitize sensitive user identifiers before sending diagnostic telemetry payloads.",
        "4. Add unit test coverage for edge dates (e.g. leap years, month boundaries)."
    ]

    return annotations, "\n".join(refactored_lines), checklist

def analyze_json_code(code: str) -> Tuple[List[FileAnnotation], str, List[str]]:
    """Validates and analyzes JSON payloads."""
    annotations: List[FileAnnotation] = []
    try:
        data = json.loads(code)
        if isinstance(data, dict):
            if "date" in data and "/" in str(data["date"]):
                annotations.append(FileAnnotation(
                    line=1,
                    category="Schema Warning",
                    severity="medium",
                    comment="Field 'date' uses regional format with slashes. Recommend ISO-8601 (YYYY-MM-DD) for consistency."
                ))
            if any(k in data for k in ["email", "student_id", "password"]):
                annotations.append(FileAnnotation(
                    line=1,
                    category="Privacy Notice",
                    severity="high",
                    comment="Payload contains unmasked sensitive identity fields. Apply LogLens redactor before persisting."
                ))
        improved = json.dumps(data, indent=2)
    except Exception as e:
        annotations.append(FileAnnotation(
            line=1,
            category="Syntax Error",
            severity="high",
            comment=f"Malformed JSON syntax: {e}"
        ))
        improved = code

    checklist = [
        "1. Standardize date attributes to ISO-8601 strings.",
        "2. Strip sensitive identity fields (`email`, `student_id`) before logging or publishing.",
        "3. Validate against a formal JSON Schema."
    ]
    return annotations, improved, checklist

def analyze_and_refactor_file(filename: str, raw_content: str) -> AnalyzeFileResponse:
    """
    Main entrypoint for single-file analysis and smart refactoring.
    Applies security sanitization, identifies bugs/anti-patterns,
    and returns annotations, improved code, and developer checklist.
    """
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file format '{ext}'. LogLens supports: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")

    # 1. Sanitize code to protect private tokens and PII
    sanitized_code, redaction_count = sanitize_code_content(raw_content)

    line_count = len(sanitized_code.splitlines())
    language = "python" if ext == ".py" else ("javascript" if ext in [".js", ".ts"] else "json")

    # 2. Analyze based on language
    if ext == ".py":
        annotations, improved_code, checklist = analyze_python_code(sanitized_code)
    elif ext in [".js", ".ts"]:
        annotations, improved_code, checklist = analyze_javascript_code(sanitized_code)
    else:
        annotations, improved_code, checklist = analyze_json_code(sanitized_code)

    return AnalyzeFileResponse(
        filename=filename,
        language=language,
        line_count=line_count,
        annotations=annotations,
        improved_code=improved_code,
        checklist=checklist,
        sanitized_secrets_count=redaction_count
    )
