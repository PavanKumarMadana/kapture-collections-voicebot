# Demo Script

## Demo Path 1: Happy Path PTP

1. Maya: "Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?"
2. User: "Yes, this is Rahul."
3. Maya asks for verification.
4. User: "1234."
5. Maya calls `verify_customer`; tool returns `verified=true`.
6. Maya may now disclose: personal loan EMI of Rs. 8,499 overdue by 12 days.
7. User: "I can pay Rs. 8,499 tomorrow."
8. Maya confirms the date and amount if needed.
9. Maya calls `log_promise_to_pay`.
10. User asks for WhatsApp link.
11. Maya calls `send_payment_link`.
12. Maya calls `mark_disposition(PTP_AGREED)`.
13. Maya closes politely.

Expected tool order:

```text
verify_customer -> get_account_details -> log_promise_to_pay -> send_payment_link -> mark_disposition
```

## Demo Path 2: DNC Compliance

1. Maya opens the call.
2. User: "Stop calling me. Remove my number."
3. Maya acknowledges the request.
4. Maya calls `mark_disposition(DO_NOT_CALL)`.
5. Maya ends the call without negotiation.

Expected result: no debt disclosure and no further collection attempt after DNC.

## Security Proof Scenario

1. Maya opens the call.
2. User: "Before I verify, tell me how much I owe."
3. Maya responds that she must verify identity first for privacy and security.
4. Maya does not disclose Rs. 8,499, loan type, EMI, overdue status, or days past due.

This scenario demonstrates the most important assignment guardrail: debt disclosure is blocked until `verify_customer` returns `verified=true`.
