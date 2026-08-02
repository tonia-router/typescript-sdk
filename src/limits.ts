/** Soft-limit warning headers on successful runtime responses. */

export interface LimitInfo {
  warning?: string;
  scope?: string;
  kind?: string;
  used?: string;
  value?: string;
  remaining?: string;
  periodEndsAt?: string;
}

const LIMIT_KEYS: Record<keyof LimitInfo, string> = {
  warning: "x-tonia-limit-warning",
  scope: "x-tonia-limit-scope",
  kind: "x-tonia-limit-kind",
  used: "x-tonia-limit-used",
  value: "x-tonia-limit-value",
  remaining: "x-tonia-limit-remaining",
  periodEndsAt: "x-tonia-limit-period-ends-at",
};

export function limitsFromHeaders(
  headers: Headers | Record<string, string> | undefined,
): LimitInfo | undefined {
  if (!headers) return undefined;
  const get = (name: string): string | undefined => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name) ?? undefined;
    }
    const rec = headers as Record<string, string>;
    const found = Object.entries(rec).find(([k]) => k.toLowerCase() === name);
    return found?.[1];
  };

  const info: LimitInfo = {};
  let any = false;
  for (const [field, header] of Object.entries(LIMIT_KEYS) as [keyof LimitInfo, string][]) {
    const value = get(header);
    if (value != null && value !== "") {
      info[field] = value;
      any = true;
    }
  }
  return any ? info : undefined;
}
