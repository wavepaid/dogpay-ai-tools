---
name: dogpay-api
description: Use when integrating DogPay APIs, including access-token authentication, hosted payment checkout, payment webhooks, crypto wallets, withdrawals, cards, virtual accounts, payouts, or when a user asks to add DogPay to an application.
---

# DogPay API

Use this skill when the user asks to integrate, debug, or explain DogPay.

## Official Sources

- Docs home: https://docs.dogpay.com/
- AI index: https://docs.dogpay.com/llms.txt
- Quick start: https://docs.dogpay.com/docs/quick-start.md
- Authentication: https://docs.dogpay.com/docs/authentication-overview.md
- Payment guide: https://docs.dogpay.com/docs/create-payment.md
- Webhook guide: https://docs.dogpay.com/docs/webhook-integration.md

Before production launch, re-check the current docs. DogPay is a financial API and hosts, schemas, event names, and limits can change.

## Environments

- Sandbox base URL: `https://sandbox-api-v2.dogpay.com`
- Production base URL: the current English quick-start docs show `https://api.dogpay.com`; verify this in DogPay docs before live release.
- All protected API calls must use HTTPS and `Authorization: Bearer <access_token>`.
- Keep API keys and secrets on the backend only. Never expose `secret` or access tokens to browser/mobile code.

## Authentication

DogPay uses OAuth 2.0 client credentials.

- Endpoint: `POST /open-api/v1/auth/access_token`
- Body:
  - `grant_type`: `client_credential`
  - `appid`: merchant API key
  - `secret`: merchant API secret
- Response data:
  - `access_token`
  - `expires_in`, currently up to `7200` seconds
  - `token_type`, normally `bearer`

Implementation rules:

- Cache the token server-side.
- Refresh proactively 5-10 minutes before expiry.
- On `401`, fetch a new token once and retry the protected request.
- Do not request a new token for every API call.

## Hosted Payment Checkout

Use this flow for Web3 acquiring/payment gateway integrations.

1. Fetch currency/chain config:
   - `GET /open-api/v1/pay/currency-config`
   - Optional query params: `currency`, `chain`
   - Common chains include `Ethereum`, `Tron`, `Solana`, `Base`, `Arbitrum`, `BinanceSmartChain`, `Bitcoin`, `Polygon`, `Dogecoin`.
   - Save the returned `id` as `currencyConfigId`.

2. Create the pay order:
   - `POST /open-api/v1/pay`
   - Required body fields:
     - `orderAmount`: string amount; minimum is `0.02`
     - `goodsName`
     - `callId`: idempotency key from the merchant system
     - `currencyConfigId`
   - Strongly prefer `payChannel: "pay_002"`.
   - Optional fields include `lang`, `description`, `allowedCurrencyConfigIds`, `orderExpireTime`, `successUrl`, and `failureUrl`.

3. Send the customer to checkout:
   - Read `data.payInfo.payUrl`.
   - Redirect, open, embed, or QR-code the hosted checkout URL.
   - Do not treat redirect success alone as fulfillment.

4. Fulfill from webhook:
   - Listen for `pay.transaction.update`.
   - Fulfill only after payload `data.status` is `completed`.
   - Use `event_id`, order `id`, `idNo`, or your `callId` for idempotency.

## Query Orders

- Endpoint: `GET /open-api/v1/pay`
- Optional query params: `page`, `take`, `cursorId`, `orderByCreatedAt`, `currency`, `callId`, `id`.
- Use this for reconciliation, manual recovery, and webhook backfill. Prefer webhooks for real-time fulfillment.

## Webhooks

DogPay pushes JSON events to one configured HTTPS webhook URL per merchant/application.

Verification:

- Header: `wh-signature`
- Algorithm: `HMAC-SHA512`
- Key: merchant API key (`appid` / API Key), not the API secret
- Message: exact raw JSON request body bytes/string
- Encoding: lowercase hex digest
- Compare with a timing-safe equality function.

Operational rules:

- Return HTTP `200` or `201` within 30 seconds.
- DogPay retries failed webhooks after roughly `10s`, `30s`, `60s`, `120s`, `300s`, and `600s`.
- Store processed event IDs to avoid duplicate fulfillment.
- Process `pay.transaction.update` with `status: "completed"` as the authoritative payment success trigger.

## TypeScript Patterns

Token cache:

```ts
type DogPayToken = { access_token: string; expires_in: number; token_type: string };

let cachedToken: { value: string; expiresAtMs: number } | undefined;

export async function getDogPayToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - now > 10 * 60 * 1000) {
    return cachedToken.value;
  }

  const response = await fetch(`${process.env.DOGPAY_BASE_URL}/open-api/v1/auth/access_token`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      grant_type: "client_credential",
      appid: process.env.DOGPAY_APP_ID,
      secret: process.env.DOGPAY_API_SECRET
    })
  });

  if (!response.ok) throw new Error(`DogPay auth failed: ${response.status}`);
  const payload = await response.json() as { data: DogPayToken };
  cachedToken = {
    value: payload.data.access_token,
    expiresAtMs: now + payload.data.expires_in * 1000
  };
  return cachedToken.value;
}
```

Webhook signature verification in Node.js:

```ts
import crypto from "node:crypto";

export function verifyDogPayWebhook(rawBody: Buffer | string, signature: string, apiKey: string) {
  const computed = crypto
    .createHmac("sha512", apiKey)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(signature, "hex");
  const actual = Buffer.from(computed, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
```

## Guardrails

- Use server-side calls only for DogPay API credentials.
- Use decimal strings for money amounts where the API schema expects strings.
- Use unique `callId` values and persist them.
- Treat webhooks as the source of truth for order fulfillment.
- Log DogPay `requestId`/response metadata when available, but never log secrets or full tokens.
- For production, configure the merchant webhook URL and required IP allowlists in the DogPay dashboard.
