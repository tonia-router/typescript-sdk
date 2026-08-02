/** Typed errors raised by the tonia Pass client. */

export type ToniaErrorType =
  | "authentication_error"
  | "billing_error"
  | "entitlement_error"
  | "invalid_request_error"
  | "byok_key_missing"
  | "policy_block"
  | "tenant_upstream_blocked"
  | "managed_credential_unavailable"
  | "client_error";

export interface StructuredErrorBody {
  type: string;
  code?: string;
  retryable?: boolean;
  message?: string;
  provider?: string;
  [key: string]: unknown;
}

export class ToniaError extends Error {
  readonly type: ToniaErrorType | string;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly status?: number;
  readonly body?: unknown;
  readonly headers?: Headers;

  constructor(
    message: string,
    opts: {
      type: ToniaErrorType | string;
      code?: string;
      retryable?: boolean;
      status?: number;
      body?: unknown;
      headers?: Headers;
    },
  ) {
    super(message);
    this.name = "ToniaError";
    this.type = opts.type;
    this.code = opts.code;
    this.retryable = opts.retryable;
    this.status = opts.status;
    this.body = opts.body;
    this.headers = opts.headers;
  }
}

export class AuthenticationError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "authentication_error" });
    this.name = "AuthenticationError";
  }
}

export class BillingError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "billing_error" });
    this.name = "BillingError";
  }
}

export class EntitlementError extends ToniaError {
  readonly entitlementBlock?: unknown;

  constructor(
    message: string,
    opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type"> & {
      entitlementBlock?: unknown;
    },
  ) {
    super(message, { ...opts, type: "entitlement_error" });
    this.name = "EntitlementError";
    this.entitlementBlock = opts.entitlementBlock;
  }
}

export class InvalidRequestError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "invalid_request_error" });
    this.name = "InvalidRequestError";
  }
}

export class ByokKeyMissingError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "byok_key_missing" });
    this.name = "ByokKeyMissingError";
  }
}

export class PolicyBlockError extends ToniaError {
  readonly policyBlock?: unknown;

  constructor(
    message: string,
    opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type"> & {
      policyBlock?: unknown;
    },
  ) {
    super(message, { ...opts, type: "policy_block" });
    this.name = "PolicyBlockError";
    this.policyBlock = opts.policyBlock;
  }
}

export class TenantUpstreamBlockedError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "tenant_upstream_blocked" });
    this.name = "TenantUpstreamBlockedError";
  }
}

export class ManagedCredentialUnavailableError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "managed_credential_unavailable" });
    this.name = "ManagedCredentialUnavailableError";
  }
}

export class PathNotAllowedError extends ToniaError {
  constructor(path: string) {
    super(`Path is not supported by this SDK: ${path}`, {
      type: "client_error",
      code: "path_not_allowed",
      retryable: false,
    });
    this.name = "PathNotAllowedError";
  }
}

export function errorFromStructured(
  err: StructuredErrorBody,
  opts: { status?: number; body?: unknown; headers?: Headers } = {},
): ToniaError {
  const message = err.message || err.code || err.type || "tonia API error";
  const base = {
    code: err.code,
    retryable: err.retryable,
    status: opts.status,
    body: opts.body,
    headers: opts.headers,
  };
  switch (err.type) {
    case "authentication_error":
      return new AuthenticationError(message, base);
    case "billing_error":
      return new BillingError(message, base);
    case "entitlement_error":
      return new EntitlementError(message, base);
    case "invalid_request_error":
      return new InvalidRequestError(message, base);
    case "byok_key_missing":
      return new ByokKeyMissingError(message, base);
    case "policy_block":
      return new PolicyBlockError(message, base);
    case "tenant_upstream_blocked":
      return new TenantUpstreamBlockedError(message, base);
    case "managed_credential_unavailable":
      return new ManagedCredentialUnavailableError(message, base);
    default:
      return new ToniaError(message, { ...base, type: err.type });
  }
}

/** Raise typed errors for HTTP error bodies and success-body carriers. */
export function raiseFromResponseBody(
  body: unknown,
  opts: { status: number; headers?: Headers },
): void {
  if (!body || typeof body !== "object") return;
  const obj = body as Record<string, unknown>;

  if (opts.status === 200) {
    if ("_tonia_policy_block" in obj) {
      const carrier =
        obj._tonia_policy_block && typeof obj._tonia_policy_block === "object"
          ? (obj._tonia_policy_block as Record<string, unknown>)
          : {};
      throw new PolicyBlockError("tonia policy block", {
        code: typeof carrier.code === "string" ? carrier.code : undefined,
        retryable:
          typeof carrier.retryable === "boolean" ? carrier.retryable : false,
        status: 200,
        body,
        headers: opts.headers,
        policyBlock: carrier,
      });
    }
    if ("_tonia_entitlement_block" in obj) {
      const carrier =
        obj._tonia_entitlement_block &&
        typeof obj._tonia_entitlement_block === "object"
          ? (obj._tonia_entitlement_block as Record<string, unknown>)
          : {};
      throw new EntitlementError("tonia entitlement block", {
        code: typeof carrier.code === "string" ? carrier.code : undefined,
        status: 200,
        body,
        headers: opts.headers,
        entitlementBlock: carrier,
        retryable:
          typeof carrier.retryable === "boolean" ? carrier.retryable : true,
      });
    }
    return;
  }

  if (opts.status === 404 && obj.error === "not_found") {
    throw new InvalidRequestError("not_found", {
      status: 404,
      code: "not_found",
      body,
      headers: opts.headers,
      retryable: false,
    });
  }

  const envelope = obj.error;
  if (envelope && typeof envelope === "object") {
    throw errorFromStructured(envelope as StructuredErrorBody, {
      status: opts.status,
      body,
      headers: opts.headers,
    });
  }
  if (typeof envelope === "string") {
    throw new ToniaError(envelope, {
      type: "invalid_request_error",
      status: opts.status,
      body,
      headers: opts.headers,
    });
  }
}
