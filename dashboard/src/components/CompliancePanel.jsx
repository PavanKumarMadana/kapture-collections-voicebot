export default function CompliancePanel({ verified, dispositionLogged, scenario }) {
  const items = [
    {
      label: "Authentication",
      status: verified ? "Passed" : "Pending",
      tone: verified ? "success" : "locked"
    },
    {
      label: "Debt Disclosure Lock",
      status: verified ? "Unlocked after verification" : "Locked",
      tone: verified ? "success" : "locked"
    },
    {
      label: "Third-party Disclosure",
      status: "Protected",
      tone: "success"
    },
    {
      label: "DNC",
      status: "Enabled",
      tone: "success"
    },
    {
      label: "Hallucination Guard",
      status: "Enabled",
      tone: "success"
    },
    {
      label: "Disposition Logging",
      status: dispositionLogged ? "Logged" : "Awaiting final state",
      tone: dispositionLogged ? "success" : "locked"
    }
  ];

  return (
    <section className="card">
      <div className="card-title-row">
        <h2>Compliance</h2>
        <span className="badge neutral">{scenario || "No scenario"}</span>
      </div>
      <div className="compliance-list">
        {items.map((item) => (
          <div className="compliance-row" key={item.label}>
            <span>{item.label}</span>
            <strong className={item.tone}>{item.status}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
