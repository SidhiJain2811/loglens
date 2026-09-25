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

  // Settings & Quick Demo State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customOwner, setCustomOwner] = useState("");
  const [customRepo, setCustomRepo] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [copied, setCopied] = useState(false);

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
        if (data.github_owner) setCustomOwner(data.github_owner);
        if (data.github_repo) setCustomRepo(data.github_repo);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          github_owner: customOwner,
          github_repo: customRepo,
          github_token: customToken
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStatus(data);
        setIsSettingsOpen(false);
      }
    } catch (err) {
      alert("Failed to save GitHub settings: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (createdIssue && createdIssue.body) {
      navigator.clipboard.writeText(createdIssue.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  // 1-Click Demo Shortcut: immediately trigger failure and open LogLens modal
  const handleQuickDemoBug = async () => {
    // If fix is active, disable it first so the bug manifests
    if (systemStatus.fix_enabled) {
      await fetch("/api/toggle-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false })
      });
      setSystemStatus((prev) => ({ ...prev, fix_enabled: false }));
    }

    setDate("25/09/2026");
    const payload = {
      course_id: course,
      student_name: studentName,
      student_id: studentId,
      email: email,
      phone: phone,
      date: "25/09/2026"
    };

    setIsRedacting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLastResponse(data);
      setSubmissionStatus("error");

      const evidence = {
        action_sequence: [
          "Opened attendance page",
          `Selected course: ${course}`,
          "Selected date: 25/09/2026",
          "Clicked 'Submit Attendance' button",
          "Received HTTP 400 error (Invalid date format: expected YYYY-MM-DD, received 25/09/2026)"
        ],
        failed_request: {
          method: "POST",
          endpoint: "/api/attendance",
          request_body: payload,
          status_code: 400,
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

      const redactRes = await fetch("/api/loglens/redact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evidence)
      });
      if (redactRes.ok) {
        const rdata = await redactRes.json();
        setRedactedData(rdata);
        setIsModalOpen(true);
      }
    } catch (err) {
      alert("Demo failure simulation error: " + err.message);
    } finally {
      setIsRedacting(false);
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

          <button
            className="btn btn-sm btn-outline"
            onClick={() => setIsSettingsOpen(true)}
            title="Configure GitHub Token & Repository"
          >
            ⚙️ GitHub Setup
          </button>
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
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={handleQuickDemoBug}
                    className="btn btn-sm btn-outline"
                    title="1-click shortcut to trigger the bug and open the LogLens privacy review modal"
                  >
                    ⚡ Quick Demo
                  </button>
                  <span className="badge badge-ai">Target App</span>
                </div>
              </div>

              {/* Hackathon Demo Guidance Banner */}
              {systemStatus.fix_enabled ? (
                <div className="guide-box warning">
                  <span>⚠️</span>
                  <div>
                    <strong>Demo Notice:</strong> The date fix is currently <strong>ACTIVE</strong>. To demonstrate bug reporting and reproduction failure, click <strong>"Disable Fix (Revert to Bug)"</strong> on the right first!
                  </div>
                </div>
              ) : (
                <div className="guide-box">
                  <span>💡</span>
                  <div>
                    <strong>Hackathon Demo Step 1:</strong> Keep the date <code>25/09/2026</code> and click <strong>Submit Attendance</strong>. The backend will reject it with HTTP 400, and the LogLens Privacy Report button will appear!
                  </div>
                </div>
              )}

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

              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
                <button
                  onClick={handleRunReproTest}
                  disabled={isRunningTest}
                  className="btn btn-blue"
                >
                  {isRunningTest ? "⏳ Executing test_repro.py..." : "▶️ Run Standalone Repro Test (python test_repro.py)"}
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  (Exact same test runs before and after fix)
                </span>
              </div>

              {/* Status Banner */}
              {isRunningTest && (
                <div style={{ padding: "8px 12px", borderRadius: "6px", backgroundColor: "rgba(88, 166, 255, 0.15)", border: "1px solid rgba(88, 166, 255, 0.4)", color: "var(--accent-blue)", fontSize: "0.85rem", marginBottom: "10px" }}>
                  ⏳ Running reproduction script against backend...
                </div>
              )}

              {!isRunningTest && testOutput && (
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: testOutput.passed ? "rgba(63, 185, 80, 0.15)" : "rgba(248, 81, 73, 0.15)",
                  border: `1px solid ${testOutput.passed ? "rgba(63, 185, 80, 0.4)" : "rgba(248, 81, 73, 0.4)"}`,
                  color: testOutput.passed ? "var(--accent-green-bright)" : "var(--accent-red-bright)",
                  fontSize: "0.88rem",
                  marginBottom: "12px"
                }}>
                  <strong>{testOutput.passed ? "✅ TEST RESULT: PASS" : "❌ TEST RESULT: FAIL"}</strong>
                  <div style={{ fontSize: "0.82rem", marginTop: "4px", color: "var(--text-bright)" }}>
                    {testOutput.passed
                      ? "The fix is verified! The backend accepted the date and returned HTTP 200."
                      : "Expected pre-fix state: The test reproduced the bug (HTTP 400 Invalid date format). Click 'Apply Backend Date Fix' above and run again!"}
                  </div>
                </div>
              )}

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
                    color: testOutput ? (testOutput.passed ? "var(--accent-green-bright)" : "#f85149") : "var(--text-muted)"
                  }}
                >
                  {testOutput ? (
                    testOutput.output || testOutput.stdout || testOutput.stderr
                  ) : (
                    "$ Click 'Run Standalone Repro Test' or run `python test_repro.py` in your terminal to verify failure/pass state."
                  )}
                </div>
              </div>
            </div>

            {/* Created GitHub Issue Card - High Visibility & GitHub Mock Style */}
            {createdIssue && (
              <div className="card" style={{ border: "2px solid var(--accent-blue)", boxShadow: "0 8px 24px rgba(31, 111, 235, 0.25)" }}>
                <div className="card-header" style={{ alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span className="gh-badge-open">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                        </svg>
                        Open
                      </span>
                      <h3 className="card-title" style={{ fontSize: "1.2rem", color: "var(--text-bright)", margin: 0 }}>
                        {createdIssue.title} <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>#{createdIssue.issue_number}</span>
                      </h3>
                    </div>
                    <div className="gh-issue-meta">
                      Opened by <strong>Alex Mercer</strong> via LogLens • 0 comments
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {createdIssue.is_live && (
                      <a
                        href={createdIssue.issue_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-primary"
                      >
                        🔗 View Live on GitHub ↗
                      </a>
                    )}
                    {createdIssue.web_prefill_url && (
                      <a
                        href={createdIssue.web_prefill_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-blue"
                        title="Submit directly into your GitHub repo web form"
                      >
                        🚀 1-Click GitHub Web Submit ↗
                      </a>
                    )}
                    <button
                      onClick={handleCopyMarkdown}
                      className="btn btn-sm btn-outline"
                    >
                      {copied ? "✅ Copied Markdown!" : "📋 Copy Markdown"}
                    </button>
                  </div>
                </div>

                {/* Status Notice */}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: createdIssue.is_live ? "rgba(63, 185, 80, 0.12)" : "rgba(88, 166, 255, 0.12)",
                  border: `1px solid ${createdIssue.is_live ? "rgba(63, 185, 80, 0.3)" : "rgba(88, 166, 255, 0.3)"}`,
                  fontSize: "0.85rem",
                  color: createdIssue.is_live ? "var(--accent-green-bright)" : "var(--accent-blue)",
                  marginBottom: "16px"
                }}>
                  {createdIssue.message}
                </div>

                {/* Structured Issue Preview (The 4 LogLens Sections) */}
                <div className="gh-issue-container">
                  <div className="gh-issue-header">
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-bright)" }}>
                      Issue Description Preview (GitHub Markdown)
                    </span>
                  </div>

                  <div className="gh-issue-body">
                    {/* Section 1: Steps to Reproduce */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading">## Steps to Reproduce</div>
                      <ol style={{ paddingLeft: "20px", margin: 0 }}>
                        {rawEvidence?.action_sequence?.map((step, idx) => (
                          <li key={idx} style={{ marginBottom: "4px" }}>{step}</li>
                        )) || (
                          <>
                            <li>Opened attendance page</li>
                            <li>Selected course: CS101</li>
                            <li>Selected date: 25/09/2026</li>
                            <li>Clicked 'Submit Attendance' button</li>
                          </>
                        )}
                      </ol>
                    </div>

                    {/* Section 2: Technical Evidence */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>## Technical Evidence</span>
                        <span className="badge badge-preserved">PII Scrubbed • Date Preserved</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", marginBottom: "8px" }}>
                        <strong>Endpoint:</strong> <code>POST /api/attendance</code> &nbsp;|&nbsp; <strong>Status:</strong> <span style={{ color: "var(--accent-red-bright)" }}>400 Bad Request</span>
                      </div>
                      <div className="code-block" style={{ fontSize: "0.8rem", maxHeight: "150px" }}>
{`Request Payload:
{
  "course_id": "CS101",
  "student_name": "Alex Mercer",
  "student_id": "[REDACTED]",
  "email": "[REDACTED]",
  "phone": "[REDACTED]",
  "date": "25/09/2026"
}

Response Body:
{
  "error": "Invalid date format",
  "expected": "YYYY-MM-DD",
  "received": "25/09/2026"
}`}
                      </div>
                    </div>

                    {/* Section 3: AI Suggestion */}
                    <div className="gh-card-section" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
                      <div className="gh-section-heading" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>## AI Suggestion</span>
                        <span className="badge badge-ai">LLM Diagnostic</span>
                      </div>
                      <div style={{ fontStyle: "italic", color: "var(--text-bright)", marginBottom: "4px" }}>
                        "{redactedData?.ai_suggestion || "The backend function parse_and_validate_date in backend/date_handler.py strictly requires ISO-8601 YYYY-MM-DD format and rejects regional DD/MM/YYYY."}"
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        ⚠️ AI-Generated Diagnostic (Not Verified Fact)
                      </div>
                    </div>

                    {/* Section 4: Verification */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading">## Verification</div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem" }}>
                        No fix has been verified yet. Run the linked reproduction test after applying a fix:
                      </p>
                      <div className="code-block" style={{ margin: 0, padding: "8px 12px" }}>
                        python test_repro.py
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Raw Markdown Viewer */}
                <details style={{ marginTop: "14px", cursor: "pointer", fontSize: "0.85rem" }}>
                  <summary style={{ color: "var(--accent-blue)", fontWeight: 500 }}>
                    View Raw Markdown Source Payload
                  </summary>
                  <div className="code-block" style={{ marginTop: "8px", maxHeight: "200px" }}>
                    {createdIssue.body}
                  </div>
                </details>
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
      {/* MODAL: GitHub Integration Settings */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div className="modal-title">
                <span>⚙️</span> GitHub Integration Settings
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setIsSettingsOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div className="modal-body">
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Connect LogLens to your GitHub repository to file real issues directly from the prototype.
                </p>

                <div className="form-group">
                  <label className="form-label">GitHub Owner / Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. your-github-username"
                    value={customOwner}
                    onChange={(e) => setCustomOwner(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GitHub Repository Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. attendance-app"
                    value={customRepo}
                    onChange={(e) => setCustomRepo(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GitHub Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                  />
                  <div className="form-hint">
                    Requires <code>repo</code> or <code>public_repo</code> scope. If left blank, LogLens runs in Demo Mode with a 1-click pre-filled web form.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingConfig}
                >
                  {isSavingConfig ? "Saving..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
