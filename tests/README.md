# Tests

Run the automated mock-server tests from the repository root:

```bash
npm test
```

The runner calls the same tool handler used by the Express webhook. It verifies valid and invalid authentication, the security rule that `get_account_details` is not authentication, PTP logging, payment-link dispatch and failure, DNC disposition, escalation, unknown tools, missing parameters, and Vapi-style payload normalization.

`test_cases.json` is the broader evaluator test matrix for conversation-level scenarios that should be exercised in Vapi or during a manual demo.
