import { assertPathAllowed } from "./escape.js";
import {
  AuthenticationError,
  errorFromHttpFallback,
  raiseFromResponseBody,
  raiseFromStreamHeaders,
} from "./errors.js";
import { limitsFromHeaders, type LimitInfo } from "./limits.js";
import { iterateSse, type SseEvent } from "./stream.js";
import {
  connectRealtime,
  type RealtimeConnectOptions,
  type RealtimeSession,
} from "./realtime.js";
import type {
  PublicCatalogue,
  PublicModel,
  PublicModelList,
  RuntimeModel,
  RuntimeModelList,
} from "./types.js";

export type AuthStyle = "bearer" | "api_key";

/** Image / interactions helpers abort after this many ms when `timeout` is unset. */
export const IMAGE_TIMEOUT_MS = 300_000;

export const SDK_VERSION = "0.4.4";
export const SDK_USER_AGENT = `tonia-sdk-ts/${SDK_VERSION}`;

export type CallOptions = {
  auth?: AuthStyle | "none";
  headers?: Record<string, string>;
  timeout?: number;
  /** Hang up the Pass socket. Same as breaking a `for await` loop. */
  signal?: AbortSignal;
};

function mergeAbortSignals(
  timeoutMs?: number,
  signal?: AbortSignal,
): AbortSignal | undefined {
  const parts: AbortSignal[] = [];
  if (timeoutMs != null && timeoutMs > 0) {
    parts.push(AbortSignal.timeout(timeoutMs));
  }
  if (signal) parts.push(signal);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return AbortSignal.any(parts);
}

export interface ToniaOptions {
  /** `tonia_*` key. Defaults to `process.env.TONIA_API_KEY`. */
  apiKey?: string;
  /** Defaults to `https://pass.tonia.ca:8443`. Never falls back to an upstream lab. */
  baseURL?: string;
  /** Extra headers on every request (attribution: HTTP-Referer, X-Tonia-Title, …). */
  defaultHeaders?: Record<string, string>;
  /**
   * Abort after this many milliseconds. Unset means no abort on chat/runtime
   * calls. Image helpers (`images.*`, `interactions.create`) default to
   * `IMAGE_TIMEOUT_MS` (300s) when this is unset.
   */
  timeout?: number;
  /** Override fetch (tests). */
  fetch?: typeof fetch;
  /** Hosted default is derived from `baseURL` (`:8443` stays). Local `:8444` → `:8448`. */
  realtimeURL?: string;
}

function defaultBaseURL(): string {
  return "https://pass.tonia.ca:8443";
}

function headerHas(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

function envRealtimeUrl(): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return env?.TONIA_REALTIME_URL?.trim() || undefined;
}

function resolveApiKey(explicit?: string): string | undefined {
  if (explicit) return explicit;
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return env?.TONIA_API_KEY;
}

export class Tonia {
  readonly baseURL: string;
  /** Caller-set timeout in milliseconds, if any. */
  readonly timeout?: number;
  private readonly apiKey?: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;

  /** Soft-limit headers from the most recent successful response, if any. */
  lastLimits: LimitInfo | undefined;

  readonly catalogue: CatalogueResource;
  readonly publicModels: PublicModelsResource;
  readonly publicModelCategories: PublicModelCategoriesResource;
  readonly status: StatusResource;
  readonly models: ModelsResource;
  readonly chat: ChatResource;
  readonly messages: MessagesResource;
  readonly embeddings: EmbeddingsResource;
  readonly images: ImagesResource;
  readonly audio: AudioResource;
  readonly responses: ResponsesResource;
  readonly rerank: RerankResource;
  readonly interactions: InteractionsResource;
  readonly realtime: RealtimeResource;
  readonly realtimeURL?: string;

  constructor(options: ToniaOptions = {}) {
    this.baseURL = (options.baseURL ?? defaultBaseURL()).replace(/\/+$/, "");
    this.timeout = options.timeout;
    this.apiKey = resolveApiKey(options.apiKey);
    this.defaultHeaders = { ...(options.defaultHeaders ?? {}) };
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.realtimeURL = options.realtimeURL ?? envRealtimeUrl();

    this.catalogue = new CatalogueResource(this);
    this.publicModels = new PublicModelsResource(this);
    this.publicModelCategories = new PublicModelCategoriesResource(this);
    this.status = new StatusResource(this);
    this.models = new ModelsResource(this);
    this.chat = new ChatResource(this);
    this.messages = new MessagesResource(this);
    this.embeddings = new EmbeddingsResource(this);
    this.images = new ImagesResource(this);
    this.audio = new AudioResource(this);
    this.responses = new ResponsesResource(this);
    this.rerank = new RerankResource(this);
    this.interactions = new InteractionsResource(this);
    this.realtime = new RealtimeResource(this);
  }

  requireApiKey(): string {
    if (!this.apiKey) {
      throw new AuthenticationError("Missing TONIA_API_KEY", {
        code: "missing_bearer",
        retryable: false,
      });
    }
    return this.apiKey;
  }

  /**
   * Call a supported Pass path that has no named helper.
   * Unsupported paths are rejected before the request is sent.
   */
  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    opts: CallOptions = {},
  ): Promise<T> {
    const normalized = assertPathAllowed(path);
    return this.send<T>(method, normalized, body, opts);
  }

  private async send<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: CallOptions = {},
  ): Promise<T> {
    const res = await this.rawFetch(method, path, body, opts);
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    const binary =
      contentType.startsWith("audio/") || contentType.startsWith("application/octet-stream");
    if (binary) {
      if (!res.ok) {
        const text = await res.text();
        let parsed: unknown = undefined;
        if (text) {
          try {
            parsed = JSON.parse(text) as unknown;
          } catch {
            parsed = text;
          }
        }
        raiseFromResponseBody(parsed, { status: res.status, headers: res.headers });
        throw errorFromHttpFallback(res.status, {
          body: parsed,
          headers: res.headers,
        });
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      this.lastLimits = limitsFromHeaders(res.headers);
      return bytes as T;
    }

    const text = await res.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = text;
      }
    }

    raiseFromResponseBody(parsed, { status: res.status, headers: res.headers });

    if (!res.ok) {
      throw errorFromHttpFallback(res.status, {
        body: parsed,
        headers: res.headers,
      });
    }

    this.lastLimits = limitsFromHeaders(res.headers);
    return parsed as T;
  }

  /** SSE stream for chat-like routes. Yields events without buffering the full body. */
  stream(
    method: string,
    path: string,
    body?: unknown,
    opts: CallOptions = {},
  ): AsyncGenerator<SseEvent, void, unknown> {
    const normalized = assertPathAllowed(path);
    const self = this;
    return (async function* () {
      const payload =
        body && typeof body === "object"
          ? { ...(body as Record<string, unknown>), stream: true }
          : body;
      const timeoutMs = opts.timeout ?? self.timeout;
      const signal = mergeAbortSignals(timeoutMs, opts.signal);
      const res = await self.rawFetch(method, normalized, payload, {
        ...opts,
        // Timeout is already inside `signal` — do not merge a second timer.
        timeout: 0,
        signal,
        headers: {
          Accept: "text/event-stream",
          ...(opts.headers ?? {}),
        },
      });

      self.lastLimits = limitsFromHeaders(res.headers);

      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/event-stream")) {
        const text = await res.text();
        let parsed: unknown = text;
        try {
          parsed = text ? JSON.parse(text) : undefined;
        } catch {
          /* keep text */
        }
        raiseFromResponseBody(parsed, { status: res.status, headers: res.headers });
        if (!res.ok) {
          throw errorFromHttpFallback(res.status, {
            body: parsed,
            headers: res.headers,
          });
        }
        // Non-SSE success body (block carriers already raised above).
        return;
      }

      try {
        raiseFromStreamHeaders(res.headers);
      } catch (err) {
        await res.body?.cancel();
        throw err;
      }

      yield* iterateSse(res.body, signal);
    })();
  }

  private async rawFetch(
    method: string,
    path: string,
    body?: unknown,
    opts: CallOptions = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...(opts.headers ?? {}),
    };
    if (!headerHas(headers, "user-agent")) {
      headers["User-Agent"] = SDK_USER_AGENT;
    }

    const auth = opts.auth ?? "bearer";
    if (auth !== "none") {
      if (!this.apiKey) {
        throw new AuthenticationError("Missing TONIA_API_KEY", {
          code: "missing_bearer",
          retryable: false,
        });
      }
      if (auth === "api_key") {
        headers["x-api-key"] = this.apiKey;
      } else {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }
    }

    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      // fetch must set the multipart boundary — do not JSON.stringify.
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "content-type") {
          delete headers[key];
        }
      }
      payload = body;
    } else if (body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      payload = JSON.stringify(body);
    }

    const url = `${this.baseURL}${path.startsWith("/") ? path : `/${path}`}`;
    const timeoutMs = opts.timeout ?? this.timeout;
    const init: RequestInit = { method, headers, body: payload };
    const signal = mergeAbortSignals(timeoutMs, opts.signal);
    if (signal) init.signal = signal;
    return this.fetchImpl(url, init);
  }
}

class CatalogueResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.request<PublicCatalogue>("GET", "/v1/public/catalogue", undefined, {
      auth: "none",
    });
  }
}

class PublicModelsResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.request<PublicModelList>("GET", "/v1/public/models", undefined, {
      auth: "none",
    });
  }
  get(id: string) {
    return this.client.request<PublicModel>(
      "GET",
      `/v1/public/models/${encodeURIComponent(id)}`,
      undefined,
      { auth: "none" },
    );
  }
}

class PublicModelCategoriesResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.request("GET", "/v1/public/model-categories", undefined, {
      auth: "none",
    });
  }
}

class StatusResource {
  constructor(private readonly client: Tonia) {}
  get() {
    return this.client.request("GET", "/v1/status", undefined, { auth: "none" });
  }
}

class ModelsResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.request<RuntimeModelList>("GET", "/v1/models");
  }
  get(id: string) {
    return this.client.request<RuntimeModel>("GET", `/v1/models/${encodeURIComponent(id)}`);
  }
}

class ChatCompletionsResource {
  constructor(private readonly client: Tonia) {}

  create(
    body: Record<string, unknown> & { stream: true },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown>;
  create(
    body: Record<string, unknown> & { stream?: false },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown>;
  create(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body, opts);
    }
    return this.client.request("POST", "/v1/chat/completions", body, {
      auth: "bearer",
      ...opts,
    });
  }

  stream(
    body: Record<string, unknown> = {},
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/chat/completions", body, {
      auth: "bearer",
      ...opts,
    });
  }
}

class ChatResource {
  readonly completions: ChatCompletionsResource;
  constructor(client: Tonia) {
    this.completions = new ChatCompletionsResource(client);
  }
}

class MessagesResource {
  constructor(private readonly client: Tonia) {}

  create(
    body: Record<string, unknown> & { stream: true },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown>;
  create(
    body: Record<string, unknown> & { stream?: false },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown>;
  create(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body, opts);
    }
    return this.client.request("POST", "/v1/messages", body, { auth: "api_key", ...opts });
  }

  stream(
    body: Record<string, unknown> = {},
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/messages", body, { auth: "api_key", ...opts });
  }
}

class EmbeddingsResource {
  constructor(private readonly client: Tonia) {}
  create(body: Record<string, unknown>) {
    return this.client.request("POST", "/v1/embeddings", body);
  }
}

class ImagesResource {
  constructor(private readonly client: Tonia) {}
  /** OpenAI-shaped generate. Gemini uses interactions.create. */
  generate(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ) {
    return this.client.request("POST", "/v1/images/generations", body, {
      timeout: opts?.timeout ?? this.client.timeout ?? IMAGE_TIMEOUT_MS,
      signal: opts?.signal,
    });
  }
  /** OpenAI-shaped edit. Gemini uses interactions.create. */
  edit(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ) {
    return this.client.request("POST", "/v1/images/edits", body, {
      timeout: opts?.timeout ?? this.client.timeout ?? IMAGE_TIMEOUT_MS,
      signal: opts?.signal,
    });
  }
}

class AudioSpeechResource {
  constructor(private readonly client: Tonia) {}
  /** OpenAI-shaped TTS. Returns audio bytes. */
  create(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ) {
    return this.client.request<Uint8Array>("POST", "/v1/audio/speech", body, {
      timeout: opts?.timeout ?? this.client.timeout ?? IMAGE_TIMEOUT_MS,
      signal: opts?.signal,
      headers: { Accept: "application/octet-stream, audio/*, application/json" },
    });
  }
}

type AudioTranscriptionFile = Blob | File | Uint8Array | ArrayBuffer;

function audioMime(filename: string): string {
  const suffix = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (suffix === ".wav" || suffix === ".wave") return "audio/wav";
  if (suffix === ".mp3" || suffix === ".mpga") return "audio/mpeg";
  if (suffix === ".m4a" || suffix === ".mp4") return "audio/mp4";
  if (suffix === ".webm") return "audio/webm";
  if (suffix === ".ogg" || suffix === ".oga") return "audio/ogg";
  if (suffix === ".flac") return "audio/flac";
  return "application/octet-stream";
}

function transcriptionFileBlob(
  file: AudioTranscriptionFile | string,
  filename?: string,
): { blob: Blob; filename: string } {
  if (typeof file === "string" && file.trim().toLowerCase().startsWith("data:")) {
    throw new TypeError(
      "file must be a Blob, File, Uint8Array, or ArrayBuffer — not a data URI. Send the audio file itself.",
    );
  }
  if (file instanceof File) {
    return { blob: file, filename: filename || file.name || "audio.wav" };
  }
  if (file instanceof Blob) {
    return { blob: file, filename: filename || "audio.wav" };
  }
  if (file instanceof ArrayBuffer) {
    const name = filename || "audio.wav";
    return { blob: new Blob([file], { type: audioMime(name) }), filename: name };
  }
  if (file instanceof Uint8Array) {
    const copy = new Uint8Array(file.byteLength);
    copy.set(file);
    const name = filename || "audio.wav";
    return { blob: new Blob([copy], { type: audioMime(name) }), filename: name };
  }
  throw new TypeError("file must be a Blob, File, Uint8Array, or ArrayBuffer");
}

class AudioTranscriptionsResource {
  constructor(private readonly client: Tonia) {}
  /** OpenAI-shaped STT. Multipart `file` + `model`. Returns JSON. */
  create(
    body: {
      model: string;
      file: AudioTranscriptionFile;
      filename?: string;
      [key: string]: unknown;
    },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ) {
    const { model, file, filename, ...fields } = body;
    const { blob, filename: name } = transcriptionFileBlob(file, filename);
    const form = new FormData();
    form.append("file", blob, name);
    form.append("model", model);
    for (const [key, value] of Object.entries(fields)) {
      if (value == null) continue;
      form.append(key, typeof value === "string" ? value : String(value));
    }
    return this.client.request("POST", "/v1/audio/transcriptions", form, {
      timeout: opts?.timeout ?? this.client.timeout ?? IMAGE_TIMEOUT_MS,
      signal: opts?.signal,
    });
  }
}

class AudioResource {
  readonly speech: AudioSpeechResource;
  readonly transcriptions: AudioTranscriptionsResource;
  constructor(client: Tonia) {
    this.speech = new AudioSpeechResource(client);
    this.transcriptions = new AudioTranscriptionsResource(client);
  }
}

class ResponsesResource {
  constructor(private readonly client: Tonia) {}

  create(
    body: Record<string, unknown> & { stream: true },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown>;
  create(
    body: Record<string, unknown> & { stream?: false },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown>;
  create(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body, opts);
    }
    return this.client.request("POST", "/v1/responses", body, opts);
  }

  stream(
    body: Record<string, unknown> = {},
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/responses", body, opts);
  }
}

class RerankResource {
  constructor(private readonly client: Tonia) {}
  create(body: Record<string, unknown>) {
    return this.client.request("POST", "/v1/rerank", body);
  }
}

class RealtimeResource {
  constructor(private readonly client: Tonia) {}

  /** Open tonia wss /v1/realtime. HTTP request() still rejects this path. */
  connect(options: RealtimeConnectOptions = {}): Promise<RealtimeSession> {
    return connectRealtime({
      apiKey: this.client.requireApiKey(),
      baseURL: this.client.baseURL,
      realtimeURL: this.client.realtimeURL,
      timeoutMs: this.client.timeout,
      ...options,
    });
  }
}

class InteractionsResource {
  constructor(private readonly client: Tonia) {}

  /** Gemini text and image SKUs. Native Interactions body. */
  create(
    body: Record<string, unknown> & { stream: true },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown>;
  create(
    body: Record<string, unknown> & { stream?: false },
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown>;
  create(
    body: Record<string, unknown>,
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body, opts);
    }
    return this.client.request("POST", "/v1/interactions", body, {
      timeout: opts?.timeout ?? this.client.timeout ?? IMAGE_TIMEOUT_MS,
      signal: opts?.signal,
    });
  }

  stream(
    body: Record<string, unknown> = {},
    opts?: Pick<CallOptions, "timeout" | "signal">,
  ): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/interactions", body, {
      timeout: opts?.timeout ?? this.client.timeout ?? IMAGE_TIMEOUT_MS,
      signal: opts?.signal,
    });
  }
}
