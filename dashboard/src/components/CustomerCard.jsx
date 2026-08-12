export default function CustomerCard({ verified }) {
  return (
    <section className="card">
      <div className="card-title-row">
        <h2>Customer</h2>
        <span className={`badge ${verified ? "success" : "locked"}`}>
          {verified ? "Verified" : "Locked"}
        </span>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Name</dt>
          <dd>Rahul Sharma</dd>
        </div>
        <div>
          <dt>Account</dt>
          <dd>ACC-88392</dd>
        </div>
        <div>
          <dt>Loan</dt>
          <dd>Personal Loan</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>{verified ? "PAN last 4 verified" : "Debt disclosure locked"}</dd>
        </div>
      </dl>
    </section>
  );
}
