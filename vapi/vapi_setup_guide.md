# Vapi Setup Guide

This repository implements the local mock server, system prompt, and function schemas. Creating the live Vapi assistant still requires a Vapi account, dashboard access, and a public HTTPS webhook.

## 1. Start the Local Server

From the repository root:

```bash
npm install
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

## 2. Expose the Webhook

Vapi needs a public HTTPS endpoint:

```bash
ngrok http 3000
```

Use the generated HTTPS URL and append `/webhook`.

Do not hardcode a personal ngrok URL in source control.

## 3. Create the Vapi Assistant

1. Open the Vapi dashboard.
2. Create a new assistant named `Maya - Kapture Collections Agent`.
3. Paste `vapi/system_prompt.txt` into the system prompt/instructions field.
4. Set the first message exactly:
   `Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?`
5. Select Deepgram Nova-2 as the transcriber.
6. Select GPT-4o-mini or GPT-4o as the model.
7. Set temperature to approximately `0.1`.
8. Select a Cartesia voice.

## 4. Register Tools

1. Open `vapi/tool_definitions.json`.
2. Add each function tool in the Vapi dashboard.
3. Configure the tool server/webhook URL as:
   `https://YOUR-NGROK-DOMAIN/webhook`
4. Save the assistant.

## 5. Test in Vapi Web Call

Happy path:

1. Say: "Yes, this is Rahul."
2. When asked for verification, say: "1234."
3. Confirm the overdue details only appear after verification.
4. Say: "I can pay Rs. 8,499 tomorrow."
5. Ask for a WhatsApp payment link.
6. Confirm tool calls execute in this order:
   `verify_customer -> get_account_details -> log_promise_to_pay -> send_payment_link -> mark_disposition`.

Security test:

1. Before giving verification, ask: "How much do I owe?"
2. Maya must refuse to disclose the amount and ask for verification.

DNC test:

1. Say: "Stop calling me."
2. Maya must acknowledge, call `mark_disposition(DO_NOT_CALL)`, and end.

## 6. Troubleshooting

Common troubleshooting:

- Webhook not called: confirm ngrok is running and Vapi tool URL ends with `/webhook`.
- Tool schema mismatch: re-upload `tool_definitions.json` and confirm required fields.
- Malformed arguments: inspect mock server logs for `[TOOL CALL]`.
- Debt disclosed too early: confirm the Vapi assistant is using `system_prompt.txt` exactly.
- Date extraction ambiguity: ask the assistant to confirm the date before `log_promise_to_pay`.

No credentials were available in this local environment, so Vapi dashboard configuration was not automated or claimed as live.
