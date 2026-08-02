import { assertPathAllowed } from "./escape.js";
import {
  AuthenticationError,
  raiseFromResponseBody,
  ToniaError,
} from "./errors.js";
import { limitsFromHeaders, type LimitInfo } from "./limits.js";
import { iterateSse, type SseEvent } from "./stream.js";

export type AuthStyle = "bearer" | "api_key";

export interface ToniaOptions {
  /** `tonia_*` key. Defaults to `process.env.TONIA_API_KEY`. */
  apiKey?: string;
  /** Defaults to `https://pass.tonia.ca`. Never falls back to an upstream lab. */
  baseURL?: string;
  /** Extra headers on every request (attribution: HTTP-Referer, X-Tonia-Title, …). */
  defaultHeaders?: Record<string, string>;
  /** Override fetch (tests). */
  fetch?: typeof fetch;
}

function defaultBaseURL(): string {
  return "https://pass.tonia.ca";
}

function resolveApiKey(explicit?: string): string | undefined {
  if (explicit) return explicit;
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return env?.TONIA_API_KEY;
}

export class Tonia {
  readonly baseURL: string;
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
  readonly responses: ResponsesResource;
  readonly rerank: RerankResource;
  readonly interactions: InteractionsResource;
  readonly conversations: ConversationsResource;

  constructor(options: ToniaOptions = {}) {
    this.baseURL = (options.baseURL ?? defaultBaseURL()).replace(/\/+$/, "");
    this.apiKey = resolveApiKey(options.apiKey);
    this.defaultHeaders = { ...(options.defaultHeaders ?? {}) };
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

    this.catalogue = new CatalogueResource(this);
    this.publicModels = new PublicModelsResource(this);
    this.publicModelCategories = new PublicModelCategoriesResource(this);
    this.status = new StatusResource(this);
    this.models = new ModelsResource(this);
    this.chat = new ChatResource(this);
    this.messages = new MessagesResource(this);
    this.embeddings = new EmbeddingsResource(this);
    this.images = new ImagesResource(this);
    this.responses = new ResponsesResource(this);
    this.rerank = new RerankResource(this);
    this.interactions = new InteractionsResource(this);
    this.conversations = new ConversationsResource(this);
  }

  /**
   * Call a supported Pass path that has no named helper.
   * Unsupported paths are rejected before the request is sent.
   */
  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    opts: { auth?: AuthStyle | "none"; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const normalized = assertPathAllowed(path);
    return this.send<T>(method, normalized, body, opts);
  }

  async send<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { auth?: AuthStyle | "none"; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const res = await this.rawFetch(method, path, body, opts);
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
      throw new ToniaError(`HTTP ${res.status}`, {
        type: "invalid_request_error",
        status: res.status,
        body: parsed,
        headers: res.headers,
        retryable: false,
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
    opts: { auth?: AuthStyle | "none"; headers?: Record<string, string> } = {},
  ): AsyncGenerator<SseEvent, void, unknown> {
    const self = this;
    return (async function* () {
      const payload =
        body && typeof body === "object"
          ? { ...(body as Record<string, unknown>), stream: true }
          : body;
      const res = await self.rawFetch(method, path, payload, {
        ...opts,
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
          throw new ToniaError(`HTTP ${res.status}`, {
            type: "invalid_request_error",
            status: res.status,
            body: parsed,
            headers: res.headers,
            retryable: false,
          });
        }
        // Non-SSE success body (e.g. chat_200 carrier already raised above).
        return;
      }

      yield* iterateSse(res.body);
    })();
  }

  private async rawFetch(
    method: string,
    path: string,
    body?: unknown,
    opts: { auth?: AuthStyle | "none"; headers?: Record<string, string> } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...(opts.headers ?? {}),
    };

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

    let payload: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      payload = JSON.stringify(body);
    }

    const url = `${this.baseURL}${path.startsWith("/") ? path : `/${path}`}`;
    return this.fetchImpl(url, { method, headers, body: payload });
  }
}

class CatalogueResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.send("GET", "/v1/public/catalogue", undefined, { auth: "none" });
  }
}

class PublicModelsResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.send("GET", "/v1/public/models", undefined, { auth: "none" });
  }
  get(id: string) {
    return this.client.send(
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
    return this.client.send("GET", "/v1/public/model-categories", undefined, {
      auth: "none",
    });
  }
}

class StatusResource {
  constructor(private readonly client: Tonia) {}
  get() {
    return this.client.send("GET", "/v1/status", undefined, { auth: "none" });
  }
}

class ModelsResource {
  constructor(private readonly client: Tonia) {}
  list() {
    return this.client.send("GET", "/v1/models");
  }
  get(id: string) {
    return this.client.send("GET", `/v1/models/${encodeURIComponent(id)}`);
  }
}

class ChatCompletionsResource {
  constructor(private readonly client: Tonia) {}

  create(body: Record<string, unknown>): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body);
    }
    return this.client.send("POST", "/v1/chat/completions", body, { auth: "bearer" });
  }

  stream(body: Record<string, unknown> = {}): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/chat/completions", body, { auth: "bearer" });
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

  create(body: Record<string, unknown>): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body);
    }
    return this.client.send("POST", "/v1/messages", body, { auth: "api_key" });
  }

  stream(body: Record<string, unknown> = {}): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/messages", body, { auth: "api_key" });
  }
}

class EmbeddingsResource {
  constructor(private readonly client: Tonia) {}
  create(body: Record<string, unknown>) {
    return this.client.send("POST", "/v1/embeddings", body);
  }
}

class ImagesResource {
  constructor(private readonly client: Tonia) {}
  generate(body: Record<string, unknown>) {
    return this.client.send("POST", "/v1/images/generations", body);
  }
  edit(body: Record<string, unknown>) {
    return this.client.send("POST", "/v1/images/edits", body);
  }
}

class ResponsesResource {
  constructor(private readonly client: Tonia) {}

  create(body: Record<string, unknown>): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body);
    }
    return this.client.send("POST", "/v1/responses", body);
  }

  stream(body: Record<string, unknown> = {}): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/responses", body);
  }
}

class RerankResource {
  constructor(private readonly client: Tonia) {}
  create(body: Record<string, unknown>) {
    return this.client.send("POST", "/v1/rerank", body);
  }
}

class InteractionsResource {
  constructor(private readonly client: Tonia) {}

  create(body: Record<string, unknown>): Promise<unknown> | AsyncGenerator<SseEvent, void, unknown> {
    if (body.stream === true) {
      return this.stream(body);
    }
    return this.client.send("POST", "/v1/interactions", body);
  }

  stream(body: Record<string, unknown> = {}): AsyncGenerator<SseEvent, void, unknown> {
    return this.client.stream("POST", "/v1/interactions", body);
  }
}

class ConversationsResource {
  constructor(private readonly client: Tonia) {}
  list(query?: { archived?: 1 }) {
    const q = query?.archived === 1 ? "?archived=1" : "";
    return this.client.send("GET", `/v1/conversations${q}`);
  }
  create(body?: Record<string, unknown>) {
    return this.client.send("POST", "/v1/conversations", body ?? {});
  }
  get(conversationId: string) {
    return this.client.send(
      "GET",
      `/v1/conversations/${encodeURIComponent(conversationId)}`,
    );
  }
  update(conversationId: string, body: { archived: boolean }) {
    return this.client.send(
      "PATCH",
      `/v1/conversations/${encodeURIComponent(conversationId)}`,
      body,
    );
  }
  delete(conversationId: string) {
    return this.client.send(
      "DELETE",
      `/v1/conversations/${encodeURIComponent(conversationId)}`,
    );
  }
  export() {
    return this.client.send("GET", "/v1/conversations/export");
  }
  append(conversationId: string, body: Record<string, unknown>) {
    return this.client.send(
      "POST",
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      body,
    );
  }
  deleteHistory() {
    return this.client.send("DELETE", "/v1/conversations");
  }
}
