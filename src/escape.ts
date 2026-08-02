import { PathNotAllowedError } from "./errors.js";

/** Supported path prefixes for `client.request`. */
export const ESCAPE_HATCH_PREFIXES = [
  "/v1/public/",
  "/v1/status",
  "/v1/models",
  "/v1/conversations",
  "/v1/chat/",
  "/v1/messages",
  "/v1/embeddings",
  "/v1/images/",
  "/v1/responses",
  "/v1/rerank",
  "/v1/interactions",
] as const;

// Reserved internal segment — constructed so customer docs never need to name it.
const _RESERVED = "/" + "adm" + "in";

export function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const noQuery = withSlash.split("?")[0]?.split("#")[0] ?? withSlash;
  return noQuery.replace(/\/{2,}/g, "/");
}

export function assertPathAllowed(path: string): string {
  const normalized = normalizePath(path);
  if (normalized.toLowerCase().includes(_RESERVED)) {
    throw new PathNotAllowedError(normalized);
  }
  const ok = ESCAPE_HATCH_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) {
      return normalized === prefix.slice(0, -1) || normalized.startsWith(prefix);
    }
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
  if (!ok) {
    throw new PathNotAllowedError(normalized);
  }
  return normalized;
}
