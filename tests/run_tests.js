const assert = require("assert");
const { handleToolCall, normalizeToolCall } = require("../mock-server/server");

const accountId = "ACC-88392";

function assertSuccess(result, message) {
  assert.strictEqual(result.success, true, message || JSON.stringify(result));
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

run("valid verification succeeds", () => {
  const result = handleToolCall("verify_customer", { account_id: accountId, verification_code: "1234" });
  assertSuccess(result);
  assert.strictEqual(result.verified, true);
  assert.strictEqual(result.customer_name, "Rahul Sharma");
});

run("invalid verification does not authenticate", () => {
  const result = handleToolCall("verify_customer", { account_id: accountId, verification_code: "0000" });
  assertSuccess(result);
  assert.strictEqual(result.verified, false);
});

run("account retrieval is not authentication", () => {
  const result = handleToolCall("get_account_details", { account_id: accountId });
  assertSuccess(result);
  assert.strictEqual(result.verification_required_for_disclosure, true);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(result, "verified"), false);
});

run("promise-to-pay logging returns deterministic record", () => {
  const result = handleToolCall("log_promise_to_pay", {
    account_id: accountId,
    ptp_date: "2026-08-13",
    amount: 8499
  });
  assertSuccess(result);
  assert.match(result.ptp_id, /^PTP-/);
  assert.strictEqual(result.amount, 8499);
});

run("payment link dispatch succeeds for WhatsApp", () => {
  const result = handleToolCall("send_payment_link", { account_id: accountId, channel: "WhatsApp" });
  assertSuccess(result);
  assert.strictEqual(result.channel, "WHATSAPP");
  assert.match(result.link, /^https:\/\/pay\.kapture-finance\.example\/mock\//);
});

run("payment link failure returns structured error", () => {
  const result = handleToolCall("send_payment_link", {
    account_id: accountId,
    channel: "SMS",
    simulate_failure: true
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.code, "PAYMENT_LINK_FAILED");
});

run("disposition logging supports DNC", () => {
  const result = handleToolCall("mark_disposition", {
    account_id: accountId,
    status: "DO_NOT_CALL",
    notes: "Customer requested no further calls."
  });
  assertSuccess(result);
  assert.strictEqual(result.disposition, "DO_NOT_CALL");
});

run("escalation supports dispute", () => {
  const result = handleToolCall("escalate_to_agent", {
    account_id: accountId,
    reason: "DISPUTE",
    notes: "Customer disputes amount."
  });
  assertSuccess(result);
  assert.match(result.escalation_id, /^ESC-/);
});

run("unknown tool returns structured error", () => {
  const result = handleToolCall("unknown_tool", {});
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.code, "UNKNOWN_TOOL");
});

run("missing parameters return structured error", () => {
  const result = handleToolCall("verify_customer", { account_id: accountId });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.code, "MISSING_PARAMETERS");
});

run("Vapi-style payload normalization works", () => {
  const payload = {
    message: {
      toolCalls: [
        {
          id: "call-1",
          function: {
            name: "verify_customer",
            arguments: JSON.stringify({ account_id: accountId, verification_code: "1995" })
          }
        }
      ]
    }
  };
  const normalized = normalizeToolCall(payload);
  assert.strictEqual(normalized.id, "call-1");
  assert.strictEqual(normalized.name, "verify_customer");
  assert.strictEqual(normalized.arguments.verification_code, "1995");
});

if (!process.exitCode) {
  console.log("\nAll mock-server tests passed.");
}
