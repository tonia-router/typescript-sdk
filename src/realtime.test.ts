import assert from "node:assert/strict";
import { test } from "node:test";
import { Tonia } from "./client.js";
import { InvalidRequestError, PathNotAllowedError } from "./errors.js";
import { raiseIfRealtimeError, realtimeConnectUrl, realtimeWsUrl } from "./realtime.js";

test("ws url keeps hosted 8443", () => {
  assert.equal(
    realtimeWsUrl("https://pass-dev.tonia.ca:8443"),
    "wss://pass-dev.tonia.ca:8443/v1/realtime",
  );
  assert.equal(
    realtimeWsUrl("https://pass.tonia.ca:8443"),
    "wss://pass.tonia.ca:8443/v1/realtime",
  );
});

test("ws url maps local data plane to 8448", () => {
  assert.equal(realtimeWsUrl("http://127.0.0.1:8444"), "ws://127.0.0.1:8448/v1/realtime");
  assert.equal(realtimeWsUrl("http://127.0.0.1:8448"), "ws://127.0.0.1:8448/v1/realtime");
});

test("connect url defaults native with transcripts", () => {
  const url = realtimeConnectUrl("https://pass-dev.tonia.ca:8443");
  assert.ok(url.startsWith("wss://pass-dev.tonia.ca:8443/v1/realtime?"));
  assert.ok(url.includes("provider=openai"));
  assert.ok(url.includes("model=gpt-live-1"));
  assert.ok(url.includes("mode=native"));
  assert.ok(url.includes("transcripts=1"));
});

test("native turns transcripts on when unset", () => {
  const url = realtimeConnectUrl("https://pass.tonia.ca:8443", { mode: "native" });
  assert.ok(url.includes("transcripts=1"));
});

test("native with transcripts off is rejected", () => {
  assert.throws(
    () => realtimeConnectUrl("https://pass.tonia.ca:8443", { mode: "native", transcripts: false }),
    (error: unknown) => error instanceof InvalidRequestError && error.code === "realtime_native_transcripts_required",
  );
});

test("cascaded is sent only when asked", () => {
  const url = realtimeConnectUrl("https://pass.tonia.ca:8443", { mode: "cascaded" });
  assert.ok(url.includes("mode=cascaded"));
  assert.ok(!url.includes("transcripts"));
});

test("webrtc is rejected", () => {
  assert.throws(
    () => realtimeConnectUrl("https://pass.tonia.ca:8443", { webrtc: true }),
    (error: unknown) => error instanceof InvalidRequestError && error.code === "realtime_webrtc_forbidden",
  );
});

test("http request still blocks realtime path", async () => {
  const client = new Tonia();
  await assert.rejects(client.request("GET", "/v1/realtime"), PathNotAllowedError);
});

test("error envelope raises", () => {
  assert.throws(
    () =>
      raiseIfRealtimeError({
        error: {
          type: "invalid_request_error",
          code: "realtime_webrtc_forbidden",
          retryable: false,
        },
      }),
    (error: unknown) => error instanceof InvalidRequestError && error.code === "realtime_webrtc_forbidden",
  );
});
