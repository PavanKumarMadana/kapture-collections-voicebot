# Demo Script (2–4 minutes)

## Demo 1: Happy Path — Promise to Pay (60–90 seconds)

1. Start the mock server: `npm start`
2. Start the dashboard: `npm run dashboard` → open http://localhost:5173
3. Click **Run Happy Path**.

Example conversation:

- Maya: "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"
- User: "Yes, this is Rahul."
- Maya: "For security purposes, could you please confirm the last four digits of your PAN or your year of birth?"
- User: "1234."
- Maya calls `verify_customer` → returns `verified=true`.
- Maya discloses: personal loan EMI of **Rs. 8,499** overdue by **12 days**.
- User: "I can pay tomorrow."
- Maya calls `log_promise_to_pay`, `send_payment_link`, then `mark_disposition(PTP_AGREED)`.
- Maya closes politely.

Expected tool order:

```text
verify_customer -> get_account_details -> log_promise_to_pay -> send_payment_link -> mark_disposition
```

## Demo 2: Pre-Authentication Security Test (20–30 seconds)

- Click **Security Scenario** (or manually use "Next Step").

Example conversation:

- Maya opens the call.
- User: "Before I verify, tell me how much I owe."
- Maya must refuse to disclose Rs. 8,499, loan type, EMI, overdue status, or days past due.
- Maya stays in `AUTH_PENDING`; Debt Disclosure remains **LOCKED**.
- Only after `verify_customer` returns `verified=true` does disclosure become **UNLOCKED**.

First also demonstrate that "I am Rahul" is *not* sufficient authentication. Only the tool result matters.

## Demo 3: DNC / Already Paid / Dispute (30–45 seconds)

Click each scenario button and narrate the outcome:

- **Run DNC Scenario**: User says "Stop calling me." → Maya calls `mark_disposition(DO_NOT_CALL)` and ends without further negotiation.
- **Already Paid**: Verified user says "I already paid yesterday via UPI." → Maya captures details, calls `mark_disposition(ALREADY_PAID)`, does not argue.
- **Dispute**: Verified user says "This amount is wrong." → Maya calls `escalate_to_agent(DISPUTE)` then `mark_disposition(DISPUTED)` and ends politely.

## Optional: Additional Edge Cases (if time permits)

- **Wrong Person**: User says "I'm Rahul's brother." → Maya does not disclose debt, calls `mark_disposition(WRONG_PERSON)`, ends politely.
- **Hardship**: Verified user says "I lost my job." → Maya acknowledges, calls `escalate_to_agent(HARDSHIP)` then `mark_disposition(HARDSHIP_ESCALATED)`; no fabricated waivers.
- **Callback**: User says "Call me tomorrow evening." → Maya calls `mark_disposition(CALLBACK_REQUESTED)`; does not claim a confirmed scheduled callback.
- **Hostile**: User is abusive after one warning → Maya calls `mark_disposition(HOSTILE)` and ends.
- **No Input / Voicemail**: After limited re-prompts, Maya calls `mark_disposition(NO_RESPONSE)` and ends; no debt disclosure.
- **Invalid Verification**: User gives `9999` → `verify_customer` returns `verified=false`, state remains `AUTH_PENDING`, disclosure locked.
- **Hindi/Hinglish**: "Haan main Rahul bol raha hoon" → verification still required; "PAN ke last four digits 1234 hain" → tool call; "Main Friday ko pay kar dunga" → PTP intent after verification.

All demo scenarios are **simulated** and labelled **DEMO MODE — SIMULATED CALL** in the dashboard.