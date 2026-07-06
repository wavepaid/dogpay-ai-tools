# DogPay AI Tooling Kit

This kit implements a DogPay AI-tool setup page with tool-specific install commands, plus the assets those commands install or reference.

## What Was Built

- `plugins/dogpay`: a Codex plugin with a `dogpay-api` skill.
- `.agents/plugins/marketplace.json`: a Codex marketplace named `dogpay`.
- `npm/dogpay-ai-plugins`: a no-dependency Node MCP server and CLI package scaffold for Claude Code, Cursor, and npx usage.
- `openapi/dogpay-payments.openapi.json`: a compact OpenAPI file for ChatGPT Actions and other OpenAPI-based tools.
- `dogpay-ai-setup/index.html`: a static tabbed install page for AI tool setup.

## How It Works

DogPay already exposes an AI-readable docs index at `https://docs.dogpay.com/llms.txt`. The install page points each AI tool at a thin integration layer:

- Codex installs `dogpay` from a plugin marketplace.
- Claude Code and Cursor connect to the `@dogpay/dogpay-ai-plugins` MCP server.
- ChatGPT imports the OpenAPI file as an Action.
- npx prints install snippets or starts the MCP server over stdio.

## Local Test Commands

From this workspace, the Codex plugin can be tested with:

```bash
codex plugin marketplace add .
codex plugin add dogpay@dogpay
```

The MCP server can be smoke-tested with:

```bash
node npm/dogpay-ai-plugins/bin/dogpay-ai-plugins.js --print cursor
```

For public launch, publish the npm package as `@dogpay/dogpay-ai-plugins` and host the Codex marketplace under the public marketplace name `dogpay`; then users install with:

```bash
codex plugin marketplace add wavepaid/dogpay-ai-tools
codex plugin add dogpay@dogpay
```

## DogPay API Facts Captured

- Auth: `POST /open-api/v1/auth/access_token` with `grant_type=client_credential`, `appid`, and `secret`.
- Token lifetime: up to 7200 seconds; cache server-side and refresh before expiry.
- Payment currency config: `GET /open-api/v1/pay/currency-config`.
- Create hosted checkout: `POST /open-api/v1/pay`; required fields are `orderAmount`, `goodsName`, `callId`, and `currencyConfigId`.
- Checkout URL: `data.payInfo.payUrl`.
- Webhook signature: `HMAC-SHA512(rawBody, apiKey)` compared against `wh-signature`.
- Fulfillment trigger: `pay.transaction.update` with `data.status === "completed"`.
