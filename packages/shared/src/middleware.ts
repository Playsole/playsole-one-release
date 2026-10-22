import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

export const INTERNAL_SECRET_HEADER = 'x-internal-shared-secret';
const DEFAULT_INTERNAL_SECRET = 'dev-internal-shared-secret';

export function getInternalSecret(): string {
  return process.env.INTERNAL_SHARED_SECRET ?? DEFAULT_INTERNAL_SECRET;
}

/**
 * Express middleware that rejects requests which did not come from the
 * gateway. Backend services must never trust identity headers
 * (x-authenticated-user-id / x-tenant-id) supplied by unauthenticated callers;
 * only the server-side gateway knows the secret and forwards it on every
 * proxied call.
 */
export const requireInternalSecret: RequestHandler = (req, res, next) => {
  const provided = req.headers[INTERNAL_SECRET_HEADER];
  const expected = Buffer.from(getInternalSecret());
  if (
    typeof provided === 'string' &&
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), expected)
  ) {
    next();
    return;
  }
  res.status(401).json({ error: 'unauthorized', error_description: 'Blocked by internal gateway.' });
};

export function internalSecretHeaders(): Record<string, string> {
  return { [INTERNAL_SECRET_HEADER]: getInternalSecret() };
}

export interface ApiVersioningOptions {
  version?: string;
  deprecated?: boolean;
  sunsetDate?: string; // RFC 7231 or ISO date string
  deprecationLink?: string;
}

/**
 * Standard API versioning & deprecation header middleware.
 * Implements RFC 8594 Sunset & Deprecation headers for clear developer contract.
 */
export function apiVersioningMiddleware(options: ApiVersioningOptions = {}): RequestHandler {
  const version = options.version ?? '1.0';
  return (req, res, next) => {
    res.setHeader('X-API-Version', version);

    if (options.deprecated) {
      res.setHeader('Deprecation', '@' + Math.floor(Date.now() / 1000));
      if (options.sunsetDate) {
        const sunsetDateObj = new Date(options.sunsetDate);
        res.setHeader('Sunset', sunsetDateObj.toUTCString());
      }
      if (options.deprecationLink) {
        res.setHeader('Link', `<${options.deprecationLink}>; rel="deprecation"`);
      }
    }

    next();
  };
}