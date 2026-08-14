const states = [
  "INIT",
  "AUTH_PENDING",
  "AUTHENTICATED",
  "NEGOTIATION",
  "ACTION_EXECUTION",
  "PTP_COLLECTED",
  "ESCALATED",
  "WRONG_PERSON",
  "DO_NOT_CALL",
  "NO_INPUT",
  "CALLBACK_REQUESTED",
  "ALREADY_PAID",
  "DISPUTED",
  "HARDSHIP_ESCALATED",
  "HOSTILE",
  "CALL_ENDED"
];

const mainOrder = ["INIT", "AUTH_PENDING", "AUTHENTICATED", "NEGOTIATION", "ACTION_EXECUTION", "PTP_COLLECTED", "CALL_ENDED"];
const terminalStates = new Set(["PTP_COLLECTED", "ESCALATED", "WRONG_PERSON", "DO_NOT_CALL", "NO_INPUT", "CALLBACK_REQUESTED", "ALREADY_PAID", "DISPUTED", "HARDSHIP_ESCALATED", "HOSTILE", "CALL_ENDED"]);

export default function StateMachine({ currentState, completedStates, verified }) {
  return (
    <section className="card wide">
      <div className="card-title-row">
        <h2>Conversation State</h2>
        <span className={`badge ${verified ? "success" : "locked"}`}>
          Debt Disclosure: {verified ? "Unlocked" : "Locked"}
        </span>
      </div>
      <p className="rule-note">
        Critical rule: debt disclosure stays locked until verify_customer returns verified=true.
      </p>
      <div className="state-grid" aria-label="Conversation state machine">
        {states.map((state) => {
          const completed = completedStates.includes(state);
          const current = currentState === state;
          const inactive = !completed && !current;
          return (
            <div
              className={`state-node ${completed ? "completed" : ""} ${current ? "current" : ""} ${inactive ? "inactive" : ""} ${terminalStates.has(state) ? "terminal" : ""}`}
              key={state}
            >
              <span>{completed ? "Done" : current ? "Now" : "Next"}</span>
              <strong>{state}</strong>
            </div>
          );
        })}
      </div>
      <div className="state-path">
        {mainOrder.join(" -> ")}
      </div>
    </section>
  );
}
