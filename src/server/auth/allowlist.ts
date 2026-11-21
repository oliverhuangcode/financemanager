/**
 * Email allowlist for sign-in. Edge-safe: no Node-only imports, so the
 * middleware can use it too.
 *
 * ALLOWED_EMAILS is a comma-separated list, matched case-insensitively.
 * - Production: required. An empty list lets nobody in (fail closed).
 * - Development/test: an empty list lets any Google account in, for local work.
 */
export function parseAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isEmailAllowed(
  email: string | null | undefined,
  raw: string | undefined = process.env.ALLOWED_EMAILS,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  const allowed = parseAllowlist(raw);
  if (allowed.size === 0) return nodeEnv !== "production";
  if (!email) return false;
  return allowed.has(email.trim().toLowerCase());
}
