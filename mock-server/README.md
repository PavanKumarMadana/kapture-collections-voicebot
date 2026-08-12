# Mock Server

Express webhook server for Vapi function/tool calls.

## Run

From the repository root:

```bash
npm install
npm start
```

Or from this folder:

```bash
npm install
npm start
```

The server listens on `http://localhost:3000` by default.

## Endpoints

- `GET /health`
- `POST /webhook`

## Example Webhook Request

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d "{\"message\":{\"toolCalls\":[{\"id\":\"tc-1\",\"function\":{\"name\":\"verify_customer\",\"arguments\":\"{\\\"account_id\\\":\\\"ACC-88392\\\",\\\"verification_code\\\":\\\"1234\\\"}\"}}]}}}"
```

## Mock Account

- Account ID: `ACC-88392`
- Customer: Rahul Sharma
- Valid verification codes: `1234`, `1995`

`get_account_details` returns sensitive account data but explicitly marks `verification_required_for_disclosure: true`. It is not an authentication mechanism.
