export const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  trustProxy: (process.env.TRUST_PROXY ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true',
  tls: {
    enabled: process.env.TLS_ENABLED === 'true',
    certPath: process.env.TLS_CERT_PATH,
    keyPath: process.env.TLS_KEY_PATH,
  },
  services: {
    auth: process.env.SERVICE_AUTH_URL ?? 'http://localhost:3001',
    profile: process.env.SERVICE_PROFILE_URL ?? 'http://localhost:3002',
    consent: process.env.SERVICE_CONSENT_URL ?? 'http://localhost:3003',
    session: process.env.SERVICE_SESSION_URL ?? 'http://localhost:3004',
    security: process.env.SERVICE_SECURITY_URL ?? 'http://localhost:3005',
  },
  inlineTokens: process.env.NODE_ENV === 'production'
    ? false
    : (process.env.INLINE_TOKEN_RESPONSE ?? 'true') === 'true',
  rateLimit: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX ?? '200', 10),
    },
    auth: {
      windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
    },
    token: {
      windowMs: parseInt(process.env.RATE_LIMIT_TOKEN_WINDOW_MS ?? '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_TOKEN_MAX ?? '30', 10),
    },
    api: {
      windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS ?? '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_API_MAX ?? '100', 10),
    },
  },
};
