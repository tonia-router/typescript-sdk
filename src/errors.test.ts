import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthenticationError,
  BillingError,
  ByokKeyMissingError,
  EntitlementError,
  errorFromStructured,
  errorFromHttpFallback,
  InvalidRequestError,
  ManagedCredentialUnavailableError,
  PolicyBlockError,
  raiseFromResponseBody,
  raiseFromStreamHeaders,
  RateLimitError,
  ApiError,
  TenantUpstreamBlockedError,
} from "./errors.js";

test("HTTP 200 entitlement carrier preserves code and retryability", () => {
  assert.throws(
    () =>
      raiseFromResponseBody(
        {
          _tonia_entitlement_block: {
            code: "managed_budget_exhausted",
            retryable: false,
          },
        },
        { status: 200 },
      ),
    (error) =>
      error instanceof EntitlementError &&
      error.code === "managed_budget_exhausted" &&
      error.retryable === false,
  );
});

test("public model flat 404 maps to InvalidRequestError", () => {
  assert.throws(
    () => raiseFromResponseBody({ error: "not_found" }, { status: 404 }),
    (error) =>
      error instanceof InvalidRequestError &&
      error.code === "not_found" &&
      error.retryable === false,
  );
});

const cases = [
  ["authentication_error", AuthenticationError],
  ["billing_error", BillingError],
  ["entitlement_error", EntitlementError],
  ["invalid_request_error", InvalidRequestError],
  ["byok_key_missing", ByokKeyMissingError],
  ["policy_block", PolicyBlockError],
  ["tenant_upstream_blocked", TenantUpstreamBlockedError],
  ["managed_credential_unavailable", ManagedCredentialUnavailableError],
  ["rate_limit_error", RateLimitError],
  ["api_error", ApiError],
] as const;

for (const [type, Expected] of cases) {
  test(`structured ${type} maps to its typed class`, () => {
    const error = errorFromStructured(
      {
        type,
        code: "synthetic_code",
        message: "Synthetic",
        retryable: true,
      },
      {
        status: 503,
        headers: new Headers({ "retry-after": "60" }),
      },
    );
    assert.ok(error instanceof Expected);
    assert.equal(error.code, "synthetic_code");
    assert.equal(error.retryable, true);
    assert.equal(error.status, 503);
    assert.equal(error.headers?.get("retry-after"), "60");
    assert.equal(error.retryAfterSeconds, 60);
  });
}

test("stream policy header raises before any body is needed", () => {
  assert.throws(
    () =>
      raiseFromStreamHeaders(
        new Headers({ "x-tonia-policy-block": "regulated_content_detected" }),
      ),
    (error) =>
      error instanceof PolicyBlockError &&
      error.code === "regulated_content_detected" &&
      error.retryable === false,
  );
});

test("stream entitlement header raises before any body is needed", () => {
  assert.throws(
    () =>
      raiseFromStreamHeaders(
        new Headers({ "x-tonia-entitlement-block": "managed_budget_exhausted" }),
      ),
    (error) =>
      error instanceof EntitlementError &&
      error.code === "managed_budget_exhausted" &&
      error.retryable === true,
  );
});

test("stream headers with no block are a no-op", () => {
  raiseFromStreamHeaders(new Headers({ "content-type": "text/event-stream" }));
});

test("provider_requires_surface is InvalidRequestError", () => {
  assert.throws(
    () =>
      raiseFromResponseBody(
        {
          error: {
            type: "invalid_request_error",
            code: "provider_requires_surface",
            required_surface: "interactions",
            retryable: false,
          },
        },
        { status: 400 },
      ),
    (error) =>
      error instanceof InvalidRequestError &&
      error.code === "provider_requires_surface" &&
      error.retryable === false &&
      (error.body as { error?: { required_surface?: string } })?.error
        ?.required_surface === "interactions",
  );
});

test("admission 429 lifts reason, scope, and Retry-After seconds", () => {
  assert.throws(
    () =>
      raiseFromResponseBody(
        {
          error: {
            type: "rate_limit_error",
            code: "admission_rate_limited",
            reason: "rpm_per_key",
            scope: "key",
            retryable: true,
          },
        },
        {
          status: 429,
          headers: new Headers({ "Retry-After": "47" }),
        },
      ),
    (error) =>
      error instanceof RateLimitError &&
      error.code === "admission_rate_limited" &&
      error.reason === "rpm_per_key" &&
      error.scope === "key" &&
      error.retryable === true &&
      error.retryAfterSeconds === 47,
  );
});

test("quota 429 is EntitlementError with Retry-After, not RateLimitError", () => {
  assert.throws(
    () =>
      raiseFromResponseBody(
        {
          error: {
            type: "entitlement_error",
            code: "request_quota_exhausted",
            scope: "organization",
            retryable: true,
          },
        },
        {
          status: 429,
          headers: new Headers({ "Retry-After": "86400" }),
        },
      ),
    (error) =>
      error instanceof EntitlementError &&
      error.code === "request_quota_exhausted" &&
      error.scope === "organization" &&
      error.retryable === true &&
      error.retryAfterSeconds === 86400,
  );
});

test("chat_200 entitlement carrier lifts Retry-After and scope", () => {
  assert.throws(
    () =>
      raiseFromResponseBody(
        {
          _tonia_entitlement_block: {
            type: "entitlement_block",
            code: "request_quota_exhausted",
            scope: "organization",
            retryable: true,
          },
        },
        {
          status: 200,
          headers: new Headers({ "Retry-After": "3600" }),
        },
      ),
    (error) =>
      error instanceof EntitlementError &&
      error.code === "request_quota_exhausted" &&
      error.scope === "organization" &&
      error.retryable === true &&
      error.retryAfterSeconds === 3600,
  );
});

test("audit tip contention 503 parses Retry-After and request id", () => {
  assert.throws(
    () =>
      raiseFromResponseBody(
        {
          error: {
            type: "api_error",
            code: "audit_tip_contention",
            retryable: true,
          },
        },
        {
          status: 503,
          headers: new Headers({
            "Retry-After": "1",
            "x-tonia-request-id": "tonia_req_abc",
          }),
        },
      ),
    (error) =>
      error instanceof ApiError &&
      error.code === "audit_tip_contention" &&
      error.retryable === true &&
      error.retryAfterSeconds === 1 &&
      error.requestId === "tonia_req_abc",
  );
});

test("HTTP-date Retry-After is ignored", () => {
  const error = errorFromStructured(
    { type: "rate_limit_error", code: "admission_rate_limited", retryable: true },
    {
      status: 429,
      headers: new Headers({
        "Retry-After": "Wed, 21 Oct 2015 07:28:00 GMT",
      }),
    },
  );
  assert.ok(error instanceof RateLimitError);
  assert.equal(error.retryAfterSeconds, undefined);
});

test("bare 429 fallback is retryable RateLimitError", () => {
  const error = errorFromHttpFallback(429, {
    headers: new Headers({ "Retry-After": "2" }),
  });
  assert.ok(error instanceof RateLimitError);
  assert.equal(error.retryable, true);
  assert.equal(error.retryAfterSeconds, 2);
  assert.equal(error.reason, undefined);
});

test("bare 503 fallback is retryable ApiError, not managed credential", () => {
  const error = errorFromHttpFallback(503, {
    headers: new Headers({ "Retry-After": "60" }),
  });
  assert.ok(error instanceof ApiError);
  assert.equal(error.retryable, true);
  assert.equal(error.retryAfterSeconds, 60);
});

test("bare 400 fallback stays non-retryable", () => {
  const error = errorFromHttpFallback(400);
  assert.equal(error.type, "invalid_request_error");
  assert.equal(error.retryable, false);
});
