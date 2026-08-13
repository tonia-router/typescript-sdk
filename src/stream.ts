import { raiseFromResponseBody } from "./errors.js";

export type SseEvent = {
  event?: string;
  data: string;
  raw: string;
  /** Parsed JSON when `data` is JSON; otherwise undefined. */
  json?: unknown;
};

/**
 * Parse an SSE text buffer into events. Does not buffer the whole stream —
 * call with each decoded chunk; returns completed events and leftover buffer.
 */
export function feedSse(buffer: string, chunk: string): { events: SseEvent[]; rest: string } {
  const combined = buffer + chunk;
  const parts = combined.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? "";
  const events: SseEvent[] = [];
  for (const block of parts) {
    if (!block.trim() || block.startsWith(":")) continue;
    let event: string | undefined;
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) continue;
    const data = dataLines.join("\n");
    let json: unknown;
    if (data && data !== "[DONE]") {
      try {
        json = JSON.parse(data) as unknown;
      } catch {
        json = undefined;
      }
    }
    events.push({ event, data, raw: block, json });
  }
  return { events, rest };
}

/** Raise if a parsed SSE/JSON payload carries a tonia block. */
export function raiseIfStreamCarrier(payload: unknown): void {
  raiseFromResponseBody(payload, { status: 200 });
  if (!payload || typeof payload !== "object") return;
  const nested = (payload as { message?: unknown }).message;
  if (nested && typeof nested === "object") {
    raiseFromResponseBody(nested, { status: 200 });
  }
}

export async function* iterateSse(
  body: ReadableStream<Uint8Array> | null,
): AsyncGenerator<SseEvent, void, unknown> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const { events, rest } = feedSse(buffer, decoder.decode(value, { stream: true }));
      buffer = rest;
      for (const ev of events) {
        if (ev.json !== undefined) raiseIfStreamCarrier(ev.json);
        yield ev;
      }
    }
    const tail = decoder.decode();
    if (tail || buffer) {
      const { events } = feedSse(buffer, tail);
      for (const ev of events) {
        if (ev.json !== undefined) raiseIfStreamCarrier(ev.json);
        yield ev;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
