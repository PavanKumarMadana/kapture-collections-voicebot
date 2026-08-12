const accountId = "ACC-88392";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function callTool(name, args) {
  const response = await fetch(apiUrl("/webhook"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: {
        toolCalls: [
          {
            id: `dashboard-${Date.now()}`,
            function: {
              name,
              arguments: JSON.stringify(args)
            }
          }
        ]
      }
    })
  });

  const body = await response.json();
  const result = body.results?.[0]?.result || body;
  if (!response.ok || result.success === false) {
    const message = result.error?.message || `Unable to execute ${name}.`;
    throw new Error(message);
  }
  return result;
}

export function verifyCustomer(verificationCode = "1234") {
  return callTool("verify_customer", {
    account_id: accountId,
    verification_code: verificationCode
  });
}

export function getAccountDetails() {
  return callTool("get_account_details", {
    account_id: accountId
  });
}

export function logPromiseToPay(ptpDate, amount = 8499) {
  return callTool("log_promise_to_pay", {
    account_id: accountId,
    ptp_date: ptpDate,
    amount
  });
}

export function sendPaymentLink(channel = "SMS") {
  return callTool("send_payment_link", {
    account_id: accountId,
    channel
  });
}

export function escalateToAgent(reason, notes) {
  return callTool("escalate_to_agent", {
    account_id: accountId,
    reason,
    notes
  });
}

export function markDisposition(status, notes) {
  return callTool("mark_disposition", {
    account_id: accountId,
    status,
    notes
  });
}

export async function checkHealth() {
  const response = await fetch(apiUrl("/health"));
  if (!response.ok) throw new Error("Mock server health check failed.");
  return response.json();
}
