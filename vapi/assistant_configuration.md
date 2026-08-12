# Vapi Assistant Configuration

## Recommended Assistant

Assistant name: Maya - Kapture Collections Agent

First message:

> Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?

Do not include overdue amount, loan type, EMI, or payment language in the first message.

## Model

Recommended: GPT-4o-mini for the take-home demo.

Reasoning: it is cost-effective and low-latency while still strong enough for state tracking, tool calls, and English/Hindi/Hinglish handling. GPT-4o can be used if maximum reasoning quality is preferred over cost.

Temperature: 0.1

Reasoning: collections conversations are compliance-sensitive. Lower temperature reduces creative phrasing, tool-order mistakes, and hallucinated offers.

## Transcriber

Recommended: Deepgram Nova-2

Reasoning: good low-latency telephony transcription and practical support for mixed English/Hindi/Hinglish utterances. In production, benchmark against real call audio.

## Voice

Recommended: Cartesia

Reasoning: responsive streaming voice and natural conversational pacing. ElevenLabs is also acceptable if voice quality is prioritized and measured latency remains acceptable.

## Tools

Register all function tools from `vapi/tool_definitions.json`:

- get_account_details
- verify_customer
- log_promise_to_pay
- send_payment_link
- escalate_to_agent
- mark_disposition

Webhook URL for local testing through ngrok:

```text
https://YOUR-NGROK-DOMAIN.ngrok-free.app/webhook
```

## Key Guardrail

`verify_customer` returning `verified=true` is the only authentication signal. `get_account_details` can retrieve sensitive data for backend use, but it must never unlock disclosure.
