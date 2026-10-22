export const config = {
  port: parseInt(process.env.AUTH_PORT ?? '3001', 10),
  issuer:
    process.env.OIDC_ISSUER ||
    process.env.BASE_URL ||
    process.env.PUBLIC_ORIGIN ||
    process.env.PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === 'production' || process.env.CLOUDFLARE_WORKER === 'true'
      ? 'https://one.playsole.xyz'
      : 'http://localhost:8080'),
  accessTokenTtlSec: parseInt(process.env.ACCESS_TOKEN_TTL_SEC ?? '900', 10),
  refreshTokenTtlSec: parseInt(process.env.REFRESH_TOKEN_TTL_SEC ?? '2592000', 10),
  authCodeTtlSec: parseInt(process.env.AUTH_CODE_TTL_SEC ?? '600', 10),
  // Verification / magic-link tokens are delivered out-of-band (email). In
  // production they are NEVER returned in API responses; dev/demo and tests
  // set this true so the one-time token is echoed back for manual flows.
  inlineTokens: process.env.NODE_ENV === 'production'
    ? false
    : (process.env.INLINE_TOKEN_RESPONSE ?? 'true') === 'true',
  // Login attempt tracking / account lockout
  maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? '5', 10),
  lockoutMs: parseInt(process.env.LOCKOUT_MS ?? '900000', 10), // 15 min
  lockoutWindowMs: parseInt(process.env.LOCKOUT_WINDOW_MS ?? '900000', 10), // 15 min
};
