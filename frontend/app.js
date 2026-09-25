const { useState, useEffect } = React;

function App() {
  // Demo App State
  const [course, setCourse] = useState("CS101");
  const [studentName, setStudentName] = useState("Alex Mercer");
  const [studentId, setStudentId] = useState("STU-98421");
  const [email, setEmail] = useState("alex.mercer@university.edu");
  const [phone, setPhone] = useState("+1-555-0199");
  const [date, setDate] = useState("25/09/2026"); // DD/MM/YYYY to trigger the bug!

  // Action Sequence Tracking (Problem 1)
  const [actions, setActions] = useState(["Opened attendance page"]);
  const [submissionStatus, setSubmissionStatus] = useState(null); // null | 'success' | 'error' | 'submitting'
  const [lastResponse, setLastResponse] = useState(null);

  // Raw & Redacted Evidence (Problem 2)
  const [rawEvidence, setRawEvidence] = useState(null);
  const [redactedData, setRedactedData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);

  // GitHub & Verification (Problem 3)
  const [createdIssue, setCreatedIssue] = useState(null);
  const [isFilingIssue, setIsFilingIssue] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    fix_enabled: false,
    github_connected: false,
    github_owner: "demo-org",
    github_repo: "attendance-system",
    llm_connected: false,
    llm_provider: "Built-in Engine"
  });

  // Reproduction Test Runner State
  const [testOutput, setTestOutput] = useState(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const recordAction = (desc) => {
    setActions((prev) => [...prev, desc]);
  };

  // 1. Submit Attendance Form (Triggers the bug)
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setSubmissionStatus("submitting");
    recordAction("Clicked 'Submit Attendance' button");

    const payload = {
      course_id: course,
      student_name: studentName,
      student_id: studentId,
      email: email,
      phone: phone,
      date: date
    };

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setLastResponse(data);

      if (res.status === 200) {
        setSubmissionStatus("success");
        recordAction(`Attendance successfully recorded (Date: ${data.record ? data.record.date : date})`);
      } else {
        setSubmissionStatus("error");
        recordAction(`Attendance submission rejected with HTTP ${res.status}: ${data.error || 'Validation error'}`);

        // Capture raw diagnostic evidence
        const evidence = {
          action_sequence: [
            "Opened attendance page",
            `Selected course: ${course}`,
            `Selected date: ${date}`,
            "Clicked 'Submit Attendance' button",
            `Received HTTP ${res.status} error`
          ],
          failed_request: {
            method: "POST",
            endpoint: "/api/attendance",
            request_body: payload,
            status_code: res.status,
            response_body: data
          },
          app_version: "v1.2.4-beta",
          user_profile: {
            student_id: studentId,
            email: email,
            phone: phone,
            role: "undergraduate",
            department: "Computer Science"
          }
        };
        setRawEvidence(evidence);
      }
    } catch (err) {
      setSubmissionStatus("error");
      setLastResponse({ error: "Network error", message: err.message });
    }
  };

  // 2. Open LogLens Diagnostic Preview (Redaction + AI + Test generation)
  const handleStartReport = async () => {
    if (!rawEvidence) return;
    setIsRedacting(true);
    try {
      const res = await fetch("/api/loglens/redact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawEvidence)
      });
      if (res.ok) {
        const data = await res.json();
        setRedactedData(data);
        setIsModalOpen(true);
      }
    } catch (err) {
      alert("Failed to prepare diagnostic evidence: " + err.message);
    } finally {
      setIsRedacting(false);
    }
  };

  // 3. User Approves and Files GitHub Issue
  const handleConfirmAndSend = async () => {
    if (!redactedData) return;
    setIsFilingIssue(true);
    try {
      const payload = {
        evidence: redactedData.evidence,
        ai_suggestion: redactedData.ai_suggestion,
        custom_title: "Attendance submission fails with invalid date format"
      };

      const res = await fetch("/api/loglens/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const issueData = await res.json();
        setCreatedIssue(issueData);
        setIsModalOpen(false);
      }
    } catch (err) {
      alert("Failed to create GitHub issue: " + err.message);
    } finally {
      setIsFilingIssue(false);
    }
  };

  // 4. Toggle Backend Fix
  const handleToggleFix = async () => {
    try {
      const newFixState = !systemStatus.fix_enabled;
      const res = await fetch("/api/toggle-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newFixState })
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus((prev) => ({ ...prev, fix_enabled: data.fix_enabled }));
        recordAction(`Backend date format fix toggled to: ${data.fix_enabled ? "ENABLED" : "DISABLED"}`);
      }
    } catch (err) {
      alert("Failed to toggle fix: " + err.message);
    }
  };

  // 5. Run Standalone Reproduction Test
  const handleRunReproTest = async () => {
    setIsRunningTest(true);
    try {
      const res = await fetch("/api/loglens/run-test", { method: "POST" });
      const data = await res.json();
      setTestOutput(data);
    } catch (err) {
      setTestOutput({
        exit_code: -1,
        passed: false,
        stdout: "",
        stderr: "Execution error: " + err.message
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div>
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="logo-badge">LL</div>
          <div>
            <div className="brand-title">LogLens Developer Tool</div>
            <div className="brand-tagline">Privacy-Filtered Diagnostic & Runnable Verification Prototype</div>
          </div>
        </div>

        <div className="nav-status">
          <div className="status-pill">
            <span className={`status-dot ${systemStatus.github_connected ? 'green' : 'amber'}`}></span>
            <span>GitHub: {systemStatus.github_connected ? `${systemStatus.github_owner}/${systemStatus.github_repo}` : "Demo/Mock Mode"}</span>
          </div>

          <div className="status-pill">
            <span className={`status-dot ${systemStatus.llm_connected ? 'green' : 'amber'}`}></span>
            <span>AI Diagnostic: {systemStatus.llm_provider}</span>
          </div>

          <div className="status-pill">
            <span className={`status-dot ${systemStatus.fix_enabled ? 'green' : 'red'}`}></span>
            <span>Fix: {systemStatus.fix_enabled ? "Active" : "Not Applied"}</span>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="grid-two-col">
          {/* LEFT COLUMN: Attendance Demo App */}
          <div>
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Demo App: Attendance Submission</h2>
                  <p className="card-subtitle">Simulates a standard student attendance portal</p>
                </div>
                <span className="badge badge-ai">Target App</span>
              </div>

              <form onSubmit={handleAttendanceSubmit}>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select
                    className="form-select"
                    value={course}
                    onChange={(e) => {
                      setCourse(e.target.value);
                      recordAction(`Selected course: ${e.target.value}`);
                    }}
                  >
                    <option value="CS101">CS101 - Introduction to Computer Science</option>
                    <option value="MATH201">MATH201 - Linear Algebra & Differential Equations</option>
                    <option value="PHYS105">PHYS105 - General Physics & Thermodynamics</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Student Name</label>
                    <input
                      className="form-input"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date (DD/MM/YYYY)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        recordAction(`Selected date: ${e.target.value}`);
                      }}
                    />
                    <div className="form-hint">Frontend formats as DD/MM/YYYY (triggers backend ISO validation bug)</div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Student ID (PII)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email (PII)</label>
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={submissionStatus === "submitting"}
                >
                  {submissionStatus === "submitting" ? "Submitting..." : "Submit Attendance"}
                </button>
              </form>

              {/* Error Alert Box with "Report this problem" Button */}
              {submissionStatus === "error" && (
                <div className="alert-box alert-error">
                  <div className="alert-content">
                    <div className="alert-icon">❌</div>
                    <div>
                      <div className="alert-title">Attendance could not be submitted.</div>
                      <div className="alert-detail">
                        {lastResponse?.error || "Invalid request"}: Expected {lastResponse?.expected}, received "{lastResponse?.received}".
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartReport}
                    className="btn btn-blue"
                    disabled={isRedacting}
                    style={{ alignSelf: "flex-start", marginTop: "6px" }}
                  >
                    {isRedacting ? "Analyzing Evidence..." : "🛡️ Report this problem with LogLens"}
                  </button>
                </div>
              )}

              {/* Success Alert Box */}
              {submissionStatus === "success" && (
                <div className="alert-box alert-success">
                  <div className="alert-content">
                    <div className="alert-icon">✅</div>
                    <div>
                      <div className="alert-title">Attendance Submitted Successfully!</div>
                      <div className="alert-detail">{lastResponse?.message}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live User Action Sequence Card */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Client-Side Action Tracker (Breadcrumbs)</h3>
                <span className="badge badge-preserved">Context Recording</span>
              </div>
              <p className="card-subtitle">Automatically captures the reproduction sequence leading to failure:</p>

              <ol className="timeline">
                {actions.map((act, idx) => (
                  <li key={idx} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <span className="timeline-text">{act}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* RIGHT COLUMN: LogLens Verification Studio */}
          <div>
            {/* Live Demo Fix Toggle & Reproduction Test Execution */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Live Fix & Verification Control</h2>
                  <p className="card-subtitle">Demonstrates end-to-end fix verification using a single test script</p>
                </div>
                <button
                  onClick={handleToggleFix}
                  className={`btn btn-sm ${systemStatus.fix_enabled ? 'btn-danger' : 'btn-primary'}`}
                >
                  {systemStatus.fix_enabled ? "Disable Fix (Revert to Bug)" : "Apply Backend Date Fix"}
                </button>
              </div>

              <div style={{ marginBottom: "14px", fontSize: "0.88rem" }}>
                Current backend state:{" "}
                <strong style={{ color: systemStatus.fix_enabled ? "var(--accent-green-bright)" : "var(--accent-red-bright)" }}>
                  {systemStatus.fix_enabled ? "FIX APPLIED (accepts both ISO and DD/MM/YYYY)" : "BUG ACTIVE (strictly requires ISO YYYY-MM-DD)"}
                </strong>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={handleRunReproTest}
                  disabled={isRunningTest}
                  className="btn btn-outline"
                >
                  {isRunningTest ? "Running Test..." : "▶️ Run Standalone Repro Test (python test_repro.py)"}
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  (Identical test runs both before & after fix)
                </span>
              </div>

              {/* Terminal Output Window */}
              <div className="terminal-window">
                <div className="terminal-header">
                  <div className="terminal-buttons">
                    <span className="terminal-circle circle-red"></span>
                    <span className="terminal-circle circle-yellow"></span>
                    <span className="terminal-circle circle-green"></span>
                  </div>
                  <span>terminal — python test_repro.py</span>
                </div>
                <div
                  className="terminal-body"
                  style={{
                    color: testOutput ? (testOutput.passed ? "var(--accent-green-bright)" : "var(--accent-red-bright)") : "var(--text-muted)"
                  }}
                >
                  {testOutput ? (
                    testOutput.stdout || testOutput.stderr
                  ) : (
                    "$ Click 'Run Standalone Repro Test' or run `python test_repro.py` in your terminal to verify failure/pass state."
                  )}
                </div>
              </div>
            </div>

            {/* Created GitHub Issue Card */}
            {createdIssue && (
              <div className="card" style={{ borderColor: "var(--accent-blue)" }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ color: "var(--accent-blue)" }}>
                    📦 GitHub Issue Created #{createdIssue.issue_number}
                  </h3>
                  <a
                    href={createdIssue.issue_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-blue"
                  >
                    View on GitHub ↗
                  </a>
                </div>

                <div style={{ marginBottom: "12px", fontSize: "0.9rem" }}>
                  <strong>Title:</strong> {createdIssue.title}
                </div>

                <div style={{ marginBottom: "12px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {createdIssue.message}
                </div>

                {createdIssue.web_prefill_url && (
                  <div style={{ marginBottom: "14px" }}>
                    <a
                      href={createdIssue.web_prefill_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline"
                    >
                      Open Pre-filled Issue in GitHub Web Form ↗
                    </a>
                  </div>
                )}

                <div className="form-label">Generated Issue Markdown:</div>
                <div className="code-block" style={{ maxHeight: "220px", overflowY: "auto" }}>
                  {createdIssue.body}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL: Rule-Based Privacy Review & Consent (Part 3) */}
      {isModalOpen && redactedData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">
                <span>🛡️</span> LogLens Diagnostic Review & User Consent
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "18px" }}>
                LogLens has automatically structured the failure data and applied rule-based privacy filters.
                Personal identity data has been redacted, while reproduction conditions remain intact.
              </p>

              {/* Section 1: Privacy Preservation Rule Comparison */}
              <div className="modal-section">
                <div className="modal-section-title">
                  <span>🔒 Privacy-Preserving Redaction Summary</span>
                </div>
                <table className="privacy-table">
                  <thead>
                    <tr>
                      <th>Data Field</th>
                      <th>Raw Value</th>
                      <th>Transmitted Value</th>
                      <th>Rule Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Student Email</td>
                      <td><code>alex.mercer@university.edu</code></td>
                      <td><span className="badge badge-redacted">[REDACTED]</span></td>
                      <td>Rule: Field named 'email' stripped</td>
                    </tr>
                    <tr>
                      <td>Student ID</td>
                      <td><code>STU-98421</code></td>
                      <td><span className="badge badge-redacted">[REDACTED]</span></td>
                      <td>Rule: Field named 'student_id' stripped</td>
                    </tr>
                    <tr>
                      <td>Phone Number</td>
                      <td><code>+1-555-0199</code></td>
                      <td><span className="badge badge-redacted">[REDACTED]</span></td>
                      <td>Rule: Field named 'phone' stripped</td>
                    </tr>
                    <tr style={{ backgroundColor: "rgba(63, 185, 80, 0.08)" }}>
                      <td><strong>Submission Date</strong></td>
                      <td><code>25/09/2026</code></td>
                      <td><strong><code>25/09/2026</code></strong></td>
                      <td><span className="badge badge-preserved">PRESERVED FOR REPRO</span> (Core bug condition)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: Action Sequence */}
              <div className="modal-section">
                <div className="modal-section-title">
                  <span>👣 Steps to Reproduce (Action Sequence)</span>
                </div>
                <ol style={{ paddingLeft: "20px", fontSize: "0.88rem" }}>
                  {redactedData.evidence.action_sequence.map((step, idx) => (
                    <li key={idx} style={{ marginBottom: "4px" }}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Section 3: AI Diagnostic Suggestion */}
              <div className="modal-section">
                <div className="modal-section-title">
                  <span>🤖 AI Root-Cause Diagnostic</span>
                  <span className="badge badge-ai">AI-Generated</span>
                </div>
                <div className="code-block" style={{ borderLeft: "3px solid var(--accent-blue)" }}>
                  {redactedData.ai_suggestion}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  * Analyzed against backend function <code>parse_and_validate_date</code> in <code>backend/date_handler.py</code>.
                </div>
              </div>

              {/* Section 4: Auto-Generated Test Preview */}
              <div className="modal-section">
                <div className="modal-section-title">
                  <span>🧪 Auto-Generated Reproduction Test</span>
                  <span className="badge badge-preserved">Executable Verification</span>
                </div>
                <div className="code-block" style={{ maxHeight: "150px" }}>
                  {redactedData.test_script_preview}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmAndSend}
                disabled={isFilingIssue}
              >
                {isFilingIssue ? "Filing Issue..." : "✅ Approve & File GitHub Issue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
