#!/usr/bin/env node

const docs = {
  overview: [
    "DogPay APIs use server-side Bearer token authentication with OAuth 2.0 client credentials.",
    "Sandbox base URL: https://sandbox-api-v2.dogpay.com.",
    "Current English quick-start docs show production base URL: https://api.dogpay.com. Verify before live release.",
    "Hosted checkout flow: get currency config, create pay order, send user to data.payInfo.payUrl, fulfill from webhook.",
    "Webhook signature: HMAC-SHA512 using API Key as key and the exact raw JSON body as message. Compare with wh-signature."
  ].join("\n"),
  endpoints: {
    "auth.access_token": {
      method: "POST",
      path: "/open-api/v1/auth/access_token",
      auth: "none",
      summary: "Exchange appid and secret for an access token.",
      body: {
        grant_type: "client_credential",
        appid: "your_API_Key",
        secret: "your_API_Secret"
      },
      notes: [
        "Tokens are valid for up to 7200 seconds.",
        "Cache server-side and refresh 5-10 minutes before expiry.",
        "Never expose API Secret in frontend/mobile code."
      ]
    },
    "pay.currency_config": {
      method: "GET",
      path: "/open-api/v1/pay/currency-config",
      auth: "bearer",
      summary: "List supported payment channel currency/chain configs.",
      query: {
        currency: "USDT",
        chain: "Ethereum"
      },
      notes: [
        "Use the returned id as currencyConfigId when creating a payment order.",
        "Supported chains include Ethereum, Tron, Solana, Base, Arbitrum, BSC, Bitcoin, Polygon, and Dogecoin."
      ]
    },
    "pay.create_order": {
      method: "POST",
      path: "/open-api/v1/pay",
      auth: "bearer",
      summary: "Create a hosted checkout payment order.",
      body: {
        orderAmount: "0.02",
        payChannel: "pay_002",
        currencyConfigId: "config_eth_usdt_001",
        goodsName: "Premium Subscription",
        callId: "order_req_1712345678",
        successUrl: "https://example.com/payment/success",
        failureUrl: "https://example.com/payment/failed"
      },
      notes: [
        "Required fields: orderAmount, goodsName, callId, currencyConfigId.",
        "Minimum orderAmount is 0.02.",
        "Prefer payChannel pay_002.",
        "Use data.payInfo.payUrl for hosted checkout."
      ]
    },
    "pay.list_orders": {
      method: "GET",
      path: "/open-api/v1/pay",
      auth: "bearer",
      summary: "List payment orders for reconciliation or recovery.",
      query: {
        page: 1,
        take: 10,
        orderByCreatedAt: "desc",
        callId: "merchant_order_id"
      },
      notes: [
        "Optional filters include cursorId, currency, callId, and id.",
        "Use webhooks as the source of truth for fulfillment."
      ]
    },
    "webhook.signature": {
      method: "POST",
      path: "merchant webhook URL",
      auth: "wh-signature header",
      summary: "Verify DogPay webhook payloads.",
      body: {
        event_id: "unique_event_id",
        event_identifier: "pay.transaction.update",
        data: {
          status: "completed"
        }
      },
      notes: [
        "Compute lowercase hex HMAC-SHA512(rawBody, apiKey).",
        "Respond 200 or 201 within 30 seconds.",
        "Retries are roughly 10s, 30s, 60s, 120s, 300s, and 600s.",
        "Fulfill pay.transaction.update only when data.status is completed."
      ]
    }
  },
  guides: [
    {
      title: "Quick Start",
      url: "https://docs.dogpay.com/docs/quick-start.md",
      text: "Register sandbox or production account, obtain API Key/API Secret, confirm base URL, get access token, then choose payment, BaaS, card, or wallet flow."
    },
    {
      title: "Authentication",
      url: "https://docs.dogpay.com/docs/authentication-overview.md",
      text: "OAuth 2.0 client credential flow. POST grant_type, appid, and secret to get access_token."
    },
    {
      title: "Create Payment",
      url: "https://docs.dogpay.com/docs/create-payment.md",
      text: "Get currencyConfigId, create pay order, display payUrl, and handle payment status via webhook."
    },
    {
      title: "Webhook Integration",
      url: "https://docs.dogpay.com/docs/webhook-integration.md",
      text: "Configure one HTTPS webhook URL, verify wh-signature with HMAC-SHA512, respond quickly, and process retries idempotently."
    },
    {
      title: "Order Transactions",
      url: "https://docs.dogpay.com/docs/pay-order-transactions.md",
      text: "Use pay.transaction.update and status completed as the authoritative fulfillment trigger."
    }
  ]
};

function toText(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function toolResult(text) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}

function listTools() {
  return [
    {
      name: "dogpay_overview",
      description: "Return a concise DogPay API integration overview.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "dogpay_search",
      description: "Search DogPay guide and endpoint summaries.",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "dogpay_endpoint",
      description: "Return details for a known DogPay endpoint key.",
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            enum: Object.keys(docs.endpoints)
          }
        },
        required: ["key"]
      }
    },
    {
      name: "dogpay_snippet",
      description: "Return an implementation snippet for a common DogPay flow.",
      inputSchema: {
        type: "object",
        properties: {
          flow: {
            type: "string",
            enum: ["curl-auth", "typescript-payment", "typescript-webhook"]
          }
        },
        required: ["flow"]
      }
    }
  ];
}

function searchDocs(query) {
  const needle = String(query || "").toLowerCase();
  const rows = [];

  for (const guide of docs.guides) {
    const haystack = `${guide.title} ${guide.text} ${guide.url}`.toLowerCase();
    if (haystack.includes(needle)) rows.push({ type: "guide", ...guide });
  }

  for (const [key, endpoint] of Object.entries(docs.endpoints)) {
    const haystack = `${key} ${endpoint.method} ${endpoint.path} ${endpoint.summary} ${endpoint.notes.join(" ")}`.toLowerCase();
    if (haystack.includes(needle)) rows.push({ type: "endpoint", key, ...endpoint });
  }

  return rows.length ? rows : [{ type: "none", text: `No local DogPay docs matched "${query}". Check https://docs.dogpay.com/llms.txt.` }];
}

const snippets = {
  "curl-auth": `curl --request POST \\
  --url "$DOGPAY_BASE_URL/open-api/v1/auth/access_token" \\
  --header 'accept: application/json' \\
  --header 'content-type: application/json' \\
  --data '{"grant_type":"client_credential","appid":"'"$DOGPAY_APP_ID"'","secret":"'"$DOGPAY_API_SECRET"'"}'`,
  "typescript-payment": `const token = await getDogPayToken();

const response = await fetch(\`\${process.env.DOGPAY_BASE_URL}/open-api/v1/pay\`, {
  method: "POST",
  headers: {
    "accept": "application/json",
    "content-type": "application/json",
    "authorization": \`Bearer \${token}\`
  },
  body: JSON.stringify({
    orderAmount: "0.02",
    payChannel: "pay_002",
    currencyConfigId,
    goodsName: "Premium Subscription",
    callId: merchantOrderId,
    successUrl: "https://example.com/payment/success",
    failureUrl: "https://example.com/payment/failed"
  })
});

const payload = await response.json();
const checkoutUrl = payload.data.payInfo.payUrl;`,
  "typescript-webhook": `import crypto from "node:crypto";

export function verifyDogPayWebhook(rawBody, signature, apiKey) {
  const computed = crypto.createHmac("sha512", apiKey).update(rawBody).digest("hex");
  const expected = Buffer.from(signature, "hex");
  const actual = Buffer.from(computed, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Fulfill only pay.transaction.update events whose data.status is "completed".
// Store event_id/idNo/callId before delivery to make webhook retries idempotent.`
};

function callTool(name, args = {}) {
  if (name === "dogpay_overview") return toolResult(docs.overview);
  if (name === "dogpay_search") return toolResult(JSON.stringify(searchDocs(args.query), null, 2));
  if (name === "dogpay_endpoint") {
    const endpoint = docs.endpoints[args.key];
    if (!endpoint) throw new Error(`Unknown endpoint key: ${args.key}`);
    return toolResult(JSON.stringify(endpoint, null, 2));
  }
  if (name === "dogpay_snippet") {
    const snippet = snippets[args.flow];
    if (!snippet) throw new Error(`Unknown snippet flow: ${args.flow}`);
    return toolResult(snippet);
  }
  throw new Error(`Unknown tool: ${name}`);
}

function printTarget(target) {
  if (target === "codex") {
    return [
      "codex plugin marketplace add wavepaid/dogpay-ai-tools",
      "codex plugin add dogpay@dogpay"
    ].join("\n");
  }

  if (target === "cursor") {
    return JSON.stringify({
      mcpServers: {
        dogpay: {
          command: "npx",
          args: ["-y", "@dogpay/dogpay-ai-plugins"]
        }
      }
    }, null, 2);
  }

  if (target === "claude") {
    return [
      "claude plugin marketplace add wavepaid/dogpay-ai-tools",
      "claude plugin install dogpay@dogpay"
    ].join("\n");
  }

  if (target === "claude-mcp") {
    return "claude mcp add dogpay-ai-plugins -- npx -y @dogpay/dogpay-ai-plugins";
  }

  return [
    "Usage:",
    "  dogpay-ai-plugins                 Start MCP server over stdio",
    "  dogpay-ai-plugins --print codex   Print Codex install commands",
    "  dogpay-ai-plugins --print cursor  Print Cursor MCP config",
    "  dogpay-ai-plugins --print claude  Print Claude Code plugin commands",
    "  dogpay-ai-plugins --print claude-mcp  Print Claude Code MCP command"
  ].join("\n");
}

function printCli() {
  const args = process.argv.slice(2);
  const printIndex = args.indexOf("--print");
  if (printIndex >= 0) {
    console.log(printTarget(args[printIndex + 1]));
    return true;
  }
  if (args.includes("--help") || args.includes("-h")) {
    console.log(printTarget("help"));
    return true;
  }
  return false;
}

function respond(id, result) {
  if (id === undefined || id === null) return;
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function fail(id, error) {
  if (id === undefined || id === null) return;
  process.stdout.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: {
      code: -32000,
      message: error instanceof Error ? error.message : String(error)
    }
  })}\n`);
}

function handleMessage(message) {
  const { id, method, params = {} } = message;

  try {
    if (method === "initialize") {
      respond(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "dogpay-ai-plugins",
          version: "0.1.0"
        }
      });
      return;
    }

    if (method === "ping") {
      respond(id, {});
      return;
    }

    if (method === "tools/list") {
      respond(id, { tools: listTools() });
      return;
    }

    if (method === "tools/call") {
      respond(id, callTool(params.name, params.arguments || {}));
      return;
    }

    if (method?.startsWith("notifications/")) return;

    respond(id, {});
  } catch (error) {
    fail(id, error);
  }
}

function startMcp() {
  process.stdin.setEncoding("utf8");
  let buffer = "";

  process.stdin.on("data", chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        handleMessage(JSON.parse(trimmed));
      } catch (error) {
        fail(null, error);
      }
    }
  });

  process.stdin.on("end", () => {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    try {
      handleMessage(JSON.parse(trimmed));
    } catch (error) {
      fail(null, error);
    }
  });
}

if (!printCli()) {
  startMcp();
}
