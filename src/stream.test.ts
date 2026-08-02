import assert from "node:assert/strict";
import { test } from "node:test";
import { EntitlementError, PolicyBlockError } from "./errors.js";
import { feedSse, raiseIfStreamCarrier } from "./stream.js";
import { limitsFromHeaders } from "./limits.js";

test("feedSse parses framed events and keeps remainder", () => {
  const { events, rest } = feedSse("", 'data: {"a":1}\n\ndata: {"b"');
  assert.equal(events.length, 1);
  assert.deepEqual(events[0]?.json, { a: 1 });
  assert.equal(rest, 'data: {"b"');
});

test("raiseIfStreamCarrier detects policy block on stream payload", () => {
  assert.throws(
    () => raiseIfStreamCarrier({ _tonia_policy_block: { code: "regulated_content_detected" } }),
    PolicyBlockError,
  );
  assert.throws(
    () =>
      raiseIfStreamCarrier({
        _tonia_entitlement_block: { code: "managed_budget_exhausted" },
      }),
    EntitlementError,
  );
});

test("limitsFromHeaders reads soft-limit headers", () => {
  const headers = new Headers({
    "x-tonia-limit-warning": "usage_limit_80_percent",
    "x-tonia-limit-remaining": "17",
  });
  const limits = limitsFromHeaders(headers);
  assert.equal(limits?.warning, "usage_limit_80_percent");
  assert.equal(limits?.remaining, "17");
});
