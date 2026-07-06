---
name: dogpay-onboarding
description: Use when guiding a user through DogPay account registration, choosing business vs individual signup, preparing API credentials, configuring webhooks, selecting a payment flow, or planning a first DogPay integration from signup to production launch.
---

# DogPay Onboarding Guide

Use this skill when the user wants a guided DogPay registration or setup flow.

## Entry Points

- Signup URL: https://mp.dogpay.com/sign-up
- Docs home: https://docs.dogpay.com/
- AI index: https://docs.dogpay.com/llms.txt
- Sandbox base URL: `https://sandbox-api-v2.dogpay.com`
- Production base URL: verify in current DogPay docs before launch.

## Safety And Privacy

- Do not ask the user to paste API secrets, access tokens, identity documents, business registration documents, bank details, private keys, or seed phrases into the chat.
- Tell the user to keep `DOGPAY_API_SECRET` and access tokens in backend-only secret storage.
- If the user needs help filling registration forms, guide them field by field, but let them enter sensitive data directly on the DogPay site.
- For production launch, remind the user to re-check current DogPay docs, account approval status, webhook configuration, and compliance requirements.

## Guided Wizard

Start by asking only the minimum questions needed to choose the path:

1. Are you registering as a business or an individual?
2. Which first flow do you want: hosted checkout, webhook-only reconciliation, payouts/withdrawals, wallet, card issuing, or virtual accounts?
3. Which stack should the integration target: Node/TypeScript, Python, PHP, Java, Go, or another backend?

After the user answers, guide them through the matching checklist.

## Registration Path

### Business Account

Use this when the user selects enterprise, business, company, merchant, KYB, or team.

Checklist:

1. Open https://mp.dogpay.com/sign-up.
2. Choose the business or enterprise registration path if the page offers account-type selection.
3. Prepare business verification details outside the chat:
   - Legal business name
   - Business registration country or region
   - Registration number or certificate details
   - Business website or product URL
   - Authorized representative and beneficial owner details, if requested
   - Primary contact email and phone
   - Intended DogPay use case and expected payment volume, if requested
4. Complete DogPay account verification in the portal.
5. After approval or sandbox access, create or locate merchant API credentials:
   - API Key / appid
   - API Secret
6. Configure the webhook URL in the DogPay merchant portal.
7. Store credentials as backend environment variables:

```env
DOGPAY_BASE_URL=https://sandbox-api-v2.dogpay.com
DOGPAY_APP_ID=your_api_key
DOGPAY_API_SECRET=your_api_secret
DOGPAY_WEBHOOK_API_KEY=your_api_key
```

### Individual Account

Use this when the user selects personal, individual, solo developer, or personal merchant.

Checklist:

1. Open https://mp.dogpay.com/sign-up.
2. Choose the individual or personal registration path if the page offers account-type selection.
3. Prepare personal verification details outside the chat:
   - Legal name
   - Country or region
   - Email and phone
   - Identity verification details, if requested by the portal
   - Intended use case for DogPay
4. Complete verification in the DogPay portal.
5. After approval or sandbox access, create or locate API credentials:
   - API Key / appid
   - API Secret
6. Configure the webhook URL if the selected DogPay product sends payment events.
7. Store credentials as backend environment variables, never in frontend code.

## Integration Flow

Once the account path is clear, move through these phases.

### Phase 1: Environment

- Start with sandbox unless the user explicitly needs production.
- Use `DOGPAY_BASE_URL=https://sandbox-api-v2.dogpay.com`.
- Confirm where backend secrets live: `.env.local`, deployment secret manager, CI/CD secret store, or cloud runtime config.

### Phase 2: Authentication

- Implement OAuth 2.0 client credentials:
  - `POST /open-api/v1/auth/access_token`
  - Body: `grant_type=client_credential`, `appid`, `secret`
- Cache tokens server-side.
- Refresh tokens 5-10 minutes before expiry.
- On one `401`, fetch a fresh token and retry once.

### Phase 3: Product Flow

For hosted checkout:

1. Fetch currency configuration:
   - `GET /open-api/v1/pay/currency-config`
2. Save the returned `id` as `currencyConfigId`.
3. Create a payment order:
   - `POST /open-api/v1/pay`
   - Required: `orderAmount`, `goodsName`, `callId`, `currencyConfigId`
   - Prefer `payChannel: "pay_002"`
4. Redirect the user to `data.payInfo.payUrl`.
5. Fulfill only from webhook confirmation, not from redirect success.

For other flows:

- Ask which DogPay product the user is activating.
- Read the current DogPay docs before implementing production code.
- Keep credentials and payout/card/wallet operations server-side.

### Phase 4: Webhook

- Create a backend endpoint such as `/api/webhooks/dogpay`.
- Preserve the exact raw request body.
- Verify the `wh-signature` header using HMAC-SHA512 with the DogPay API Key as the key.
- Return HTTP `200` or `201` within 30 seconds.
- Process `pay.transaction.update` only when `data.status` is `completed`.
- Store processed event IDs for idempotency.

### Phase 5: Sandbox Test

Ask the user to confirm:

- Can the backend fetch an access token?
- Can it create a payment order?
- Does the response include `data.payInfo.payUrl`?
- Does the webhook endpoint receive DogPay events?
- Does duplicate webhook delivery avoid double fulfillment?

### Phase 6: Production Readiness

Before production:

- Re-check the latest DogPay docs.
- Switch `DOGPAY_BASE_URL` only after confirming the current production base URL.
- Store production credentials in the production secret manager.
- Configure the production webhook URL in the DogPay portal.
- Add monitoring for auth failures, order creation failures, webhook verification failures, and fulfillment errors.
- Keep logs free of API secrets, access tokens, identity data, and full webhook payloads when they contain sensitive information.

## Response Style

When guiding the user:

- Be conversational and step-by-step.
- Ask one short question at a time when the next step depends on their answer.
- Give copy-paste-safe code only after the account type, target flow, and backend stack are known.
- If the user says they are stuck on the DogPay portal, ask which page or field label they see and explain what that field usually means without requesting sensitive values.
- If the user asks for a launch checklist, produce a concise checklist grouped by account, credentials, backend, webhook, sandbox, and production.
