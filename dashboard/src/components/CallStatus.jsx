export default function CallStatus({ status, duration, callId }) {
  return (
    <section className="card">
      <div className="card-title-row">
        <h2>Call Status</h2>
        <span className={`badge ${status.toLowerCase()}`}>{status}</span>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Duration</dt>
          <dd>{duration}</dd>
        </div>
        <div>
          <dt>Call ID</dt>
          <dd>{callId}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>Demo data</dd>
        </div>
      </dl>
    </section>
  );
}
