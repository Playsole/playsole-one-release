/**
 * Fix #10 -- Open Redirect Prevention
 *
 * Validates a `return_to` / `returnTo` URL to ensure it only redirects to
 * same-origin destinations. Accepts:
 *   1. Relative paths that begin with "/" (same-origin by definition).
 *   2. Absolute URLs whose origin matches the configured GATEWAY_URL.
 *
 * Falls back to `fallback` (default "/profile") for any other value.
 */
export function validateReturnTo(raw: string | undefined, fallback = '/profile'): string {
  if (!raw) return fallback;

  // Allow relative paths -- they are always same-origin.
  // Disallow protocol-relative URLs (//evil.com) by requiring the second char != '/'.
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }

  // Allow absolute URLs only when the origin matches our gateway.
  const allowedOrigin = (process.env.GATEWAY_URL ?? '').replace(/\/$/, '');
  if (allowedOrigin) {
    try {
      const parsed = new URL(raw);
      const allowed = new URL(allowedOrigin);
      if (parsed.origin === allowed.origin) {
        return raw;
      }
    } catch {
      // Malformed URL -- fall through to fallback.
    }
  }

  return fallback;
}
