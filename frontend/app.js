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

  // Dashboard Active Tab State
  const [activeTab, setActiveTab] = useState("workflow"); // 'workflow' | 'repo_analyzer' | 'file_reviewer'

  // Feature 1: GitHub Repo Analyzer State
  const [repoUrl, setRepoUrl] = useState("https://github.com/demo-org/attendance-system");
  const [isScanningRepo, setIsScanningRepo] = useState(false);
  const [repoResult, setRepoResult] = useState(null);
  const [repoError, setRepoError] = useState(null);
  const [copiedReproSnippet, setCopiedReproSnippet] = useState(false);

  // Feature 2: File Upload Code Reviewer State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileCodeContent, setFileCodeContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [fileResult, setFileResult] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [copiedImprovedCode, setCopiedImprovedCode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [checkedChecklist, setCheckedChecklist] = useState({});

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

  // Feature 1: Scan GitHub Repository
  const handleScanRepository = async (urlToScan) => {
    const targetUrl = typeof urlToScan === "string" ? urlToScan : repoUrl;
    if (!targetUrl || !targetUrl.trim()) {
      alert("Please enter a valid GitHub repository URL.");
      return;
    }
    setRepoUrl(targetUrl);
    setIsScanningRepo(true);
    setRepoError(null);
    try {
      const res = await fetch("/api/analyze-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: targetUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Repository scan failed.");
      }
      setRepoResult(data);
    } catch (err) {
      setRepoError(err.message);
    } finally {
      setIsScanningRepo(false);
    }
  };

  const handleCopyReproSnippet = () => {
    if (repoResult && repoResult.repro_script_preview) {
      navigator.clipboard.writeText(repoResult.repro_script_preview);
      setCopiedReproSnippet(true);
      setTimeout(() => setCopiedReproSnippet(false), 2200);
    }
  };

  // Feature 2: File Upload, Drag & Drop, and Sample Code Loaders
  const processSelectedFile = (file) => {
    setUploadedFile(file);
    setFileName(file.name);
    setFileResult(null);
    setFileError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileCodeContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const loadSampleCode = (type) => {
    setFileResult(null);
    setFileError(null);
    setUploadedFile(null);

    if (type === "python") {
      setFileName("date_validator.py");
      setFileCodeContent(`from datetime import datetime
import os

api_key = "ghp_123456789012345678901234567890123456"
admin_email = "alex.mercer@university.edu"

def validate_attendance_date(date_str):
    # Fragile parsing: Strictly requires ISO-8601 (YYYY-MM-DD)
    # Crashes on regional inputs like 25/09/2026!
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return True, parsed.isoformat()
    except:
        # Anti-pattern: Naked except silently swallows errors
        return False, None
`);
    } else if (type === "javascript") {
      setFileName("attendanceHandler.js");
      setFileCodeContent(`const secretToken = "sk-abcdef1234567890abcdef1234567890";

export function handleDateInput(rawDate) {
  console.log("Processing student date:", rawDate);
  // Edge Case: Native Date engine inconsistency across browsers
  const d = new Date(rawDate);
  return d.toISOString();
}
`);
    } else if (type === "json") {
      setFileName("student_payload.json");
      setFileCodeContent(`{
  "student_name": "Alex Mercer",
  "student_id": "STU-98421",
  "email": "alex.mercer@university.edu",
  "password": "supersecretpassword123",
  "date": "25/09/2026"
}
`);
    }
  };

  const handleAnalyzeFile = async () => {
    if (!uploadedFile && !fileCodeContent) {
      alert("Please upload a file or load sample code to analyze.");
      return;
    }
    setIsAnalyzingFile(true);
    setFileError(null);
    try {
      let res;
      if (uploadedFile) {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        res = await fetch("/api/analyze-file", {
          method: "POST",
          body: formData
        });
      } else {
        res = await fetch("/api/analyze-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileName || "script.py",
            content: fileCodeContent
          })
        });
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "File analysis failed.");
      }
      setFileResult(data);
      setCheckedChecklist({});
    } catch (err) {
      setFileError(err.message);
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const handleCopyImprovedCode = () => {
    if (fileResult && fileResult.improved_code) {
      navigator.clipboard.writeText(fileResult.improved_code);
      setCopiedImprovedCode(true);
      setTimeout(() => setCopiedImprovedCode(false), 2200);
    }
  };

  const toggleChecklistItem = (idx) => {
    setCheckedChecklist(prev => ({ ...prev, [idx]: !prev[idx] }));
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

      {/* Top Tab Navigation */}
      <div className="tab-navigation">
        <button
          type="button"
          className={`tab-btn ${activeTab === "workflow" ? "active" : ""}`}
          onClick={() => setActiveTab("workflow")}
        >
          <span>🛡️ Core Reproduction Workflow</span>
          <span className="tab-pill">Hackathon Demo</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "repo_analyzer" ? "active" : ""}`}
          onClick={() => setActiveTab("repo_analyzer")}
        >
          <span>🌐 GitHub Repo Analyzer</span>
          <span className="tab-pill">Feature 1</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "file_reviewer" ? "active" : ""}`}
          onClick={() => setActiveTab("file_reviewer")}
        >
          <span>📁 File Upload Code Reviewer</span>
          <span className="tab-pill">Feature 2</span>
        </button>
      </div>

      <main className="container">
        {activeTab === "workflow" && (
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

            {/* Permanent Section: Sanitized Bug Capsule & Structured GitHub Issue */}
            <div className="card" style={{
              border: createdIssue ? "2px solid var(--accent-blue)" : "1px solid var(--border-color)",
              boxShadow: createdIssue ? "0 8px 24px rgba(31, 111, 235, 0.25)" : "none"
            }}>
              <div className="card-header" style={{ alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <h3 className="card-title" style={{ fontSize: "1.15rem", color: "var(--text-bright)", margin: 0 }}>
                      📦 Sanitized Bug Capsule / Structured GitHub Issue
                    </h3>
                  </div>
                  <p className="card-subtitle">
                    User-approved diagnostic evidence • Rule-based privacy filtering • Verifiable reproduction
                  </p>
                </div>

                <div>
                  {createdIssue ? (
                    createdIssue.is_live ? (
                      <span className="badge badge-preserved">Live Issue #{createdIssue.issue_number}</span>
                    ) : (
                      <span className="badge badge-ai">Demo/Mock GitHub Mode (#{createdIssue.issue_number})</span>
                    )
                  ) : (
                    <span className="badge" style={{ backgroundColor: "rgba(139, 148, 158, 0.15)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                      Awaiting Report Approval
                    </span>
                  )}
                </div>
              </div>

              {/* Pre-Approval Blueprint / Placeholder State */}
              {!createdIssue && (
                <div style={{ padding: "16px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "1.3rem" }}>🛡️</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-bright)", fontSize: "0.92rem" }}>
                        Bug Capsule Ready to Assemble
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Follow the demo workflow to generate and inspect the structured report
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "14px", lineHeight: 1.6 }}>
                    Once you submit the failing attendance on the left and approve the privacy-filtered report in the LogLens modal, the complete <strong>Sanitized Bug Capsule</strong> and structured GitHub issue will appear here in <strong>Demo/Mock GitHub Mode</strong> (or live if token is configured).
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.8rem" }}>
                    <div style={{ padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-bright)" }}>1. Observed Failure:</strong>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>Rejection message & expected format</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-bright)" }}>2. Relevant Breadcrumbs:</strong>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>Numbered sequence of user actions</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-bright)" }}>3. Environment:</strong>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>App version, platform & backend</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-bright)" }}>4. Technical Error:</strong>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>PII scrubbed; date kept for repro</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-bright)" }}>5. AI Diagnosis & Code:</strong>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>LLM cause with date_handler snippet</div>
                    </div>
                    <div style={{ padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                      <strong style={{ color: "var(--text-bright)" }}>6. Reproduction Status:</strong>
                      <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>Linked test_repro.py (FAIL / PASS)</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active / Populated Bug Capsule & GitHub Issue */}
              {createdIssue && (
                <div>
                  {/* Issue Meta Bar & Quick Actions */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    padding: "12px 14px",
                    backgroundColor: "var(--bg-tertiary)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    marginBottom: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="gh-badge-open">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                        </svg>
                        Open
                      </span>
                      <div>
                        <strong>{createdIssue.title}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          {createdIssue.is_live ? `Live on ${systemStatus.github_owner}/${systemStatus.github_repo}` : "Demo/Mock Mode (Simulated Issue #42)"} • Opened via LogLens
                        </div>
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
                          🔗 Open on GitHub ↗
                        </a>
                      )}
                      {createdIssue.web_prefill_url && (
                        <a
                          href={createdIssue.web_prefill_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-blue"
                          title="Open pre-filled issue in GitHub web interface"
                        >
                          🚀 1-Click GitHub Web Submit ↗
                        </a>
                      )}
                      <button
                        onClick={handleCopyMarkdown}
                        className="btn btn-sm btn-outline"
                      >
                        {copied ? "✅ Copied Markdown!" : "📋 Copy Issue Markdown"}
                      </button>
                    </div>
                  </div>

                  {/* Structured Bug Capsule Display */}
                  <div className="gh-issue-container">
                    {/* 1. Observed Failure */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading">## Observed Failure</div>
                      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-bright)" }}>
                        {createdIssue.observed_failure || "Attendance submission fails with HTTP 400 when submitting regional date format (DD/MM/YYYY) instead of ISO-8601 (YYYY-MM-DD)."}
                      </p>
                    </div>

                    {/* 2. Relevant Breadcrumbs */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading">## Steps to Reproduce (Relevant Breadcrumbs)</div>
                      <ol style={{ paddingLeft: "20px", margin: 0, fontSize: "0.85rem" }}>
                        {(createdIssue.breadcrumbs || rawEvidence?.action_sequence || [
                          "Opened attendance page",
                          "Selected course: CS101",
                          "Selected date: 25/09/2026",
                          "Clicked 'Submit Attendance' button"
                        ]).map((step, idx) => (
                          <li key={idx} style={{ marginBottom: "4px" }}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {/* 3. Environment */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading">## Environment</div>
                      <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "0.85rem" }}>
                        <li><strong>App Version:</strong> <code>{createdIssue.environment?.app_version || "v1.2.4-beta"}</code></li>
                        <li><strong>Client OS / Platform:</strong> <code>{createdIssue.environment?.os || "Windows Web Client"}</code></li>
                        <li><strong>Backend Architecture:</strong> <code>{createdIssue.environment?.backend || "FastAPI / Python 3.13"}</code></li>
                      </ul>
                    </div>

                    {/* 4. Technical Error & Sanitized Payload */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>## Technical Error & Evidence</span>
                        <span className="badge badge-preserved">PII Scrubbed • Bug Trigger Preserved</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", marginBottom: "8px" }}>
                        <strong>Endpoint:</strong> <code>POST /api/attendance</code> &nbsp;|&nbsp; <strong>Response Status:</strong> <span style={{ color: "var(--accent-red-bright)" }}>400 Bad Request</span>
                      </div>
                      <div className="code-block" style={{ fontSize: "0.8rem", maxHeight: "150px" }}>
{`Sanitized Request Body:
{
  "course_id": "CS101",
  "student_name": "Alex Mercer",
  "student_id": "[REDACTED]",
  "email": "[REDACTED]",
  "phone": "[REDACTED]",
  "date": "25/09/2026"
}

Server Error Response:
{
  "error": "Invalid date format",
  "expected": "YYYY-MM-DD",
  "received": "25/09/2026"
}`}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        🔒 <strong>Privacy Guarantee:</strong> Sensitive identity fields (email, student_id, phone) were masked with <code>[REDACTED]</code>. The failure condition (<code>date: '25/09/2026'</code>) is strictly preserved for reproduction.
                      </div>
                    </div>

                    {/* 5. AI Diagnosis with Evidence */}
                    <div className="gh-card-section" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
                      <div className="gh-section-heading" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>## AI Diagnosis & Code Evidence</span>
                        <span className="badge badge-ai">LLM Diagnostic</span>
                      </div>
                      <div style={{ fontStyle: "italic", color: "var(--text-bright)", marginBottom: "8px", fontSize: "0.88rem" }}>
                        "{createdIssue.ai_diagnosis || redactedData?.ai_suggestion || "The backend function parse_and_validate_date in backend/date_handler.py strictly requires ISO-8601 YYYY-MM-DD format and rejects regional DD/MM/YYYY."}"
                      </div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-bright)", marginBottom: "4px" }}>
                        Supporting Code Citation (<code>backend/date_handler.py</code>):
                      </div>
                      <div className="code-block" style={{ fontSize: "0.76rem", maxHeight: "120px" }}>
{`def parse_and_validate_date(date_str: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    # Strict validation: Only YYYY-MM-DD is accepted
    try:
        parsed = datetime.strptime(date_str, "%Y-%m-%d")
        return True, parsed.strftime("%Y-%m-%d"), None
    except ValueError:
        return False, "", {
            "error": "Invalid date format",
            "expected": "YYYY-MM-DD",
            "received": date_str
        }`}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        ⚠️ AI-Generated Diagnostic (Not Verified Fact)
                      </div>
                    </div>

                    {/* 6. Reproduction Status */}
                    <div className="gh-card-section">
                      <div className="gh-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>## Reproduction & Verification Status</span>
                        {testOutput ? (
                          testOutput.passed ? (
                            <span className="badge badge-preserved">VERIFIED PASS (200 OK)</span>
                          ) : (
                            <span className="badge" style={{ backgroundColor: "rgba(248, 81, 73, 0.15)", color: "var(--accent-red-bright)", border: "1px solid rgba(248, 81, 73, 0.4)" }}>
                              CONFIRMED FAIL (400)
                            </span>
                          )
                        ) : (
                          <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}>
                            Ready to Run
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: "0.85rem", marginBottom: "8px" }}>
                        <strong>Reproduction Test Script:</strong> <code>test_repro.py</code>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                        {testOutput ? (
                          testOutput.passed ? (
                            <span style={{ color: "var(--accent-green-bright)" }}>
                              ✅ Fix confirmed! The standalone test script ran and succeeded with HTTP 200.
                            </span>
                          ) : (
                            <span style={{ color: "var(--accent-red-bright)" }}>
                              🔴 Reproduction confirmed! The standalone test script replicated the exact HTTP 400 failure.
                            </span>
                          )
                        ) : (
                          "Click 'Run Standalone Repro Test' above or execute `python test_repro.py` in your terminal to verify failure/pass state."
                        )}
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
        </div>
        )}

        {/* Feature 1 View: GitHub Repository Analyzer */}
        {activeTab === "repo_analyzer" && (
          <div>
            {/* Input Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">🌐 Public GitHub Repository Analyzer</h2>
                  <p className="card-subtitle">
                    Inspect remote repositories for fragile date/schema validations, silent exceptions, and security risks.
                  </p>
                </div>
                <span className="badge badge-ai">Automated Codebase Scanner</span>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">GitHub Repository URL</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="https://github.com/owner/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    disabled={isScanningRepo}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleScanRepository(repoUrl)}
                    disabled={isScanningRepo}
                    style={{ minWidth: "160px" }}
                  >
                    {isScanningRepo ? "⏳ Scanning Repo..." : "🔍 Scan Repository"}
                  </button>
                </div>

                {/* Quick Sample Links */}
                <div className="sample-pills-row">
                  <span style={{ color: "var(--text-muted)" }}>Quick Demo Repositories:</span>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => {
                      const url = "https://github.com/demo-org/attendance-system";
                      setRepoUrl(url);
                      handleScanRepository(url);
                    }}
                  >
                    ⚡ demo-org/attendance-system (LogLens Target App)
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => {
                      const url = "https://github.com/tiangolo/fastapi";
                      setRepoUrl(url);
                      handleScanRepository(url);
                    }}
                  >
                    ⚡ tiangolo/fastapi
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => {
                      const url = "https://github.com/pallets/flask";
                      setRepoUrl(url);
                      handleScanRepository(url);
                    }}
                  >
                    ⚡ pallets/flask
                  </button>
                </div>
              </div>

              {repoError && (
                <div className="alert-box alert-error" style={{ marginTop: "12px" }}>
                  <div className="alert-content">
                    <div className="alert-icon">❌</div>
                    <div>
                      <div className="alert-title">Repository Scan Failed</div>
                      <div className="alert-detail">{repoError}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results View */}
            {repoResult && (
              <div>
                {/* Diagnosis Summary Card */}
                <div className="card" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
                  <div className="card-header">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h3 className="card-title" style={{ fontSize: "1.15rem" }}>
                          📋 Codebase Diagnosis: {repoResult.repo}
                        </h3>
                        <span className="badge badge-preserved">Scan Complete</span>
                      </div>
                      <p className="card-subtitle" style={{ marginTop: "4px" }}>
                        Scanned Files: {repoResult.scanned_files?.map(f => `"${f}"`).join(", ") || "None"}
                      </p>
                    </div>
                    <a
                      href={repoResult.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline"
                    >
                      Open on GitHub ↗
                    </a>
                  </div>

                  <div style={{ fontSize: "0.92rem", color: "var(--text-bright)", lineHeight: 1.6, padding: "10px 0" }}>
                    {repoResult.summary}
                  </div>
                </div>

                {/* Two Column Results Layout: Issues on Left, Fixes & Repro on Right */}
                <div className="grid-two-col">
                  {/* Column 1: Issues Found */}
                  <div>
                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3 className="card-title">⚠️ Detected Issues & Vulnerabilities</h3>
                          <p className="card-subtitle">{repoResult.issues_found?.length || 0} issue(s) identified in scanned files</p>
                        </div>
                      </div>

                      <div>
                        {repoResult.issues_found?.map((iss) => (
                          <div key={iss.id} className={`issue-card-item ${iss.severity}`}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <strong style={{ color: "var(--text-bright)", fontSize: "0.9rem" }}>{iss.type}</strong>
                              <span className={`severity-tag ${iss.severity}`}>{iss.severity}</span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                              📁 <code>{iss.file}</code> {iss.line ? `(line ${iss.line})` : ""}
                            </div>
                            <p style={{ fontSize: "0.84rem", color: "var(--text-main)", marginBottom: "8px", lineHeight: 1.5 }}>
                              {iss.description}
                            </p>
                            {iss.snippet && (
                              <div className="code-block" style={{ maxHeight: "120px", fontSize: "0.76rem" }}>
                                {iss.snippet}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Recommended Fixes & Runnable Repro Test */}
                  <div>
                    {/* Recommended Fixes */}
                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3 className="card-title">🛠️ Recommended Actionable Fixes</h3>
                          <p className="card-subtitle">Step-by-step resolution plan</p>
                        </div>
                      </div>
                      <ol style={{ paddingLeft: "20px", fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.7 }}>
                        {repoResult.recommended_fixes?.map((fix, idx) => (
                          <li key={idx} style={{ marginBottom: "6px" }}>{fix}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Reproduction Test Snippet */}
                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3 className="card-title">🧪 Auto-Generated Reproduction Test</h3>
                          <p className="card-subtitle">Verifies vulnerability and proves when fix is applied</p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={handleCopyReproSnippet}
                        >
                          {copiedReproSnippet ? "✅ Copied!" : "📋 Copy Script"}
                        </button>
                      </div>
                      <div className="code-block" style={{ maxHeight: "320px", fontSize: "0.78rem" }}>
                        {repoResult.repro_script_preview}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature 2 View: File Upload Code Reviewer & Smart Refactorer */}
        {activeTab === "file_reviewer" && (
          <div>
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">📁 File Upload Code Reviewer & Smart Refactorer</h2>
                  <p className="card-subtitle">
                    Upload scripts (.py, .js, .ts, .json) to receive line-by-line annotations, security sanitization, and an improved refactored version.
                  </p>
                </div>
                <span className="badge badge-preserved">Privacy & Security First</span>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("loglens-file-input").click()}
              >
                <input
                  id="loglens-file-input"
                  type="file"
                  accept=".py,.js,.ts,.json"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <div className="upload-icon">📂</div>
                <div style={{ fontWeight: 600, color: "var(--text-bright)", fontSize: "1rem", marginBottom: "4px" }}>
                  {uploadedFile ? uploadedFile.name : (fileName ? fileName : "Drag & Drop your code file here, or click to browse")}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Supports: <code>.py</code>, <code>.js</code>, <code>.ts</code>, <code>.json</code> (Max 500KB) • Automatic Token/PII Sanitization
                </div>
              </div>

              {/* Quick Sample Code Loaders */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                <div className="sample-pills-row" style={{ marginTop: 0 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>Quick Sample Loaders:</span>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => loadSampleCode("python")}
                  >
                    📄 Load Buggy Date Validator (.py)
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => loadSampleCode("javascript")}
                  >
                    📄 Load Unsafe Date API (.js)
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => loadSampleCode("json")}
                  >
                    📄 Load Sensitive Attendance Payload (.json)
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAnalyzeFile}
                  disabled={isAnalyzingFile || (!uploadedFile && !fileCodeContent)}
                  style={{ minWidth: "180px" }}
                >
                  {isAnalyzingFile ? "⏳ Reviewing Code..." : "🛡️ Analyze & Refactor with LogLens"}
                </button>
              </div>

              {fileError && (
                <div className="alert-box alert-error" style={{ marginTop: "14px" }}>
                  <div className="alert-content">
                    <div className="alert-icon">❌</div>
                    <div>
                      <div className="alert-title">Analysis Failed</div>
                      <div className="alert-detail">{fileError}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results View */}
            {fileResult && (
              <div>
                {/* Meta Bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  padding: "12px 18px",
                  backgroundColor: "var(--bg-secondary)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "16px"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <strong style={{ color: "var(--text-bright)", fontSize: "1rem" }}>
                        📄 {fileResult.filename}
                      </strong>
                      <span className="badge badge-preserved" style={{ textTransform: "uppercase" }}>
                        {fileResult.language}
                      </span>
                      <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-muted)" }}>
                        {fileResult.line_count} lines
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Found {fileResult.annotations?.length || 0} potential edge cases, anti-patterns, or bugs.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span className="badge badge-preserved" style={{ fontSize: "0.78rem", padding: "4px 10px" }}>
                      🔒 {fileResult.sanitized_secrets_count} token(s)/PII scrubbed
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={handleCopyImprovedCode}
                    >
                      {copiedImprovedCode ? "✅ Copied!" : "📋 Copy Refactored Code"}
                    </button>
                  </div>
                </div>

                {/* Developer Checklist */}
                <div className="checklist-card">
                  <div style={{ fontWeight: 600, color: "var(--text-bright)", fontSize: "0.95rem", marginBottom: "10px" }}>
                    ✅ Developer Action Checklist: What to do next
                  </div>
                  <div>
                    {fileResult.checklist?.map((item, idx) => (
                      <div key={idx} className="checklist-item-row">
                        <input
                          type="checkbox"
                          className="checklist-checkbox"
                          checked={!!checkedChecklist[idx]}
                          onChange={() => toggleChecklistItem(idx)}
                        />
                        <span style={{
                          textDecoration: checkedChecklist[idx] ? "line-through" : "none",
                          color: checkedChecklist[idx] ? "var(--text-muted)" : "var(--text-bright)"
                        }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Side-by-Side Code Comparison */}
                <div className="code-comparison-grid">
                  {/* Left Column: Original Code & Annotations */}
                  <div className="code-panel">
                    <div className="code-panel-header">
                      <span>Original Code (with Line Annotations)</span>
                      <span className="badge badge-ai">{fileResult.annotations?.length || 0} Annotations</span>
                    </div>
                    {/* Inline Annotations List */}
                    {fileResult.annotations?.length > 0 && (
                      <div style={{ padding: "10px", backgroundColor: "var(--bg-tertiary)", borderBottom: "1px solid var(--border-color)", maxHeight: "180px", overflowY: "auto" }}>
                        {fileResult.annotations.map((ann, idx) => (
                          <div key={idx} className="annotation-badge">
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: "2px" }}>
                              <span>Line {ann.line}: {ann.category}</span>
                              <span className={`severity-tag ${ann.severity === "high" ? "critical" : (ann.severity === "medium" ? "warning" : "info")}`}>
                                {ann.severity}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-main)" }}>{ann.comment}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="code-panel-body">
                      {fileCodeContent || "# No preview available"}
                    </div>
                  </div>

                  {/* Right Column: Refactored / Improved Code */}
                  <div className="code-panel">
                    <div className="code-panel-header">
                      <span>Improved & Idiomatic Code</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleCopyImprovedCode}
                      >
                        {copiedImprovedCode ? "✅ Copied!" : "📋 Copy"}
                      </button>
                    </div>
                    <div className="code-panel-body">
                      {fileResult.improved_code}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
