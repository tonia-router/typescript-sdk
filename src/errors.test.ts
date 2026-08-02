import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthenticationError,
  BillingError,
  ByokKeyMissingError,
  EntitlementError,
  errorFromStructured,
  InvalidRequestError,
  ManagedCredentialUnavailableError,
  PolicyBlockError,
  raiseFromResponseBody,
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
  });
}
