const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const dashboardBuildPath = path.join(__dirname, "..", "dashboard", "dist");
const hasDashboardBuild = fs.existsSync(path.join(dashboardBuildPath, "index.html"));

const mockAccounts = {
  "ACC-88392": {
    account_id: "ACC-88392",
    customer_name: "Rahul Sharma",
    masked_customer_name: "Rahul S****",
    loan_type: "Personal Loan",
    overdue_amount: 8499,
    days_past_due: 12,
    valid_verification_codes: ["1234", "1995"]
  }
};

const promiseToPayRecords = [];
const escalations = [];
const dispositions = [];

function nowIso() {
  return new Date().toISOString();
}

function ok(result) {
  return { success: true, ...result };
}

function fail(message, code = "BAD_REQUEST", details = undefined) {
  return { success: false, error: { code, message, details } };
}

function getArgs(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.arguments && typeof payload.arguments === "object") return payload.arguments;
  if (payload.parameters && typeof payload.parameters === "object") return payload.parameters;
  if (payload.function?.arguments && typeof payload.function.arguments === "object") return payload.function.arguments;
  if (typeof payload.function?.arguments === "string") {
    try {
      return JSON.parse(payload.function.arguments);
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeToolCall(body) {
  const message = body?.message || body;
  const toolCall =
    message?.toolCallList?.[0] ||
    message?.toolCalls?.[0] ||
    message?.toolCall ||
    message?.functionCall ||
    body?.toolCall ||
    body?.functionCall;

  if (!toolCall) return null;

  const name =
    toolCall.function?.name ||
    toolCall.name ||
    toolCall.toolName ||
    toolCall.functionName;

  return {
    id: toolCall.id || toolCall.toolCallId || "mock-tool-call",
    name,
    arguments: getArgs(toolCall)
  };
}

function requireFields(args, fields) {
  const missing = fields.filter((field) => args[field] === undefined || args[field] === null || args[field] === "");
  return missing.length ? fail(`Missing required parameter(s): ${missing.join(", ")}`, "MISSING_PARAMETERS") : null;
}

function getAccount(accountId) {
  return mockAccounts[accountId];
}

function handleToolCall(name, args = {}) {
  switch (name) {
    case "get_account_details": {
      const validation = requireFields(args, ["account_id"]);
      if (validation) return validation;
      const account = getAccount(args.account_id);
      if (!account) return fail("Account not found", "ACCOUNT_NOT_FOUND");
      return ok({
        account_id: account.account_id,
        customer_name: account.customer_name,
        loan_type: account.loan_type,
        overdue_amount: account.overdue_amount,
        days_past_due: account.days_past_due,
        verification_required_for_disclosure: true
      });
    }

    case "verify_customer": {
      const validation = requireFields(args, ["account_id", "verification_code"]);
      if (validation) return validation;
      const account = getAccount(args.account_id);
      if (!account) return fail("Account not found", "ACCOUNT_NOT_FOUND");
      const verified = account.valid_verification_codes.includes(String(args.verification_code).trim());
      if (!verified) return { success: true, verified: false, message: "Verification failed" };
      return { success: true, verified: true, customer_name: account.customer_name };
    }

    case "log_promise_to_pay": {
      const validation = requireFields(args, ["account_id", "ptp_date", "amount"]);
      if (validation) return validation;
      if (!getAccount(args.account_id)) return fail("Account not found", "ACCOUNT_NOT_FOUND");
      const amount = Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) return fail("amount must be a positive number", "INVALID_AMOUNT");
      const record = {
        ptp_id: `PTP-${String(promiseToPayRecords.length + 1).padStart(5, "0")}`,
        account_id: args.account_id,
        confirmed_date: args.ptp_date,
        amount,
        created_at: nowIso()
      };
      promiseToPayRecords.push(record);
      return ok({ ptp_id: record.ptp_id, confirmed_date: record.confirmed_date, amount: record.amount });
    }

    case "send_payment_link": {
      const validation = requireFields(args, ["account_id", "channel"]);
      if (validation) return validation;
      if (!getAccount(args.account_id)) return fail("Account not found", "ACCOUNT_NOT_FOUND");
      const channel = String(args.channel).toUpperCase();
      if (!["SMS", "WHATSAPP", "BOTH"].includes(channel)) return fail("channel must be SMS, WhatsApp, or BOTH", "INVALID_CHANNEL");
      if (args.simulate_failure === true) return fail("Mock payment-link dispatch failed", "PAYMENT_LINK_FAILED");
      return ok({
        channel,
        message_id: `MSG-${Date.now()}`,
        link: `https://pay.kapture-finance.example/mock/${args.account_id}`
      });
    }

    case "escalate_to_agent": {
      const validation = requireFields(args, ["account_id", "reason", "notes"]);
      if (validation) return validation;
      if (!getAccount(args.account_id)) return fail("Account not found", "ACCOUNT_NOT_FOUND");
      const reason = String(args.reason).toUpperCase();
      if (!["DISPUTE", "HARDSHIP", "COMPLEX_REQUEST", "CUSTOMER_REQUEST"].includes(reason)) {
        return fail("Unsupported escalation reason", "INVALID_REASON");
      }
      const escalation = {
        escalation_id: `ESC-${String(escalations.length + 1).padStart(5, "0")}`,
        account_id: args.account_id,
        reason,
        notes: args.notes,
        created_at: nowIso()
      };
      escalations.push(escalation);
      return ok({ escalation_id: escalation.escalation_id, reason });
    }

    case "mark_disposition": {
      const validation = requireFields(args, ["account_id", "status", "notes"]);
      if (validation) return validation;
      if (!getAccount(args.account_id)) return fail("Account not found", "ACCOUNT_NOT_FOUND");
      const status = String(args.status).toUpperCase();
      const allowed = [
        "PTP_AGREED",
        "ALREADY_PAID",
        "DISPUTED",
        "HARDSHIP_ESCALATED",
        "WRONG_PERSON",
        "DO_NOT_CALL",
        "CALLBACK_REQUESTED",
        "NO_RESPONSE",
        "HOSTILE",
        "COMPLETED"
      ];
      if (!allowed.includes(status)) return fail("Unsupported disposition status", "INVALID_STATUS");
      const disposition = { account_id: args.account_id, status, notes: args.notes, timestamp: nowIso() };
      dispositions.push(disposition);
      return ok({ disposition: status, timestamp: disposition.timestamp });
    }

    default:
      return fail(`Unknown tool: ${name || "undefined"}`, "UNKNOWN_TOOL");
  }
}

function toVapiToolResponse(toolCallId, result) {
  return {
    results: [
      {
        toolCallId,
        result
      }
    ]
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "kapture-collections-mock-server", timestamp: nowIso() });
});

app.get("/", (_req, res, next) => {
  if (hasDashboardBuild) return next();

  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kapture Collections Voicebot</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --text: #17202a;
      --muted: #5f6b7a;
      --line: #dde3ea;
      --brand: #075e54;
      --accent: #ffb020;
      --danger: #b42318;
      --ok: #067647;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    header {
      background: #0f2f2b;
      color: white;
      padding: 28px 36px;
      border-bottom: 4px solid var(--accent);
    }
    header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      letter-spacing: 0;
    }
    header p {
      margin: 0;
      color: #d8eeea;
      max-width: 820px;
      line-height: 1.5;
    }
    main {
      max-width: 1180px;
      margin: 0 auto;
      padding: 28px;
      display: grid;
      gap: 18px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 18px;
    }
    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px;
    }
    .span-4 { grid-column: span 4; }
    .span-5 { grid-column: span 5; }
    .span-7 { grid-column: span 7; }
    .span-12 { grid-column: span 12; }
    h2 {
      margin: 0 0 14px;
      font-size: 17px;
      letter-spacing: 0;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--line);
    }
    .metric:last-child { border-bottom: 0; }
    .label { color: var(--muted); }
    .value { font-weight: 700; text-align: right; }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #e9f6f2;
      color: var(--ok);
      font-weight: 700;
      font-size: 13px;
    }
    .state {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .state span {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      background: #fbfcfd;
      font-size: 13px;
      font-weight: 650;
    }
    .guardrail {
      border-left: 4px solid var(--danger);
      background: #fff7f6;
      padding: 12px 14px;
      line-height: 1.5;
      color: #521b16;
    }
    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    button {
      border: 1px solid #0d6b61;
      background: var(--brand);
      color: white;
      border-radius: 6px;
      padding: 10px 12px;
      font-weight: 700;
      cursor: pointer;
    }
    button.secondary {
      background: white;
      color: var(--brand);
    }
    pre {
      margin: 0;
      background: #101828;
      color: #e4e7ec;
      border-radius: 8px;
      padding: 14px;
      overflow: auto;
      min-height: 210px;
      font-size: 13px;
      line-height: 1.5;
    }
    ol {
      margin: 0;
      padding-left: 20px;
      line-height: 1.7;
    }
    a { color: var(--brand); font-weight: 700; }
    @media (max-width: 860px) {
      header { padding: 22px; }
      main { padding: 18px; }
      .span-4, .span-5, .span-7 { grid-column: span 12; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Kapture Collections Voicebot</h1>
    <p>Maya is a Vapi-ready outbound collections voice agent with verification-before-disclosure, mock tool calls, compliance paths, and automated tests.</p>
  </header>
  <main>
    <div class="grid">
      <section class="span-4">
        <h2>Server Status</h2>
        <div class="metric"><span class="label">API</span><span class="pill">Running</span></div>
        <div class="metric"><span class="label">Health</span><span class="value"><a href="/health">/health</a></span></div>
        <div class="metric"><span class="label">Webhook</span><span class="value">POST /webhook</span></div>
        <div class="metric"><span class="label">Mode</span><span class="value">Local mock</span></div>
      </section>

      <section class="span-4">
        <h2>Demo Customer</h2>
        <div class="metric"><span class="label">Name</span><span class="value">Rahul Sharma</span></div>
        <div class="metric"><span class="label">Account</span><span class="value">ACC-88392</span></div>
        <div class="metric"><span class="label">Valid Codes</span><span class="value">1234, 1995</span></div>
        <div class="metric"><span class="label">Agent</span><span class="value">Maya</span></div>
      </section>

      <section class="span-4">
        <h2>Compliance Guardrail</h2>
        <div class="guardrail">
          Debt details are blocked until <strong>verify_customer</strong> returns <strong>verified=true</strong>. Account lookup alone never authenticates the caller.
        </div>
      </section>

      <section class="span-12">
        <h2>State Machine</h2>
        <div class="state">
          <span>INIT</span><span>AUTH_PENDING</span><span>AUTHENTICATED</span><span>NEGOTIATION</span><span>ACTION_EXECUTION</span><span>PTP_COLLECTED</span><span>ESCALATED</span><span>CALL_ENDED</span>
        </div>
      </section>

      <section class="span-5">
        <h2>Demo Flow</h2>
        <ol>
          <li>Maya asks if she is speaking with Rahul Sharma.</li>
          <li>Rahul provides verification code 1234.</li>
          <li>Only after verified=true, Maya discusses Rs. 8,499 overdue by 12 days.</li>
          <li>Rahul promises to pay; Maya records PTP and sends a mock payment link.</li>
          <li>Final disposition is logged.</li>
        </ol>
      </section>

      <section class="span-7">
        <h2>Tool Tester</h2>
        <div class="buttons">
          <button onclick="callTool('verify_customer', { account_id: 'ACC-88392', verification_code: '1234' })">Verify Customer</button>
          <button class="secondary" onclick="callTool('get_account_details', { account_id: 'ACC-88392' })">Account Lookup</button>
          <button class="secondary" onclick="callTool('send_payment_link', { account_id: 'ACC-88392', channel: 'WhatsApp' })">Send Link</button>
          <button class="secondary" onclick="callTool('mark_disposition', { account_id: 'ACC-88392', status: 'DO_NOT_CALL', notes: 'Demo DNC request.' })">DNC Disposition</button>
        </div>
        <pre id="output">Click a tool button to send a Vapi-style POST request to /webhook.</pre>
      </section>
    </div>
  </main>
  <script>
    async function callTool(name, args) {
      const output = document.getElementById("output");
      output.textContent = "Calling " + name + "...";
      const response = await fetch("/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            toolCalls: [{
              id: "ui-" + Date.now(),
              function: {
                name,
                arguments: JSON.stringify(args)
              }
            }]
          }
        })
      });
      const json = await response.json();
      output.textContent = JSON.stringify(json, null, 2);
    }
  </script>
</body>
</html>`);
});

app.post("/webhook", (req, res) => {
  try {
    const toolCall = normalizeToolCall(req.body);
    if (!toolCall || !toolCall.name) {
      return res.status(400).json(fail("Missing Vapi tool call payload", "MISSING_TOOL_CALL"));
    }

    console.log(`[TOOL CALL] ${toolCall.name}`, JSON.stringify(toolCall.arguments));
    const result = handleToolCall(toolCall.name, toolCall.arguments);
    console.log(`[TOOL RESULT] ${toolCall.name}`, JSON.stringify(result));

    const httpStatus = result.success === false && result.error?.code === "UNKNOWN_TOOL" ? 404 : 200;
    return res.status(httpStatus).json(toVapiToolResponse(toolCall.id, result));
  } catch (error) {
    console.error("[WEBHOOK ERROR]", error);
    return res.status(500).json(fail("Internal server error", "INTERNAL_ERROR"));
  }
});

if (hasDashboardBuild) {
  app.use(express.static(dashboardBuildPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dashboardBuildPath, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json(fail("Malformed JSON request body", "MALFORMED_JSON"));
  }
  console.error("[SERVER ERROR]", err);
  return res.status(500).json(fail("Internal server error", "INTERNAL_ERROR"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Kapture mock webhook server listening on http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  handleToolCall,
  normalizeToolCall,
  stores: {
    mockAccounts,
    promiseToPayRecords,
    escalations,
    dispositions
  }
};
