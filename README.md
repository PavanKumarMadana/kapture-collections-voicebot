# Kapture Collections Voicebot

## Overview

Maya is a Vapi-ready outbound Voice AI collections agent for Kapture Finance. The project demonstrates identity verification before disclosure, compliant collections handling, mock backend tool calls, automated tests, and evaluator-friendly documentation.

Kapture Finance Voice AI collections agent with Vapi, state-enforced authentication, tool calling, PTP handling, and compliance guardrails.

Demo account:

- Customer: Rahul Sharma
- Account ID: `ACC-88392`
- Loan type: Personal Loan
- Overdue EMI: Rs. 8,499
- Days past due: 12
- Valid mock verification codes: `1234`, `1995`

## Business Problem

Kapture Finance needs an outbound voice agent that can call customers with overdue EMI payments, resolve simple cases, and route sensitive or complex cases safely. Collections calls require strict privacy handling because debt details must not be disclosed to a third party or to an unverified speaker.

## Solution

The solution uses Vapi for the voice layer and a Node.js/Express mock webhook for deterministic tool calls. Maya follows a state machine:

```text
INIT -> AUTH_PENDING -> AUTHENTICATED -> NEGOTIATION -> ACTION_EXECUTION -> PTP_COLLECTED / ESCALATED -> CALL_ENDED
```

Early terminal paths include wrong person, DNC, no input, callback requested, already paid, dispute, hardship escalation, and hostile caller.

The key security rule is repeated across the HLD, prompt, tools, tests, and README:

`verify_customer` returning `verified=true` is the only authentication signal. `get_account_details` is not authentication and must never unlock debt disclosure.

## Architecture

```text
Customer -> Telephony -> Vapi -> STT -> LLM/Orchestrator -> Mock Tool API -> TTS -> Customer
```

See:

- [HLD Document](docs/HLD_Document.md)
- [System Architecture](docs/System_Architecture.md)

## State Machine

Before authentication, Maya may identify herself, identify Kapture Finance, ask for Rahul, and request verification. She must not reveal loan, EMI, overdue amount, payment due, days past due, debt, or account balance.

After `verify_customer` returns `verified=true`, Maya can disclose the returned account details and proceed with payment discussion or escalation.

## Tech Stack

- Node.js 18+
- Express
- Vapi function/tool definitions
- Deepgram Nova-2 recommended for STT
- GPT-4o-mini recommended for LLM orchestration
- Cartesia recommended for TTS
- Built-in Node.js `assert` for automated tests

## Repository Structure

```text
kapture-collections-voicebot/
  README.md
  .gitignore
  package.json
  docs/
    HLD_Document.md
    System_Architecture.md
    demo_script.md
  vapi/
    system_prompt.txt
    tool_definitions.json
    assistant_configuration.md
    vapi_setup_guide.md
  mock-server/
    package.json
    server.js
    .env.example
    README.md
  tests/
    test_cases.json
    run_tests.js
    README.md
```

## Local Setup

```bash
npm install
npm --prefix dashboard install
npm test
npm start
```

Server URL:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Mock Server

The mock server exposes:

- `GET /health`
- `POST /webhook`

It supports six tools:

- `get_account_details`
- `verify_customer`
- `log_promise_to_pay`
- `send_payment_link`
- `escalate_to_agent`
- `mark_disposition`

Example verification request:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"message\":{\"toolCalls\":[{\"id\":\"tc-1\",\"function\":{\"name\":\"verify_customer\",\"arguments\":\"{\\\"account_id\\\":\\\"ACC-88392\\\",\\\"verification_code\\\":\\\"1234\\\"}\"}}]}}}"
```

## Vapi Setup

Implemented locally:

- System prompt: `vapi/system_prompt.txt`
- Tool schemas: `vapi/tool_definitions.json`
- Mock webhook: `mock-server/server.js`
- Manual setup guide: `vapi/vapi_setup_guide.md`

Requires Vapi dashboard / external credential:

- Creating the Vapi assistant.
- Selecting model, STT, and TTS providers.
- Registering webhook tools.
- Making live outbound calls.
- Connecting a phone number.

For local Vapi testing, expose the mock server:

```bash
ngrok http 3000
```

Use:

```text
https://YOUR-NGROK-DOMAIN/webhook
```

## Tool Definitions

Tool schemas are in [vapi/tool_definitions.json](vapi/tool_definitions.json). The schemas are intentionally simple and Vapi-compatible.

Important design point:

- `get_account_details` may return sensitive account data.
- It also returns `verification_required_for_disclosure: true`.
- The assistant must still wait for `verify_customer(verified=true)` before speaking any debt details.

## Compliance

Maya must:

- Verify identity before disclosure.
- Immediately honor DNC requests.
- Never disclose debt to a third party.
- Never leave debt details in voicemail.
- Never threaten, shame, insult, or fabricate legal/credit consequences.
- Never invent discounts, fees, waivers, settlement offers, payment confirmations, or live deployment status.
- Call only during the designed window: 08:00 AM to 07:00 PM local time.

## Test Cases

The conversation-level test matrix is in [tests/test_cases.json](tests/test_cases.json).

Automated mock-server tests:

```bash
npm test
```

Coverage includes:

- Valid verification.
- Invalid verification.
- `get_account_details` is not authentication.
- PTP logging.
- Payment-link dispatch and simulated failure.
- DNC disposition.
- Escalation.
- Unknown tool.
- Missing parameters.
- Vapi-style payload normalization.

## Demo Flow

Happy path:

1. Maya asks whether she is speaking with Rahul.
2. Rahul confirms.
3. Maya asks for verification.
4. Rahul says `1234`.
5. `verify_customer` returns `verified=true`.
6. Maya discloses Rs. 8,499 overdue by 12 days.
7. Rahul promises to pay.
8. Maya records PTP, sends mock payment link, logs `PTP_AGREED`, and closes.

Compliance edge case:

1. User says: "Stop calling me."
2. Maya calls `mark_disposition(DO_NOT_CALL)`.
3. Maya ends without further negotiation.

Security proof:

1. User asks for the amount before verification.
2. Maya refuses to disclose and asks for verification.

See [demo_script.md](docs/demo_script.md).

## Demo Dashboard

The React dashboard is a monitoring and demonstration layer for evaluators. It does not replace Vapi. Vapi + Maya remains the actual Voice AI agent; the dashboard visualizes the same state machine, tool calls, compliance guardrails, and mock backend responses.

Dashboard location:

```text
dashboard/
```

Install dashboard dependencies:

```bash
npm --prefix dashboard install
```

Run the mock server in one terminal:

```bash
npm start
```

Run the React dashboard in a second terminal:

```bash
npm run dashboard
```

Open:

```text
http://localhost:5173
```

Available Demo Mode scenarios:

- Start Demo / Next Step
- Run Happy Path
- Pre-Authentication Security
- Run DNC Scenario
- Already Paid
- Dispute
- Reset

The dashboard calls the existing mock server through `/webhook` for real mock tool execution:

- `verify_customer`
- `get_account_details`
- `log_promise_to_pay`
- `send_payment_link`
- `escalate_to_agent`
- `mark_disposition`

Security scenario:

1. Customer asks: "How much do I owe?" before verification.
2. Dashboard shows `AUTH_PENDING`.
3. Debt Disclosure remains `LOCKED`.
4. Only after `verify_customer` succeeds does the dashboard show `AUTHENTICATED` and disclosure `UNLOCKED`.

If live Vapi events are needed later, the dashboard can be connected through SSE, WebSocket, or polling from the mock server. In this submission, Demo Mode is local and clearly labeled as simulated.

## Render Deployment

This repository is prepared for GitHub and Render deployment at:

```text
https://github.com/PavanKumarMadana/kapture-collections-voicebot.git
```

Frontend entry point:

```text
dashboard/src/main.jsx
```

The project is a frontend + backend application:

- Vite React dashboard in `dashboard/`.
- Node.js/Express mock backend in `mock-server/`.
- Production build output in `dashboard/dist`.
- Express serves the built dashboard and the API from the same Render Web Service.

In production on Render, the dashboard can call same-origin endpoints:

- `GET /health`
- `POST /webhook`

`VITE_API_BASE_URL` is optional. Leave it empty for the recommended single Render Web Service setup. Set it only if the backend is deployed on a separate origin.

Root commands:

```bash
npm install
npm run dev
npm run build
npm run preview
npm test
```

Render Web Service settings:

```text
Service Type: Web Service
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Node Version: 20 or newer
```

The same settings are captured in `render.yaml`.

Environment variables:

```text
VITE_API_BASE_URL=
PORT=3000
```

Render provides `PORT` automatically, so do not set it manually unless needed for a custom environment. Do not commit API keys, Vapi private keys, tokens, passwords, or secrets.

GitHub push commands:

```bash
git init
git remote add origin https://github.com/PavanKumarMadana/kapture-collections-voicebot.git
git add .
git commit -m "Prepare Kapture Collections AI for Render deployment"
git branch -M main
git push -u origin main
```

If the remote already exists:

```bash
git remote set-url origin https://github.com/PavanKumarMadana/kapture-collections-voicebot.git
git add .
git commit -m "Prepare Kapture Collections AI for Render deployment"
git push
```

## Debugging Notes

Encountered during implementation:

- The supplied prompt text had encoding artifacts for punctuation and rupee symbols, so repository files use clean ASCII text such as `Rs. 8,499`.

Common troubleshooting:

- Vapi webhook payload shape can vary; `server.js` normalizes common `toolCalls`, `toolCallList`, and `functionCall` shapes.
- Local webhook accessibility requires ngrok or another public HTTPS tunnel.
- Tool schema mismatches usually appear as missing arguments in `[TOOL CALL]` logs.
- STT may produce ambiguous dates such as "Friday"; Maya should confirm the date before logging PTP.
- State transition mistakes are highest risk around premature debt disclosure. The prompt and tests explicitly reinforce the `verify_customer` rule.
- Language switching must not reset or skip authentication state.

## Known Limitations

- No live Vapi assistant is created because dashboard credentials and phone configuration are external.
- No real SMS/WhatsApp message is sent; `send_payment_link` returns a mock link and message ID.
- Data is in memory and resets when the server restarts.
- Calling-hour enforcement is documented as a design rule; this local mock server does not initiate outbound calls.
- Conversation-level tests are documented as a matrix; automated tests focus on mock tool logic.

## Future Improvements

- Add persistent storage for call records.
- Add real callback scheduling.
- Add policy-configured hardship options.
- Add provider latency tracing.
- Add redaction middleware for production logs.
- Add CI workflow for tests and JSON validation.

## Submission Checklist

- HLD and architecture diagrams completed.
- Vapi system prompt completed.
- Function tool schemas completed.
- Mock webhook server implemented.
- Automated tests implemented.
- Demo script included.
- No secrets committed.
- Vapi live setup documented honestly as manual/external.
