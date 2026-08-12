export default function Header({ systemReady, demoMode }) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Demo monitoring console</p>
        <h1>Kapture Collections AI</h1>
        <p className="subtitle">Maya - AI Voice Collections Agent</p>
      </div>
      <div className="header-status" aria-label="System status">
        <span className={`status-dot ${systemReady ? "ok" : "failed"}`} />
        <span>{systemReady ? "System Ready" : "Mock Server Offline"}</span>
        {demoMode && <strong>DEMO MODE - SIMULATED CALL</strong>}
      </div>
    </header>
  );
}
