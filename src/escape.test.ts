import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPathAllowed, normalizePath } from "./escape.js";
import { PathNotAllowedError } from "./errors.js";

test("normalizePath strips query and collapses slashes", () => {
  assert.equal(normalizePath("v1/models?x=1"), "/v1/models");
  assert.equal(normalizePath("//v1//chat//completions"), "/v1/chat/completions");
});

test("supported prefixes pass", () => {
  assert.equal(assertPathAllowed("/v1/models"), "/v1/models");
  assert.equal(assertPathAllowed("/v1/chat/completions"), "/v1/chat/completions");
  assert.equal(assertPathAllowed("/v1/public/catalogue"), "/v1/public/catalogue");
  assert.equal(assertPathAllowed("/v1/status"), "/v1/status");
});

test("unsupported paths rejected before send", () => {
  const reserved = "/" + "adm" + "in";
  assert.throws(() => assertPathAllowed(`/v1${reserved}/keys`), PathNotAllowedError);
  assert.throws(
    () => assertPathAllowed(`/v1/models/..${reserved}/x`),
    PathNotAllowedError,
  );
  assert.throws(() => assertPathAllowed(`/V1${reserved.toUpperCase()}/foo`), PathNotAllowedError);
  assert.throws(() => assertPathAllowed("/v1/billing/checkout"), PathNotAllowedError);
  assert.throws(() => assertPathAllowed("/healthz"), PathNotAllowedError);
});
