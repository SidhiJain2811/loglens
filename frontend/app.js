const { useState, useEffect } = React;

function App() {
  // GitHub & System Status State
  const [systemStatus, setSystemStatus] = useState({
    github_connected: false,
    github_owner: "demo-org",
    github_repo: "attendance-system",
    llm_connected: false,
    llm_provider: "Built-in Engine"
  });

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customOwner, setCustomOwner] = useState("");
  const [customRepo, setCustomRepo] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Dashboard Active Tab: 'repo_analyzer' | 'file_reviewer'
  const [activeTab, setActiveTab] = useState("repo_analyzer");

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

  return (
    <div>
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="logo-badge">LL</div>
          <div>
            <div className="brand-title">LogLens Developer Tool</div>
            <div className="brand-tagline">Automated Codebase Scanner & Smart Code Refactorer</div>
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

          <button
            type="button"
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
                    ⚡ demo-org/attendance-system
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

      {/* MODAL: GitHub Integration Settings */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <div className="modal-title">
                <span>⚙️</span> GitHub Integration Settings
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setIsSettingsOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div className="modal-body">
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                  Configure your GitHub Personal Access Token to enable live issue creation and avoid rate limits.
                </p>

                <div className="form-group">
                  <label className="form-label">Repository Owner</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customOwner}
                    onChange={(e) => setCustomOwner(e.target.value)}
                    placeholder="e.g. your-username or org"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Repository Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customRepo}
                    onChange={(e) => setCustomRepo(e.target.value)}
                    placeholder="e.g. your-repo"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GitHub Token (PAT)</label>
                  <input
                    type="password"
                    className="form-input"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                  <div className="form-hint">Requires <code>repo</code> or <code>public_repo</code> scope.</div>
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
                  {isSavingConfig ? "Saving..." : "Save Settings"}
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
