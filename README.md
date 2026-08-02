# typescript-sdk

Official TypeScript / JavaScript client for [tonia Pass](https://pass.tonia.ca).

**Package:** [`@tonia/sdk`](https://www.npmjs.com/package/@tonia/sdk)  
**API contract:** [`tonia-api`](https://github.com/tonia-router/tonia-api)

```bash
npm add @tonia/sdk
```

```ts
import { Tonia } from "@tonia/sdk";

const client = new Tonia({
  apiKey: process.env.TONIA_API_KEY!,
  // baseURL defaults to https://pass.tonia.ca
  defaultHeaders: {
    "HTTP-Referer": "https://example.com",
    "X-Tonia-Title": "Example App",
  },
});

const models = await client.models.list();
const completion = await client.chat.completions.create({
  model: "openai/gpt-4.1-mini",
  messages: [{ role: "user", content: "Bonjour" }],
});

// Streaming (SSE) — do not buffer the full response
for await (const event of client.chat.completions.stream({
  model: "openai/gpt-4.1-mini",
  messages: [{ role: "user", content: "Bonjour" }],
})) {
  if (event.json) {
    // provider-shaped chunk
  }
}

// Soft-limit warnings from the last successful call (when present)
client.lastLimits;
```

## What you can call

- Public catalogue, public models, and service status (no key)
- Runtime models and chat / messages / embeddings / images / responses /
  rerank / interactions (with `TONIA_API_KEY`)
- Conversation history (member `app_session` key + plan entitlement)

For paths without a named helper, use `client.request(method, path, body)`.
Only supported Pass path prefixes are accepted.

## Errors & content redaction

HTTP 200 responses may still include `_tonia_policy_block` or
`_tonia_entitlement_block` — the client raises typed errors. Content
redaction is configured in the [tonia portal](https://portal.tonia.ca) by
binding a key to a redact-mode profile. The SDK does not set a redact header.

## Develop

```bash
npm install
npm test
npm run build
```

## Use with coding agents

Install the portable [`tonia-sdk` skill](https://github.com/tonia-router/skills):

```bash
gh skill install tonia-router/skills tonia-sdk
```

Cursor: **Settings → Rules → Add Rule → Remote Rule (GitHub)** → `tonia-router/skills`.

Examples live in [`sdk-examples`](https://github.com/tonia-router/sdk-examples).
