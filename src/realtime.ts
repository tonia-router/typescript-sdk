import { AuthenticationError, InvalidRequestError, raiseFromResponseBody } from "./errors.js";

export const FIRST_HOP_PROVIDER = "openai";
export const FIRST_HOP_MODEL = "gpt-live-1";
export const REALTIME_PATH = "/v1/realtime";
export const TURN_TYPES = [
  "output_text.done",
  "output_audio.done",
  "transcript.final",
  "response.function_call",
] as const;
export const TERMINAL_TURN_TYPES = [
  "output_text.done",
  "output_audio.done",
  "response.function_call",
] as const;

const LOCAL_DATA_PORT = "8444";
const LOCAL_REALTIME_PORT = "8448";

type NodeWebSocketCtor = {
  new (url: string, init?: { headers?: Record<string, string> }): WebSocket;
};

export interface RealtimeConnectOptions {
  provider?: string;
  model?: string;
  mode?: "cascaded" | "native";
  chatModel?: string;
  transcripts?: boolean;
  webrtc?: boolean;
  transport?: string;
}

function envRealtimeUrl(): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return env?.TONIA_REALTIME_URL?.trim() || undefined;
}

export function realtimeWsUrl(baseURL: string, realtimeURL?: string): string {
  const override = (realtimeURL ?? envRealtimeUrl() ?? "").trim();
  if (override) return override.replace(/\/+$/, "");
  const parsed = new URL(baseURL);
  const scheme = parsed.protocol === "https:" ? "wss:" : "ws:";
  const hostname = parsed.hostname;
  const port = parsed.port;
  const local = hostname === "127.0.0.1" || hostname === "localhost";
  const mapped =
    local && (!port || port === LOCAL_DATA_PORT) ? LOCAL_REALTIME_PORT : port;
  const host = mapped ? `${hostname}:${mapped}` : hostname;
  return `${scheme}//${host}${REALTIME_PATH}`;
}

export function realtimeConnectUrl(
  baseURL: string,
  options: RealtimeConnectOptions & { realtimeURL?: string } = {},
): string {
  const transport = (options.transport ?? "").trim().toLowerCase();
  if (options.webrtc || transport === "webrtc" || transport === "rtc") {
    throw new InvalidRequestError("Managed WebRTC to the lab is forbidden", {
      code: "realtime_webrtc_forbidden",
      retryable: false,
    });
  }
  const mode = (options.mode ?? "cascaded").trim().toLowerCase();
  if (mode !== "cascaded" && mode !== "native") {
    throw new InvalidRequestError("realtime mode must be cascaded or native", {
      code: "realtime_mode_invalid",
      retryable: false,
    });
  }
  if (mode === "native" && !options.transcripts) {
    throw new InvalidRequestError("native Live needs transcripts=1", {
      code: "realtime_native_transcripts_required",
      retryable: false,
    });
  }
  const query = new URLSearchParams({
    provider: (options.provider ?? FIRST_HOP_PROVIDER).trim() || FIRST_HOP_PROVIDER,
    model: (options.model ?? FIRST_HOP_MODEL).trim() || FIRST_HOP_MODEL,
    mode,
  });
  if (options.chatModel?.trim()) query.set("chat_model", options.chatModel.trim());
  if (options.transcripts) query.set("transcripts", "1");
  return `${realtimeWsUrl(baseURL, options.realtimeURL)}?${query.toString()}`;
}

export function raiseIfRealtimeError(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const obj = payload as Record<string, unknown>;
  if (obj.type === "error" || (obj.error && typeof obj.error === "object")) {
    raiseFromResponseBody(payload, { status: 400 });
  }
}

export class RealtimeSession {
  readonly sessionId: string;
  readonly mode: string;
  readonly model: string;
  readonly reconnect: string;
  readonly created: Record<string, unknown>;
  private readonly ws: WebSocket;
  private readonly pending: Array<Record<string, unknown>> = [];
  private waiter:
    | { resolve: (value: Record<string, unknown>) => void; reject: (err: unknown) => void }
    | undefined;

  constructor(ws: WebSocket, created: Record<string, unknown>) {
    raiseIfRealtimeError(created);
    if (created.type !== "session.created") {
      throw new InvalidRequestError("realtime handshake failed", {
        code: typeof created.code === "string" ? created.code : "realtime_handshake_invalid",
        retryable: false,
        body: created,
      });
    }
    this.ws = ws;
    this.created = created;
    this.sessionId = typeof created.session_id === "string" ? created.session_id : "";
    this.mode = typeof created.mode === "string" ? created.mode : "";
    this.model = typeof created.model === "string" ? created.model : FIRST_HOP_MODEL;
    this.reconnect =
      typeof created.reconnect === "string" ? created.reconnect : "new_session";
    this.ws.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data);
      let payload: unknown;
      try {
        payload = JSON.parse(raw) as unknown;
      } catch {
        return;
      }
      if (!payload || typeof payload !== "object") return;
      const obj = payload as Record<string, unknown>;
      if (this.waiter) {
        const { resolve } = this.waiter;
        this.waiter = undefined;
        resolve(obj);
        return;
      }
      this.pending.push(obj);
    });
  }

  sendText(text: string): void {
    this.ws.send(JSON.stringify({ type: "input_text", text }));
  }

  sendAudioAppend(audio: Uint8Array, mime = "audio/wav"): void {
    this.ws.send(
      JSON.stringify({
        type: "input_audio.append",
        audio: bytesToBase64(audio),
        mime,
      }),
    );
  }

  sendAudioCommit(audio?: Uint8Array, mime = "audio/wav"): void {
    const payload: Record<string, unknown> = { type: "input_audio.commit", mime };
    if (audio) payload.audio = bytesToBase64(audio);
    this.ws.send(JSON.stringify(payload));
  }

  sendDelegationResult(
    delegationId: string,
    content: string,
    kind: "commentary" | "thinking" = "commentary",
  ): void {
    this.ws.send(
      JSON.stringify({
        type: "delegation.result",
        delegation_id: delegationId,
        kind,
        content,
      }),
    );
  }

  async recv(timeoutMs = 60_000): Promise<Record<string, unknown>> {
    const next = this.pending.shift();
    if (next) {
      raiseIfRealtimeError(next);
      return next;
    }
    const payload = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiter?.resolve === resolve) this.waiter = undefined;
        reject(new InvalidRequestError("realtime recv timeout", { code: "realtime_probe_timeout" }));
      }, timeoutMs);
      this.waiter = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject,
      };
    });
    raiseIfRealtimeError(payload);
    return payload;
  }

  async waitTurn(timeoutMs = 60_000): Promise<Record<string, unknown>> {
    const deadline = Date.now() + timeoutMs;
    let last: Record<string, unknown> | undefined;
    while (Date.now() < deadline) {
      const event = await this.recv(Math.max(1, deadline - Date.now()));
      last = event;
      const eventType = typeof event.type === "string" ? event.type : "";
      if ((TERMINAL_TURN_TYPES as readonly string[]).includes(eventType)) return event;
    }
    if (!last) {
      throw new InvalidRequestError("realtime recv timeout", { code: "realtime_probe_timeout" });
    }
    return last;
  }

  close(): void {
    this.ws.close();
  }
}

export async function connectRealtime(opts: {
  apiKey?: string;
  baseURL: string;
  realtimeURL?: string;
  timeoutMs?: number;
} & RealtimeConnectOptions): Promise<RealtimeSession> {
  const apiKey = opts.apiKey;
  if (!apiKey) {
    throw new AuthenticationError("Missing TONIA_API_KEY", {
      code: "missing_bearer",
      retryable: false,
    });
  }
  const url = realtimeConnectUrl(opts.baseURL, opts);
  const Ctor = WebSocket as unknown as NodeWebSocketCtor;
  const ws = new Ctor(url, { headers: { Authorization: `Bearer ${apiKey}` } });
  const created = await waitOpenMessage(ws, Math.min(opts.timeoutMs ?? 60_000, 10_000));
  return new RealtimeSession(ws, created);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function waitOpenMessage(ws: WebSocket, timeoutMs: number): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new InvalidRequestError("realtime handshake timeout", { code: "realtime_probe_timeout" }));
    }, timeoutMs);
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new InvalidRequestError("realtime plane unreachable", { code: "realtime_plane_unreachable" }));
    });
    ws.addEventListener(
      "message",
      (event) => {
        clearTimeout(timer);
        const raw = typeof event.data === "string" ? event.data : String(event.data);
        try {
          const payload = JSON.parse(raw) as unknown;
          if (!payload || typeof payload !== "object") {
            reject(new InvalidRequestError("realtime handshake invalid", { code: "realtime_handshake_invalid" }));
            return;
          }
          resolve(payload as Record<string, unknown>);
        } catch {
          reject(new InvalidRequestError("realtime handshake invalid", { code: "realtime_handshake_invalid" }));
        }
      },
      { once: true },
    );
  });
}
