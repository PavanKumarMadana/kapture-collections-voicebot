import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import CallStatus from "./components/CallStatus.jsx";
import CustomerCard from "./components/CustomerCard.jsx";
import StateMachine from "./components/StateMachine.jsx";
import ConversationPanel from "./components/ConversationPanel.jsx";
import ToolActivity from "./components/ToolActivity.jsx";
import DispositionCard from "./components/DispositionCard.jsx";
import CompliancePanel from "./components/CompliancePanel.jsx";
import {
  checkHealth,
  getAccountDetails,
  logPromiseToPay,
  markDisposition,
  sendPaymentLink,
  escalateToAgent,
  verifyCustomer
} from "./services/api.js";

const initialState = {
  callStatus: "Ready",
  currentState: "INIT",
  completedStates: [],
  verified: false,
  messages: [],
  tools: [],
  disposition: {},
  scenario: "",
  activeSteps: [],
  stepIndex: 0,
  startedAt: null,
  error: ""
};

const formatTime = () =>
  new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

const futurePtpDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

function message(speaker, text) {
  return { type: "message", speaker, text };
}

function state(currentState) {
  return { type: "state", currentState };
}

function status(callStatus) {
  return { type: "status", callStatus };
}

function localTool(name, params, result, toolStatus = "SUCCESS") {
  return { type: "localTool", name, params, result, status: toolStatus };
}

function tool(name, params, action, resultFormatter) {
  return { type: "tool", name, params, action, resultFormatter };
}

function disposition(statusValue, notes, extras = {}) {
  return { type: "disposition", status: statusValue, notes, extras };
}

function complete(...states) {
  return { type: "complete", states };
}

function getScenarios(ptpDate) {
  return {
    happyPath: [
      status("Connecting"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      status("Connected"),
      message("CUSTOMER", "Yes, this is Rahul."),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "For security purposes, could you please confirm the last four digits of your PAN or your year of birth?"),
      message("CUSTOMER", "My PAN last four digits are 1234."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=1234", () => verifyCustomer("1234"), (r) => `verified=${r.verified}`),
      complete("AUTH_PENDING"),
      state("AUTHENTICATED"),
      tool("get_account_details", "account_id=ACC-88392", getAccountDetails, (r) => `Rs. ${r.overdue_amount.toLocaleString("en-IN")}, DPD=${r.days_past_due}`),
      message("MAYA", "Thank you for verifying your identity. Your EMI of Rs. 8,499 is currently overdue by 12 days."),
      complete("AUTHENTICATED"),
      state("NEGOTIATION"),
      message("CUSTOMER", "I can pay tomorrow."),
      message("MAYA", `I will record a promise to pay Rs. 8,499 on ${ptpDate}.`),
      complete("NEGOTIATION"),
      state("ACTION_EXECUTION"),
      tool("log_promise_to_pay", `account_id=ACC-88392, ptp_date=${ptpDate}, amount=8499`, () => logPromiseToPay(ptpDate, 8499), (r) => `ptp_id=${r.ptp_id}`),
      tool("send_payment_link", "account_id=ACC-88392, channel=SMS", () => sendPaymentLink("SMS"), (r) => `message_id=${r.message_id}`),
      tool("mark_disposition", "status=PTP_AGREED", () => markDisposition("PTP_AGREED", "Customer agreed to pay full overdue EMI."), (r) => r.disposition),
      disposition("PTP_AGREED", "Customer agreed to pay full overdue EMI.", { ptpDate, ptpAmount: 8499 }),
      complete("ACTION_EXECUTION"),
      state("PTP_COLLECTED"),
      complete("PTP_COLLECTED"),
      state("CALL_ENDED"),
      status("Completed"),
      message("MAYA", "Thank you. Your promise-to-pay has been recorded and the mock payment link has been sent.")
    ],
    security: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Yes, I am Rahul. How much do I owe?"),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "For security and privacy reasons, I first need to verify your identity before discussing any account details."),
      localTool("debt_disclosure_lock", "state=AUTH_PENDING", "LOCKED"),
      message("CUSTOMER", "The code is 1234."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=1234", () => verifyCustomer("1234"), (r) => `verified=${r.verified}`),
      complete("AUTH_PENDING"),
      state("AUTHENTICATED"),
      localTool("debt_disclosure_lock", "verified=true", "UNLOCKED"),
      message("MAYA", "Thank you for verifying your identity. I can now discuss the account details."),
      status("Connected")
    ],
    dnc: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Stop calling me. Put me on the do-not-call list."),
      localTool("intent_detected", "utterance=stop calling me", "DNC"),
      tool("mark_disposition", "status=DO_NOT_CALL", () => markDisposition("DO_NOT_CALL", "Customer requested no further calls."), (r) => r.disposition),
      disposition("DO_NOT_CALL", "Customer requested no further calls."),
      state("CALL_ENDED"),
      status("Completed"),
      message("MAYA", "I have recorded your request. You will not receive further collection calls for this demo account.")
    ],
    alreadyPaid: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Yes, Rahul here."),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "For security purposes, could you please confirm the last four digits of your PAN or your year of birth?"),
      message("CUSTOMER", "1234."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=1234", () => verifyCustomer("1234"), (r) => `verified=${r.verified}`),
      complete("AUTH_PENDING"),
      state("AUTHENTICATED"),
      message("CUSTOMER", "I already paid yesterday."),
      message("MAYA", "Thank you for letting me know. When did you make the payment and through which mode?"),
      message("CUSTOMER", "Yesterday through UPI, reference UPI123."),
      tool("mark_disposition", "status=ALREADY_PAID", () => markDisposition("ALREADY_PAID", "Customer claims payment through UPI, reference UPI123."), (r) => r.disposition),
      disposition("ALREADY_PAID", "Customer claims payment through UPI, reference UPI123."),
      state("CALL_ENDED"),
      status("Completed")
    ],
    dispute: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Yes, Rahul."),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "For security purposes, could you please confirm the last four digits of your PAN or your year of birth?"),
      message("CUSTOMER", "1234."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=1234", () => verifyCustomer("1234"), (r) => `verified=${r.verified}`),
      complete("AUTH_PENDING"),
      state("AUTHENTICATED"),
      message("CUSTOMER", "I do not recognize this amount."),
      message("MAYA", "I understand. I will route this for review and will not continue collection negotiation on this call."),
      state("ACTION_EXECUTION"),
      tool("escalate_to_agent", "reason=DISPUTE", () => escalateToAgent("DISPUTE", "Customer does not recognize the amount."), (r) => `escalation_id=${r.escalation_id}`),
      tool("mark_disposition", "status=DISPUTED", () => markDisposition("DISPUTED", "Customer disputes the amount."), (r) => r.disposition),
      disposition("DISPUTED", "Customer disputes the amount.", { escalationId: "See tool result" }),
      complete("AUTHENTICATED", "ACTION_EXECUTION"),
      state("ESCALATED"),
      status("Completed"),
      state("CALL_ENDED")
    ],
    wrongPerson: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "I am Rahul's brother. Tell me what this is about."),
      message("MAYA", "For privacy and security reasons, I can only discuss this matter directly with Rahul. Please ask him to contact us or let me know if he is available."),
      localTool("privacy_guard", "speaker=third_party", "NO_DEBT_DISCLOSURE"),
      tool("mark_disposition", "status=WRONG_PERSON", () => markDisposition("WRONG_PERSON", "Third party answered; Rahul unavailable."), (r) => r.disposition),
      disposition("WRONG_PERSON", "Third party answered; Rahul unavailable."),
      state("WRONG_PERSON"),
      status("Completed"),
      state("CALL_ENDED")
    ],
    hardship: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Yes, Rahul here."),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "For security purposes, could you please confirm the last four digits of your PAN or your year of birth?"),
      message("CUSTOMER", "1234."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=1234", () => verifyCustomer("1234"), (r) => `verified=${r.verified}`),
      complete("AUTH_PENDING"),
      state("AUTHENTICATED"),
      message("CUSTOMER", "I cannot pay right now. I lost my job."),
      message("MAYA", "I am sorry to hear that. I will route this to a specialist for review. I cannot promise any waiver or discount on this call."),
      state("ACTION_EXECUTION"),
      tool("escalate_to_agent", "reason=HARDSHIP", () => escalateToAgent("HARDSHIP", "Customer reports job loss and inability to pay."), (r) => `escalation_id=${r.escalation_id}`),
      tool("mark_disposition", "status=HARDSHIP_ESCALATED", () => markDisposition("HARDSHIP_ESCALATED", "Hardship claim escalated for review."), (r) => r.disposition),
      disposition("HARDSHIP_ESCALATED", "Hardship claim escalated for review.", { escalationId: "See tool result" }),
      complete("AUTHENTICATED", "ACTION_EXECUTION"),
      state("ESCALATED"),
      status("Completed"),
      state("CALL_ENDED")
    ],
    callback: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Call me tomorrow evening."),
      message("MAYA", "I have recorded your callback request. I cannot confirm a scheduled callback because no scheduling system is connected in this demo."),
      localTool("callback_time_captured", "utterance=tomorrow evening", "Callback_Time=tomorrow evening"),
      tool("mark_disposition", "status=CALLBACK_REQUESTED", () => markDisposition("CALLBACK_REQUESTED", "Customer requested callback tomorrow evening."), (r) => r.disposition),
      disposition("CALLBACK_REQUESTED", "Customer requested callback tomorrow evening."),
      state("CALLBACK_REQUESTED"),
      status("Completed"),
      state("CALL_ENDED")
    ],
    hostile: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Stop bothering me!"),
      message("MAYA", "I understand you are upset. I can continue only if we keep the conversation respectful."),
      message("CUSTOMER", "Continues abusive language."),
      tool("mark_disposition", "status=HOSTILE", () => markDisposition("HOSTILE", "Caller remained hostile after warning."), (r) => r.disposition),
      disposition("HOSTILE", "Caller remained hostile after warning."),
      state("HOSTILE"),
      status("Completed"),
      state("CALL_ENDED")
    ],
    noInput: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "[No response]"),
      message("MAYA", "Hello, are you able to hear me?"),
      message("CUSTOMER", "[No response]"),
      message("MAYA", "I am unable to hear a response, so I will end this call now."),
      localTool("voicemail_guard", "speaker=unknown", "NO_DEBT_DISCLOSURE"),
      tool("mark_disposition", "status=NO_RESPONSE", () => markDisposition("NO_RESPONSE", "No meaningful response after retries."), (r) => r.disposition),
      disposition("NO_RESPONSE", "No meaningful response after retries."),
      state("NO_INPUT"),
      status("Completed"),
      state("CALL_ENDED")
    ],
    invalidVerification: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Yes, this is Rahul."),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "For security purposes, could you please confirm the last four digits of your PAN or your year of birth?"),
      message("CUSTOMER", "9999."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=9999", () => verifyCustomer("9999"), (r) => `verified=${r.verified}`),
      localTool("debt_disclosure_lock", "verified=false", "LOCKED"),
      message("MAYA", "I could not verify that information. For privacy reasons, I cannot discuss account details unless verification succeeds."),
      state("AUTH_PENDING"),
      status("Connected")
    ],
    bilingual: [
      status("Connected"),
      state("INIT"),
      message("MAYA", "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"),
      message("CUSTOMER", "Haan main Rahul bol raha hoon."),
      complete("INIT"),
      state("AUTH_PENDING"),
      message("MAYA", "Security ke liye, please PAN ke last four digits ya birth year confirm kariye."),
      message("CUSTOMER", "PAN ke last four digits 1234 hain."),
      tool("verify_customer", "account_id=ACC-88392, verification_code=1234", () => verifyCustomer("1234"), (r) => `verified=${r.verified}`),
      complete("AUTH_PENDING"),
      state("AUTHENTICATED"),
      tool("get_account_details", "account_id=ACC-88392", getAccountDetails, (r) => `Rs. ${r.overdue_amount.toLocaleString("en-IN")}, DPD=${r.days_past_due}`),
      message("MAYA", "Thank you. Aapki identity verify ho gayi hai. Aapka EMI Rs. 8,499, 12 din se overdue hai."),
      complete("AUTHENTICATED"),
      state("NEGOTIATION"),
      message("CUSTOMER", "Main Friday ko pay kar dunga."),
      message("MAYA", "Theek hai, main promise-to-pay record kar rahi hoon."),
      state("ACTION_EXECUTION"),
      tool("log_promise_to_pay", `account_id=ACC-88392, ptp_date=${ptpDate}, amount=8499`, () => logPromiseToPay(ptpDate, 8499), (r) => `ptp_id=${r.ptp_id}`),
      tool("send_payment_link", "account_id=ACC-88392, channel=SMS", () => sendPaymentLink("SMS"), (r) => `message_id=${r.message_id}`),
      tool("mark_disposition", "status=PTP_AGREED", () => markDisposition("PTP_AGREED", "Hinglish customer agreed to pay."), (r) => r.disposition),
      disposition("PTP_AGREED", "Hinglish customer agreed to pay.", { ptpDate, ptpAmount: 8499 }),
      complete("NEGOTIATION", "ACTION_EXECUTION"),
      state("PTP_COLLECTED"),
      status("Completed"),
      state("CALL_ENDED")
    ]
  };
}

export default function App() {
  const [dashboard, setDashboard] = useState(initialState);
  const [systemReady, setSystemReady] = useState(false);
  const timerRef = useRef(null);
  const runningRef = useRef(false);
  const scenarios = useMemo(() => getScenarios(futurePtpDate()), []);

  useEffect(() => {
    checkHealth().then(() => setSystemReady(true)).catch(() => setSystemReady(false));
    return () => clearTimeout(timerRef.current);
  }, []);

  const duration = useMemo(() => {
    if (!dashboard.startedAt) return "00:00";
    const seconds = Math.max(0, Math.floor((Date.now() - dashboard.startedAt) / 1000));
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const rem = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rem}`;
  }, [dashboard.startedAt, dashboard.messages.length, dashboard.tools.length]);

  function reset() {
    clearTimeout(timerRef.current);
    runningRef.current = false;
    setDashboard(initialState);
  }

  function startScenario(key, scenarioName) {
    clearTimeout(timerRef.current);
    runningRef.current = false;
    setDashboard({
      ...initialState,
      callStatus: "Ready",
      scenario: scenarioName,
      activeSteps: scenarios[key],
      startedAt: Date.now()
    });
  }

  async function applyStep(step) {
    if (!step) return;
    if (step.type === "status") {
      setDashboard((prev) => ({ ...prev, callStatus: step.callStatus }));
      return;
    }
    if (step.type === "state") {
      setDashboard((prev) => ({ ...prev, currentState: step.currentState }));
      return;
    }
    if (step.type === "complete") {
      setDashboard((prev) => ({
        ...prev,
        completedStates: Array.from(new Set([...prev.completedStates, ...step.states]))
      }));
      return;
    }
    if (step.type === "message") {
      setDashboard((prev) => ({
        ...prev,
        messages: [...prev.messages, { id: `msg-${Date.now()}-${prev.messages.length}`, speaker: step.speaker, text: step.text, time: `Demo ${formatTime()}` }]
      }));
      return;
    }
    if (step.type === "localTool") {
      setDashboard((prev) => ({
        ...prev,
        tools: [...prev.tools, { id: `tool-${Date.now()}-${prev.tools.length}`, name: step.name, status: step.status, params: step.params, result: step.result, time: `Demo ${formatTime()}` }]
      }));
      return;
    }
    if (step.type === "tool") {
      const toolId = `tool-${Date.now()}`;
      setDashboard((prev) => ({
        ...prev,
        callStatus: "Processing",
        tools: [...prev.tools, { id: toolId, name: step.name, status: "RUNNING", params: step.params, result: "Waiting for mock server...", time: `Demo ${formatTime()}` }]
      }));
      try {
        const result = await step.action();
        setDashboard((prev) => ({
          ...prev,
          callStatus: "Connected",
          verified: step.name === "verify_customer" && result.verified ? true : prev.verified,
          tools: prev.tools.map((item) =>
            item.id === toolId ? { ...item, status: "SUCCESS", result: step.resultFormatter(result) } : item
          )
        }));
      } catch (error) {
        setDashboard((prev) => ({
          ...prev,
          callStatus: "Failed",
          error: error.message,
          tools: prev.tools.map((item) =>
            item.id === toolId ? { ...item, status: "FAILED", result: error.message } : item
          )
        }));
      }
      return;
    }
    if (step.type === "disposition") {
      setDashboard((prev) => ({
        ...prev,
        disposition: {
          status: step.status,
          notes: step.notes,
          ...step.extras
        }
      }));
    }
  }

  async function nextStep() {
    const step = dashboard.activeSteps[dashboard.stepIndex];
    if (!step) return;
    await applyStep(step);
    setDashboard((prev) => ({ ...prev, stepIndex: prev.stepIndex + 1 }));
  }

  async function runAll(key, scenarioName) {
    const steps = scenarios[key];
    clearTimeout(timerRef.current);
    runningRef.current = true;
    setDashboard({
      ...initialState,
      scenario: scenarioName,
      activeSteps: steps,
      startedAt: Date.now()
    });

    for (const step of steps) {
      if (!runningRef.current) break;
      await new Promise((resolve) => {
        timerRef.current = setTimeout(resolve, 420);
      });
      await applyStep(step);
      setDashboard((prev) => ({ ...prev, stepIndex: prev.stepIndex + 1 }));
    }
    runningRef.current = false;
  }

  return (
    <div className="app-shell">
      <Header systemReady={systemReady} demoMode={Boolean(dashboard.scenario)} />
      <main>
        <section className="control-bar" aria-label="Demo controls">
          <div>
            <h2>Demo Mode</h2>
            <p>Simulated call monitor. Vapi remains the actual voice agent; this dashboard visualizes the same state machine and mock tool backend.</p>
          </div>
          <div className="button-row">
            <button onClick={() => startScenario("happyPath", "Happy Path")}>Start Demo</button>
            <button onClick={nextStep} disabled={!dashboard.activeSteps.length || dashboard.stepIndex >= dashboard.activeSteps.length}>Next Step</button>
            <button onClick={() => runAll("happyPath", "Happy Path")}>Run Happy Path</button>
            <button onClick={() => runAll("security", "Pre-Authentication Security")}>Security Scenario</button>
            <button onClick={() => runAll("dnc", "Do Not Call")}>Run DNC Scenario</button>
            <button onClick={() => runAll("alreadyPaid", "Already Paid")}>Already Paid</button>
            <button onClick={() => runAll("dispute", "Dispute")}>Dispute</button>
            <button onClick={() => runAll("wrongPerson", "Wrong Person")}>Wrong Person</button>
            <button onClick={() => runAll("hardship", "Hardship")}>Hardship</button>
            <button onClick={() => runAll("callback", "Callback")}>Callback</button>
            <button onClick={() => runAll("hostile", "Hostile")}>Hostile</button>
            <button onClick={() => runAll("noInput", "No Input")}>No Input</button>
            <button onClick={() => runAll("invalidVerification", "Invalid Verification")}>Invalid Verification</button>
            <button onClick={() => runAll("bilingual", "Hindi/Hinglish")}>Hindi/Hinglish</button>
            <button className="secondary" onClick={reset}>Reset</button>
          </div>
          {dashboard.error && <p className="error-text">Tool failure: {dashboard.error}</p>}
        </section>

        <div className="overview-grid">
          <CallStatus status={dashboard.callStatus} duration={duration} callId={dashboard.scenario ? "demo-call-local" : "not started"} />
          <CustomerCard verified={dashboard.verified} />
          <CompliancePanel verified={dashboard.verified} dispositionLogged={Boolean(dashboard.disposition.status)} scenario={dashboard.scenario} />
        </div>

        <StateMachine currentState={dashboard.currentState} completedStates={dashboard.completedStates} verified={dashboard.verified} />

        <div className="work-grid">
          <ConversationPanel messages={dashboard.messages} />
          <ToolActivity tools={dashboard.tools} />
        </div>

        <DispositionCard disposition={dashboard.disposition} />
      </main>
    </div>
  );
}
