# @tonia-router/sdk

Official TypeScript / JavaScript client for [tonia Pass](https://pass.tonia.ca).

**npm:** [`@tonia-router/sdk`](https://www.npmjs.com/package/@tonia-router/sdk)  
**API contract:** [`tonia-api`](https://github.com/tonia-router/tonia-api)

Requires Node.js 22 or newer (Maintenance LTS 22, Active LTS 24). Node 18 and
20 are end-of-life. The package is built with TypeScript 6.0.

**License:** Copyright (c) 2026 tonia inc. Apache 2.0. Keep the copyright
notice and `NOTICE` (attribution to tonia, https://tonia.ca) if you copy or
redistribute this software.

```bash
npm add @tonia-router/sdk
# until npm is live:
# npm add https://github.com/tonia-router/typescript-sdk/releases/download/v0.3.1/tonia-router-sdk-0.3.1.tgz
# from a local checkout (build first): npm add ../typescript-sdk
```

```ts
import { Tonia } from "@tonia-router/sdk";

const client = new Tonia({
  apiKey: process.env.TONIA_API_KEY!,
  // baseURL defaults to https://pass.tonia.ca:8443
  defaultHeaders: {
    "HTTP-Referer": "https://example.com",
    "X-Tonia-Title": "Example App",
  },
});

const { data } = await client.models.list();
if (!data[0]) {
  throw new Error("this key has no models; check the profile allowlist in the portal");
}
const completion = await client.chat.completions.create({
  model: data[0].id,
  messages: [{ role: "user", content: "Bonjour" }],
});

const ac = new AbortController();
for await (const event of client.chat.completions.stream(
  {
    model: data[0].id,
    messages: [{ role: "user", content: "Bonjour" }],
  },
  { signal: ac.signal },
)) {
  if (event.json) {
    // provider-shaped chunk
  }
}
// Hang up: `ac.abort()`, or `break` the loop. Same as closing the socket.

// Soft-limit warnings from the last successful call (when present)
client.lastLimits;
```

## What you can call

- Public catalogue, public models, and service status (no key). Public models
  are the Managed sell list — not what your key is allowed to call.
- Runtime models and chat / messages / embeddings / images / audio.speech /
  audio.transcriptions / responses / rerank / interactions / realtime
  (with `TONIA_API_KEY`)

`client.models.list()` is what this key may call: the intersection of the
Workspace roster and the bound profile's `model_allowlist` /
`provider_allowlist`, resolved live on every request. An empty allowlist
returns an empty list. `"*"` returns every reachable model for those
providers. Editing the profile (or Workspace Policies that merge keywords /
fill omitted detection) changes the next call — no key rotation.

That helper sends `Authorization: Bearer` and returns **OpenAI-shaped** ids
(`openai/…`, `anthropic/claude-…`, `gemini/…`). The same `GET /v1/models`
with `x-api-key` only (Anthropic SDKs, Claude Code) returns
**Anthropic-shaped** ids (`claude-…`, no provider prefix).
`messages.create` sends `x-api-key` but still takes the OpenAI-shaped id
from `models.list()`. Do not mix the two id styles.

Chat conversation history (`/v1/conversations*`) stays on the chat app.
Store threads in your app and resend `messages[]` (see sdk-examples
`09-saas-integrator`).

For paths without a named helper, use `client.request(method, path, body)`.
Only supported Pass path prefixes are accepted.

## Live / realtime

`client.realtime.connect` opens **tonia** `wss://…:8443/v1/realtime`
(not the lab Live API, not WebRTC). First hop is `openai` / `gpt-live-1`.
Cascaded is the default. Native without `transcripts: true` is refused.
`client.request("GET", "/v1/realtime")` stays blocked — HTTP on that path
is 426. Reconnect is a new billed session.

Hosted DEV: `TONIA_BASE_URL=https://pass-dev.tonia.ca:8443`. Keep `:8443`.
Local Pass data (`:8444`) maps the helper to `:8448`. Override with
`TONIA_REALTIME_URL` if needed.

The key must see `gpt-live-1` on `models.list()` (portal profile →
**Temps réel** / **Live**). Ask / clavarde has no microphone.

```ts
const session = await client.realtime.connect({ model: "gpt-live-1" });
session.sendText("Reply with the single word ok.");
const event = await session.waitTurn(60_000);
session.close();

// Full duplex (PCM16 LE 24 kHz). Do not send input_text.
const live = await client.realtime.connect({
  model: "gpt-live-1",
  mode: "native",
  transcripts: true,
});
live.sendAudioAppend(pcm, "audio/pcm");

// Live STT (PCM16 LE 16 kHz). No spoken reply.
const captions = await client.realtime.connect({
  provider: "gemini",
  model: "gemini-3.5-transcribe-live",
  mode: "native",
  transcripts: true,
});
captions.sendAudioAppend(pcm, "audio/pcm;rate=16000");
captions.sendAudioCommit(undefined, "audio/pcm;rate=16000");
```

## Audio

`client.audio.speech.create` calls `POST /v1/audio/speech` and returns
`Uint8Array` bytes (`{input, voice}`).
`client.audio.transcriptions.create` calls `POST /v1/audio/transcriptions`
as multipart with a real file (not a data URI) and returns JSON
(`{text: ...}`). The workspace must have audio turned on (portal `/dlp`).
Off returns HTTP 403 `audio_not_in_plan`.

Gemini token TTS/STT uses `client.interactions.create` /
`POST /v1/interactions`. Do **not** call `audio.speech` or
`audio.transcriptions` for those ids. Pick from `GET /v1/models` via
`surface.path` / `audio_speech` / `audio_transcription`, not an id regex.

```ts
// Sold examples: mistral/voxtral-mini-tts-2603, openai/gpt-transcribe.
// Gemini token TTS/STT uses interactions.create.
const speech = await client.audio.speech.create({
  model: "mistral/voxtral-mini-tts-2603",
  input: "Bonjour Tonia",
  voice: "alloy",
});

import { readFile } from "node:fs/promises";

const transcript = await client.audio.transcriptions.create({
  model: "gpt-transcribe",
  file: await readFile("clip.wav"),
  filename: "clip.wav",
});
```

## Images

| Lab | Helper | Surface |
| --- | --- | --- |
| openai / xAI / Meta | `client.images.generate` / `client.images.edit` | `POST /v1/images/generations` and `/edits` |
| Alibaba | `client.images.generate` | `POST /v1/images/generations` (generate only) |
| Gemini image SKUs (`gemini-*-image*`) | `client.interactions.create` | `POST /v1/interactions` |

Gemini on `/v1/images/*` returns HTTP 400 `provider_requires_surface`
(`required_surface: interactions`). Retry on `/v1/interactions` instead.
Do not send a Gemini image SKU to `/v1/chat/completions`.

Generate (string `input`, `stream: false`). Pick a Gemini image id from
`models.list()`:

```ts
const geminiImage = ids.find((id) => id.startsWith("gemini/") && /image/i.test(id));
if (geminiImage) {
  const image = await client.interactions.create({
    model: geminiImage,
    input: "Draw a red fox",
    stream: false,
  });
}
```

Edit uses multimodal `input` parts. `data` is **raw base64**, not a data URL:

```ts
const edited = await client.interactions.create({
  model: geminiImage,
  stream: false,
  input: [
    { type: "text", text: "Make the fox sit" },
    { type: "image", mime_type: "image/png", data: rawB64 },
  ],
});
```

The response is native Interactions JSON. Output images live on
`model_output` steps (`type: image` or `mime_type` starting with `image/`).
The SDK does not reshape that envelope to OpenAI `{data:[{b64_json}]}`.

Image helpers abort after 300 seconds unless you set `timeout` on `Tonia`.
Chat-vision / `/v1/images` **inputs** still use inline `data:image/png;base64,...`
URLs; Pass refuses remote `http(s)` image links with
`remote_image_url_not_supported`.

## Errors and content redaction

HTTP 200 responses may still include `_tonia_policy_block`,
`_tonia_entitlement_block`, or `_tonia_agent_block` — the client raises
typed errors (`PolicyBlockError`, `EntitlementError`, `AgentBlockError`).
Content redaction is configured in the [tonia portal](https://portal.tonia.ca)
by binding a key to a redact-mode profile (Policies → Profiles). Agent
controls live on the same profile under Advanced — Agent controls. The SDK
does not set a redact header. Profile edits take effect on the next request.

Image inputs on `/v1/images` and chat-vision must contain inline bytes, such as a
`data:image/png;base64,...` URL. Pass does not fetch remote image links:
`http(s)` image references return the non-retryable code
`remote_image_url_not_supported`. Download and validate the image in your
application before encoding it. Gemini Interactions **edit** parts use
`mime_type` + raw `data` instead of a data URL — see **Images** above.

## Rate limits and retries

The SDK does not auto-retry. Use `error.retryable` and
`error.retryAfterSeconds` (from `Retry-After`).

Admission 429 is `RateLimitError` (`type: rate_limit_error`,
`code: admission_rate_limited`). Pass refuses the call immediately — it
is not queued. `reason` and `scope` say which limit hit:

| `reason` | `scope` |
| --- | --- |
| `rpm_per_key` | `key` |
| `concurrency_per_key` | `key` |
| `concurrency_per_tenant` | `tenant` (this workspace) |
| `concurrency_global` | `global` |

Per-key RPM defaults to 600. In-flight concurrency is a separate limit.
A streaming call holds a slot until the stream ends.

Not every 429 is admission:

| What | Class | `code` | Retry? |
| --- | --- | --- | --- |
| Admission | `RateLimitError` | `admission_rate_limited` | Yes — wait `retryAfterSeconds` |
| Monthly request quota | `EntitlementError` | `request_quota_exhausted` | Yes — wait until reset |
| Included-model token quota | `EntitlementError` | `campaign_token_quota_exhausted` | Yes — wait until reset |
| Included-model per-request cap | `EntitlementError` | `campaign_token_per_request_exceeded` | No |
| Included-model exhausted | `EntitlementError` | `campaign_cogs_ceiling_exhausted` | No |
| Budget | `EntitlementError` | `*_budget_exhausted` | No |
| Audit contention | `ApiError` | `audit_tip_contention` | Yes — typically 1 second |
| Managed credential | `ManagedCredentialUnavailableError` | `managed_credential_unavailable` | Yes — typically 60 seconds |

On chat routes, quota and budget often arrive as HTTP 200 with
`_tonia_entitlement_block`. The SDK still raises `EntitlementError`.
Branch on the exception class and `error.code`, not HTTP status alone.

```ts
import { RateLimitError } from "@tonia-router/sdk";

try {
  await client.chat.completions.create({ /* … */ });
} catch (err) {
  if (err instanceof RateLimitError && err.retryable) {
    const wait = err.retryAfterSeconds ?? 1;
    // sleep `wait` seconds, then retry once
  } else {
    throw err;
  }
}
```

## Develop

```bash
npm install
npm run build
npm test
```

## Examples and coding tools

Cookbook recipes: [`sdk-examples`](https://github.com/tonia-router/sdk-examples).

To point Cursor, Claude Code, or Codex at Pass, install the
[`tonia-sdk` skill](https://github.com/tonia-router/skills):

```bash
gh skill install tonia-router/skills tonia-sdk
```
