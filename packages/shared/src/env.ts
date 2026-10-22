import { createLogger } from './logger';

const logger = createLogger('server');

const REQUIRED_PROD_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SESSION_SECRET',
  'INTERNAL_SHARED_SECRET',
  'JWT_PRIVATE_KEY',
  'JWT_PUBLIC_KEY',
  'OIDC_ISSUER',
] as const;

/**
 * Fail-fast guard for a production boot. Must run before any service listens.
 * TLS is terminated at the Cloudflare edge, so secure cookies and an https
 * issuer are enforced and inline token echoing is always disabled.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PROD_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }

  if (process.env.TLS_ENABLED === 'true' && (!process.env.TLS_CERT_PATH || !process.env.TLS_KEY_PATH)) {
    throw new Error('TLS_ENABLED=true requires TLS_CERT_PATH and TLS_KEY_PATH');
  }

  if (process.env.COOKIE_SECURE !== 'true') {
    throw new Error('COOKIE_SECURE must be "true" in production (TLS is terminated at the edge)');
  }

  if (process.env.OIDC_ISSUER && !process.env.OIDC_ISSUER.startsWith('https://')) {
    throw new Error('OIDC_ISSUER must be an https origin in production');
  }

  if (process.env.INLINE_TOKEN_RESPONSE === 'true') {
    logger.warn('INLINE_TOKEN_RESPONSE=true is ignored in production; tokens are never echoed');
  }

  if (process.env.SESSION_SECRET === 'change-me-to-a-random-string') {
    throw new Error('SESSION_SECRET must be changed in production');
  }

  if (process.env.INTERNAL_SHARED_SECRET === 'change-me-to-a-long-random-secret') {
    throw new Error('INTERNAL_SHARED_SECRET must be changed in production');
  }
}