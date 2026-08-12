export default function ToolActivity({ tools }) {
  return (
    <section className="card tall">
      <h2>Tool Activity</h2>
      <div className="tool-list" aria-live="polite">
        {tools.length === 0 && <p className="empty">Tool calls will appear here during demo execution.</p>}
        {tools.map((tool) => (
          <article className={`tool-item ${tool.status.toLowerCase()}`} key={tool.id}>
            <div className="tool-heading">
              <strong>{tool.name}</strong>
              <span className={`badge ${tool.status.toLowerCase()}`}>{tool.status}</span>
            </div>
            <dl>
              <div>
                <dt>Parameters</dt>
                <dd>{tool.params}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{tool.result}</dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>{tool.time}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
