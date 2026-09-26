# ============================================================================
# 🛡️ LOGLENS RECREATED CODE FILE: attendance_date.py
# Automatic Code Diagnostics & Inline Review Comments
# Total issue annotations added: 2
# Review Checklist:
#   * 1. Replace single-format `strptime` with the multi-format fallback helper (`parse_and_validate_date`).
#   * 2. Add structured logging to all `try/except` blocks instead of bare `except: pass`.
#   * 3. Move hardcoded endpoints and credentials into environment variables (`.env`).
#   * 4. Run `python test_repro.py` to verify that regional dates no longer trigger HTTP 400.
# ============================================================================

from datetime import datetime
# ------------------------------------------------------------
# [LOGLENS COMMENT]: Code Quality (Severity: LOW)
# Issue on Line 2: Missing return type hints and parameter typing annotations.
# ------------------------------------------------------------
def check_date(d):
    try:
        # ------------------------------------------------------------
        # [LOGLENS COMMENT]: Fragile Parsing (Severity: HIGH)
        # Issue on Line 4: Strict ISO format without multi-format fallback. Causes unhandled ValueError on regional DD/MM/YYYY inputs.
        # ------------------------------------------------------------
        return datetime.strptime(d, '%Y-%m-%d')
    except:
        return None