export default function ConversationPanel({ messages }) {
  return (
    <section className="card tall">
      <h2>Conversation Transcript</h2>
      <p className="section-note">Demo timestamps are simulated for walkthrough clarity.</p>
      <div className="transcript" aria-live="polite">
        {messages.length === 0 && <p className="empty">Start a demo scenario to view the transcript.</p>}
        {messages.map((message) => (
          <article className={`message ${message.speaker.toLowerCase()}`} key={message.id}>
            <div className="message-meta">
              <strong>{message.speaker}</strong>
              <span>{message.time}</span>
            </div>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
