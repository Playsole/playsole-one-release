import { config } from './config';

type SameSite = 'strict' | 'lax' | 'none';

export function isSecureCookies(): boolean {
  return config.tls.enabled || process.env.COOKIE_SECURE === 'true';
}

export function ssoCookieDomain(): string | undefined {
  const domain = process.env.SSO_COOKIE_DOMAIN?.trim();
  return domain || undefined;
}

// A __Host- cookie also binds to the origin, but RFC 6265bis forbids the
// Domain attribute on __Host- cookies. When SSO_COOKIE_DOMAIN is active
// to share sessions across Playsole apps, we use __Secure- instead.
export function sessionCookieName(): string {
  if (ssoCookieDomain()) {
    return isSecureCookies() ? '__Secure-playsole_session' : 'playsole_session';
  }
  return isSecureCookies() ? '__Host-playsole_session' : 'playsole_session';
}

// Stable per-browser device identifier used for suspicious-activity detection.
export function deviceCookieName(): string {
  if (ssoCookieDomain()) {
    return isSecureCookies() ? '__Secure-playsole_device' : 'playsole_device';
  }
  return isSecureCookies() ? '__Host-playsole_device' : 'playsole_device';
}

export function sessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSite;
  path: string;
  maxAge: number;
  domain?: string;
} {
  const domain = ssoCookieDomain();
  const sameSite = (process.env.COOKIE_SAMESITE as SameSite) || 'lax';
  return {
    httpOnly: true,
    secure: isSecureCookies(),
    sameSite,
    path: '/',
    maxAge: 30 * 86400 * 1000,
    ...(domain ? { domain } : {}),
  };
}