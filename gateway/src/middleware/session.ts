import { Request, Response, NextFunction } from 'express';
import { internalSecretHeaders, isSupabaseTokenExpiring, refreshSupabaseSession, createLogger } from '@playsole-one/shared';
import { sessionCookieName } from '../cookies';
import { fetchWithTimeout } from '../bffClient';

const logger = createLogger('gateway:session');
const SESSION_SERVICE_URL = process.env.SERVICE_SESSION_URL ?? 'http://localhost:3004';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      supabaseAccessToken?: string;
      supabaseRefreshToken?: string;
      sessionId?: string;
      mfaPassed?: boolean;
    }
  }
}

interface CachedSession {
  session: {
    id: string; userId: string; tenantId: string; mfaPassed?: boolean; revokedAt?: string;
    supabaseAccessToken?: string; supabaseRefreshToken?: string;
  };
  fetchedAt: number;
}

const sessionCache = new Map<string, CachedSession>();
const SESSION_CACHE_TTL_MS = 10_000;
const MAX_SESSION_CACHE_SIZE = 5000;

export function invalidateSessionCache(sessionId?: string): void {
  if (sessionId) {
    sessionCache.delete(sessionId);
  } else {
    sessionCache.clear();
  }
}

/** Immediately store a freshly created session into memory cache. */
export function cacheSession(session: {
  id: string; userId: string; tenantId: string; mfaPassed?: boolean; revokedAt?: string;
  supabaseAccessToken?: string; supabaseRefreshToken?: string;
}): void {
  if (session?.id) {
    sessionCache.set(session.id, { session, fetchedAt: Date.now() });
  }
}

/** Remove all cached session entries belonging to a specific user. */
export function invalidateSessionCacheForUser(userId: string): void {
  for (const [key, value] of sessionCache.entries()) {
    if (value.session.userId === userId) {
      sessionCache.delete(key);
    }
  }
}


export async function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
  const sessionId =
    req.cookies?.[sessionCookieName()] ||
    req.cookies?.['__Secure-playsole_session'] ||
    req.cookies?.['__Host-playsole_session'] ||
    req.cookies?.['playsole_session'];
  if (sessionId) {
    try {
      const now = Date.now();
      let session: CachedSession['session'] | undefined;
      const cached = sessionCache.get(sessionId);

      if (cached && (now - cached.fetchedAt < SESSION_CACHE_TTL_MS) && (!cached.session.supabaseAccessToken || !isSupabaseTokenExpiring(cached.session.supabaseAccessToken))) {
        session = cached.session;
      } else {
        const res = await fetchWithTimeout(`${SESSION_SERVICE_URL}/sessions/${sessionId}`, {
          headers: internalSecretHeaders(),
        });
        if (res.ok) {
          const fetchedSession = await res.json() as CachedSession['session'];
          if (fetchedSession.revokedAt) {
            sessionCache.delete(sessionId);
            next();
            return;
          }
          session = fetchedSession;
          if (sessionCache.size >= MAX_SESSION_CACHE_SIZE) {
            const oldestKey = sessionCache.keys().next().value;
            if (oldestKey) sessionCache.delete(oldestKey);
          }
          sessionCache.set(sessionId, { session, fetchedAt: now });
        } else {
          sessionCache.delete(sessionId);
        }
      }

      if (session && !session.revokedAt) {
        // Supabase access tokens expire (~1h default) and there is no other
        // long-lived credential, so proactively refresh when the stored token
        // is missing or about to expire — otherwise user-scoped (RLS) queries
        // fail once the token is stale.
        let supabaseAccessToken = session.supabaseAccessToken;
        if (session.supabaseRefreshToken && isSupabaseTokenExpiring(supabaseAccessToken)) {
          const fresh = await refreshSupabaseSession(session.supabaseRefreshToken);
          if (fresh) {
            supabaseAccessToken = fresh.accessToken;
            session.supabaseAccessToken = fresh.accessToken;
            session.supabaseRefreshToken = fresh.refreshToken;
            sessionCache.set(sessionId, { session, fetchedAt: Date.now() });
            await fetchWithTimeout(`${SESSION_SERVICE_URL}/sessions/${session.id}/tokens`, {
              method: 'PATCH',
              headers: { ...internalSecretHeaders(), 'Content-Type': 'application/json' },
              body: JSON.stringify({
                supabaseAccessToken: fresh.accessToken,
                supabaseRefreshToken: fresh.refreshToken,
              }),
            }).catch(() => {});
          }
        }

        req.userId = session.userId;
        req.tenantId = session.tenantId;
        req.supabaseAccessToken = supabaseAccessToken;
        req.supabaseRefreshToken = session.supabaseRefreshToken;
        req.sessionId = session.id;
        req.mfaPassed = session.mfaPassed ?? false;
      }
    } catch (err) {
      logger.warn({ err, sessionId }, 'Session service lookup failed or unavailable');
    }
  }
  next();
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    const returnTo = req.originalUrl;
    res.redirect(302, `/login?return_to=${encodeURIComponent(returnTo)}`);
    return;
  }
  next();
}
