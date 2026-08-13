import { PathNotAllowedError } from "./errors.js";

/** Supported path prefixes for `client.request`. */
export const ESCAPE_HATCH_PREFIXES = [
  "/v1/public/",
  "/v1/status",
  "/v1/models",
  "/v1/chat/",
  "/v1/messages",
  "/v1/embeddings",
  "/v1/images/",
  "/v1/responses",
  "/v1/rerank",
  "/v1/interactions",
] as const;

export function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const noQuery = withSlash.split("?")[0]?.split("#")[0] ?? withSlash;
  const collapsed = noQuery.replace(/\/{2,}/g, "/");
  const resolved: string[] = [];
  for (const part of collapsed.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  return `/${resolved.join("/")}`;
}

export function assertPathAllowed(path: string): string {
  const normalized = normalizePath(path);
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
