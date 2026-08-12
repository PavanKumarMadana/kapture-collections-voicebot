export default function DispositionCard({ disposition }) {
  return (
    <section className="card">
      <div className="card-title-row">
        <h2>Final Disposition</h2>
        <span className={`badge ${disposition.status ? "success" : "locked"}`}>
          {disposition.status || "Pending"}
        </span>
      </div>
      {!disposition.status ? (
        <p className="empty">No terminal outcome logged yet.</p>
      ) : (
        <dl className="detail-list">
          <div>
            <dt>Status</dt>
            <dd>{disposition.status}</dd>
          </div>
          {disposition.notes && (
            <div>
              <dt>Notes</dt>
              <dd>{disposition.notes}</dd>
            </div>
          )}
          {disposition.ptpDate && (
            <div>
              <dt>PTP Date</dt>
              <dd>{disposition.ptpDate}</dd>
            </div>
          )}
          {disposition.ptpAmount && (
            <div>
              <dt>PTP Amount</dt>
              <dd>Rs. {disposition.ptpAmount.toLocaleString("en-IN")}</dd>
            </div>
          )}
          {disposition.escalationId && (
            <div>
              <dt>Escalation ID</dt>
              <dd>{disposition.escalationId}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
