import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPathAllowed, normalizePath } from "./escape.js";
import { PathNotAllowedError } from "./errors.js";

test("normalizePath strips query, collapses slashes, and resolves dot segments", () => {
  assert.equal(normalizePath("v1/models?x=1"), "/v1/models");
  assert.equal(normalizePath("//v1//chat//completions"), "/v1/chat/completions");
  assert.equal(normalizePath("/v1/models/../chat/completions"), "/v1/chat/completions");
});

test("supported prefixes pass", () => {
  assert.equal(assertPathAllowed("/v1/models"), "/v1/models");
  assert.equal(assertPathAllowed("/v1/chat/completions"), "/v1/chat/completions");
  assert.equal(assertPathAllowed("/v1/public/catalogue"), "/v1/public/catalogue");
  assert.equal(assertPathAllowed("/v1/status"), "/v1/status");
  assert.equal(assertPathAllowed("/v1/audio/speech"), "/v1/audio/speech");
  assert.equal(assertPathAllowed("/v1/audio/transcriptions"), "/v1/audio/transcriptions");
  assert.equal(
    assertPathAllowed("/v1/models/../chat/completions"),
    "/v1/chat/completions",
  );
});

test("unsupported paths rejected before send", () => {
  assert.throws(() => assertPathAllowed("/v1/billing/checkout"), PathNotAllowedError);
  assert.throws(() => assertPathAllowed("/v1/conversations"), PathNotAllowedError);
  assert.throws(() => assertPathAllowed("/v1/conversations/export"), PathNotAllowedError);
  assert.throws(() => assertPathAllowed("/healthz"), PathNotAllowedError);
  assert.throws(() => assertPathAllowed("/v1/realtime"), PathNotAllowedError);
  assert.throws(
    () => assertPathAllowed("/v1/models/../billing/checkout"),
    PathNotAllowedError,
  );
});
