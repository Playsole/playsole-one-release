/**
 * Fix #11 -- CSRF Protection (Double-Submit Cookie Pattern)
 *
 * Generates a random token, stores it in a SameSite=Strict cookie, and
 * verifies that the same token is present in the request body (as _csrf).
 * This prevents cross-site form submission attacks on destructive POST endpoints.
 */
import { randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '@playsole-one/shared';

const logger = createLogger('gateway:csrf');
const CSRF_COOKIE = 'playsole_csrf';
const CSRF_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Generates a CSRF token, sets the cookie, and returns the token value for embedding in forms. */
export function generateCsrfToken(req: Request, res: Response): string {
  // Reuse existing token if the cookie is already set and valid.
  const existing = req.cookies?.[CSRF_COOKIE];
  if (existing && typeof existing === 'string' && existing.length >= 32) {
    return existing;
  }

  const token = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by our own form pages
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: CSRF_TTL_MS,
    path: '/',
  });
  return token;
}

/** Middleware: verifies that req.body._csrf or x-csrf-token matches the cookie token. */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const bodyToken = (req.body?._csrf || req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) as string | undefined;

  if (!cookieToken || !bodyToken || cookieToken !== bodyToken) {
    logger.warn({ ip: req.ip, path: req.path }, 'CSRF token mismatch -- request rejected');
    res.status(403).send('Invalid or missing CSRF token. Please reload the page and try again.');
    return;
  }

  next();
}
