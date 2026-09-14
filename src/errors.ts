/** Typed errors raised by the tonia Pass client. */

export type ToniaErrorType =
  | "authentication_error"
  | "billing_error"
  | "entitlement_error"
  | "invalid_request_error"
  | "byok_key_missing"
  | "policy_block"
  | "agent_block"
  | "tenant_upstream_blocked"
  | "managed_credential_unavailable"
  | "rate_limit_error"
  | "api_error"
  | "client_error";

export interface StructuredErrorBody {
  type: string;
  code?: string;
  retryable?: boolean;
  message?: string;
  provider?: string;
  reason?: string;
  scope?: string;
  [key: string]: unknown;
}

type HeaderSource = Headers | Record<string, string> | undefined;

function headerGet(headers: HeaderSource, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? undefined;
  }
  const rec = headers as Record<string, string>;
  const found = Object.entries(rec).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );
  return found?.[1];
}

/** Integer `Retry-After` seconds, or undefined when missing / HTTP-date. */
export function parseRetryAfterSeconds(headers?: HeaderSource): number | undefined {
  const raw = headerGet(headers, "retry-after")?.trim();
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  return Number(raw);
}

export function parseRequestId(headers?: HeaderSource): string | undefined {
  const raw = headerGet(headers, "x-tonia-request-id")?.trim();
  return raw ? raw : undefined;
}

export class ToniaError extends Error {
  readonly type: ToniaErrorType | string;
  readonly code?: string;
  readonly retryable?: boolean;
  readonly status?: number;
  readonly body?: unknown;
  readonly headers?: Headers;
  /** Parsed `Retry-After` delay-seconds when Pass sent an integer. */
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;

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
    this.retryAfterSeconds = parseRetryAfterSeconds(opts.headers);
    this.requestId = parseRequestId(opts.headers);
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
  /** `member` | `organization` | `operator` on entitlement envelopes. */
  readonly scope?: string;

  constructor(
    message: string,
    opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type"> & {
      entitlementBlock?: unknown;
      scope?: string;
    },
  ) {
    super(message, { ...opts, type: "entitlement_error" });
    this.name = "EntitlementError";
    this.entitlementBlock = opts.entitlementBlock;
    this.scope = opts.scope;
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

export class AgentBlockError extends ToniaError {
  readonly agentBlock?: unknown;
  readonly capability?: string;

  constructor(
    message: string,
    opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type"> & {
      agentBlock?: unknown;
      capability?: string;
    },
  ) {
    super(message, { ...opts, type: "agent_block" });
    this.name = "AgentBlockError";
    this.agentBlock = opts.agentBlock;
    this.capability = opts.capability;
  }
}

export class TenantUpstreamBlockedError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "tenant_upstream_blocked" });
    this.name = "TenantUpstreamBlockedError";
  }
}

export class ManagedCredentialUnavailableError extends ToniaError {
  readonly provider?: string;

  constructor(
    message: string,
    opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type"> & {
      provider?: string;
    },
  ) {
    super(message, { ...opts, type: "managed_credential_unavailable" });
    this.name = "ManagedCredentialUnavailableError";
    this.provider = opts.provider;
  }
}

export class RateLimitError extends ToniaError {
  /** Admission reason: `rpm_per_key` or `concurrency_*`. */
  readonly reason?: string;
  /** Admission scope: `key` | `tenant` | `global`. */
  readonly scope?: string;

  constructor(
    message: string,
    opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type"> & {
      reason?: string;
      scope?: string;
    },
  ) {
    super(message, { ...opts, type: "rate_limit_error" });
    this.name = "RateLimitError";
    this.reason = opts.reason;
    this.scope = opts.scope;
  }
}

export class ApiError extends ToniaError {
  constructor(message: string, opts: Omit<ConstructorParameters<typeof ToniaError>[1], "type">) {
    super(message, { ...opts, type: "api_error" });
    this.name = "ApiError";
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
      return new EntitlementError(message, {
        ...base,
        scope: typeof err.scope === "string" ? err.scope : undefined,
      });
    case "invalid_request_error":
      return new InvalidRequestError(message, base);
    case "byok_key_missing":
      return new ByokKeyMissingError(message, base);
    case "policy_block":
      return new PolicyBlockError(message, base);
    case "agent_block":
      return new AgentBlockError(message, {
        ...base,
        capability: typeof err.capability === "string" ? err.capability : undefined,
      });
    case "tenant_upstream_blocked":
      return new TenantUpstreamBlockedError(message, base);
    case "managed_credential_unavailable":
      return new ManagedCredentialUnavailableError(message, {
        ...base,
        provider: typeof err.provider === "string" ? err.provider : undefined,
      });
    case "rate_limit_error":
      return new RateLimitError(message, {
        ...base,
        reason: typeof err.reason === "string" ? err.reason : undefined,
        scope: typeof err.scope === "string" ? err.scope : undefined,
      });
    case "api_error":
      return new ApiError(message, base);
    default:
      return new ToniaError(message, { ...base, type: err.type });
  }
}

/**
 * Fallback when Pass returns 4xx/5xx without a structured `error` envelope.
 * Bare 429/502/503 are retryable; other statuses stay non-retryable.
 */
export function errorFromHttpFallback(
  status: number,
  opts: { body?: unknown; headers?: Headers } = {},
): ToniaError {
  const message = `HTTP ${status}`;
  const base = { status, body: opts.body, headers: opts.headers };
  if (status === 429) {
    return new RateLimitError(message, { ...base, retryable: true });
  }
  if (status === 502 || status === 503) {
    return new ApiError(message, { ...base, retryable: true });
  }
  return new ToniaError(message, {
    ...base,
    type: "invalid_request_error",
    retryable: false,
  });
}

/** Raise if Pass already decided the stream is blocked (headers, before SSE). */
export function raiseFromStreamHeaders(headers?: Headers): void {
  if (!headers) return;
  const policy = headers.get("x-tonia-policy-block");
  if (policy) {
    throw new PolicyBlockError("tonia policy block", {
      code: policy,
      retryable: false,
      status: 200,
      headers,
      policyBlock: { code: policy },
    });
  }
  const entitlement = headers.get("x-tonia-entitlement-block");
  if (entitlement) {
    throw new EntitlementError("tonia entitlement block", {
      code: entitlement,
      retryable: true,
      status: 200,
      headers,
      entitlementBlock: { code: entitlement },
    });
  }
  const agent = headers.get("x-tonia-agent-block");
  if (agent) {
    const capability = headers.get("x-tonia-agent-capability") ?? undefined;
    throw new AgentBlockError("tonia agent block", {
      code: agent,
      capability,
      retryable: false,
      status: 200,
      headers,
      agentBlock: { code: agent, capability },
    });
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
    if ("_tonia_agent_block" in obj) {
      const carrier =
        obj._tonia_agent_block && typeof obj._tonia_agent_block === "object"
          ? (obj._tonia_agent_block as Record<string, unknown>)
          : {};
      throw new AgentBlockError("tonia agent block", {
        code: typeof carrier.code === "string" ? carrier.code : undefined,
        capability:
          typeof carrier.capability === "string" ? carrier.capability : undefined,
        retryable:
          typeof carrier.retryable === "boolean" ? carrier.retryable : false,
        status: 200,
        body,
        headers: opts.headers,
        agentBlock: carrier,
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
        scope: typeof carrier.scope === "string" ? carrier.scope : undefined,
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
