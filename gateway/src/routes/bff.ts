import express, { Router, Request, Response } from 'express';
import http from 'node:http';
import crypto, { randomUUID } from 'node:crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { loginPage, registerPage, magicLinkSentPage, consentPage, consentManagementPage, profilePage, verifyEmailPage, verifyPhonePage, mfaChallengePage, mfaSetupRequiredPage, securityPage, recoveryRequestPage, recoveryEmailSentPage, recoveryConfirmPage, recoveryResetDonePage, dashboardPage, DeveloperApp } from '../views';
import { renderDevelopersView } from '../developersView';
import {
  loginUser, registerUser, createSession, updateSessionTokens, deleteSession, markSessionMfaPassed,
  checkConsent, createConsentGrant, upsertConsentGrant, getProfile, updateProfile, getGrants, revokeGrant,
  sendMagicLink, verifyMagicLink, sendPhoneVerification, confirmPhone, verifyEmailOtp, resendEmailOtp,
  getMfaStatus, verifyTotpChallenge, verifyBackupCode, webauthnAuthOptions, webauthnAuthenticate, reportDevice,
  beginTotpEnrollment, confirmTotpEnrollment, removeTotpMethod,
  webauthnRegisterOptions, webauthnRegister, removeWebAuthnCredential,
  generateBackupCodes, getDevices, setDeviceTrusted, removeDevice,
  getSessions, revokeSession,
  requestEmailRecovery, consumeRecoveryToken, resetMfaForRecovery,
} from '../bffClient';
import { internalSecretHeaders, getSupabase, getStateStore, createLogger, audit, dispatchToExpress, getInternalService, cleanIp, formatUserAgent, formatDeviceLabel, getClientIp, detectCountry, detectCountrySync } from '@playsole-one/shared';
import { config } from '../config';
import { sessionCookieName, sessionCookieOptions, deviceCookieName, ssoCookieDomain } from '../cookies';
import { authRateLimit, apiRateLimit } from '../middleware/rateLimit';
import { invalidateSessionCache, cacheSession } from '../middleware/session';
import { validateReturnTo } from '../utils/returnTo';
import { verifyCsrf, generateCsrfToken } from '../middleware/csrf';

const logger = createLogger('gateway');

const router = Router();

// Body parsing scoped only to routes that need it — NOT globally, so proxy routes
// can still pipe the raw request body to downstream services.
router.use('/login', express.urlencoded({ extended: false }));
router.use('/register', express.urlencoded({ extended: false }));
router.use('/consent', express.urlencoded({ extended: false }));
router.use('/profile', express.urlencoded({ extended: false }));
router.use('/verify-email', express.urlencoded({ extended: false }));
router.use('/verify-phone', express.urlencoded({ extended: false }));
router.use('/verify-email/otp', express.urlencoded({ extended: false }));
router.use('/verify-email/resend', express.urlencoded({ extended: false }));
router.use('/mfa', express.urlencoded({ extended: false }));
router.use('/security', express.urlencoded({ extended: false }));
router.use('/recovery', express.urlencoded({ extended: false }));
// Fix #2: WebAuthn endpoints receive JSON from the browser's fetch() calls.
router.use('/api/mfa/webauthn', express.json());
router.use('/security/webauthn', express.json());

// Pending authorization requests and MFA step-up logins are parked in the
// shared state store (Redis in production, in-memory in dev) so they survive
// the login/register HTML flow and any gateway restart.
const stateStore = getStateStore();
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
const PENDING_MFA_TTL_MS = 10 * 60 * 1000;

// Login step-up: after a successful password/magic-link check we do NOT create
// the session yet if the user has MFA enabled — we park their verified
// credentials here and finish the login once the second factor passes.
interface PendingMfa {
  userId: string;
  tenantId: string;
  supabaseAccessToken?: string;
  supabaseRefreshToken?: string;
  returnTo: string;
  hasWebAuthn: boolean;
  hasTotp: boolean;
  hasBackupCodes: boolean;
  createdAt: number;
  // When set, the user already has an active session and this is a step-up for
  // a client that requires MFA — we mark the existing session instead of
  // creating a new one.
  stepUp?: boolean;
  sessionId?: string;
}

// Suspicious-activity alerts surfaced to the user on the security page.
interface RiskAlert {
  id: string;
  signals: string[];
  deviceLabel: string;
  at: number;
  seen: boolean;
}
const RISK_ALERT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RISK_ALERT_LIMIT = 10;

const SIGNAL_LABELS: Record<string, string> = {
  new_device: 'A new device was used to sign in',
  new_ip: 'Sign-in from a new IP address',
  new_location: 'Sign-in from a new location',
  new_city: 'Sign-in from a new city',
  impossible_travel: 'Sign-in from a location that conflicts with recent activity',
  untrusted_device: 'Sign-in from an untrusted device',
};

function getPendingMfa(id: string | undefined): Promise<PendingMfa | null> {
  if (!id) return Promise.resolve(null);
  return stateStore.getJson<PendingMfa>(`pending-mfa:${id}`);
}

async function getPendingAuth(id: string | undefined): Promise<{ originalUrl: string; createdAt: number } | null> {
  if (!id) return null;
  return stateStore.getJson<{ originalUrl: string; createdAt: number }>(`pending-auth:${id}`);
}

async function consumePendingAuth(id: string | undefined): Promise<{ originalUrl: string; createdAt: number } | null> {
  if (!id) return null;
  const pending = await getPendingAuth(id);
  if (pending) await stateStore.del(`pending-auth:${id}`);
  return pending;
}

interface RiskAlertRow {
  id: string;
  signals: string[];
  device_label: string;
  at: string;
  seen: boolean;
}

async function listRiskAlerts(userId: string): Promise<RiskAlert[]> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - RISK_ALERT_RETENTION_MS).toISOString();
  const { data } = await supabase
    .from('risk_alerts')
    .select('id, signals, device_label, at, seen')
    .eq('user_id', userId)
    .gte('at', since)
    .order('at', { ascending: false })
    .limit(RISK_ALERT_LIMIT);
  return (data ?? []).map((row: RiskAlertRow) => ({
    id: row.id,
    signals: row.signals ?? [],
    deviceLabel: row.device_label,
    at: new Date(row.at).getTime(),
    seen: row.seen,
  }));
}

async function createRiskAlert(userId: string, tenantId: string, alert: RiskAlert): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('risk_alerts').insert({
    id: alert.id,
    user_id: userId,
    tenant_id: tenantId,
    signals: alert.signals,
    device_label: alert.deviceLabel,
    at: new Date(alert.at).toISOString(),
    seen: alert.seen,
  });
}

async function dismissRiskAlert(userId: string, alertId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('risk_alerts').update({ seen: true }).eq('id', alertId).eq('user_id', userId);
}

async function completeMfaLogin(req: Request, res: Response, pendingId: string): Promise<string | null> {
  const pending = await getPendingMfa(pendingId);
  if (!pending) return null;
  await stateStore.del(`pending-mfa:${pendingId}`);

  if (pending.stepUp && pending.sessionId) {
    await markSessionMfaPassed(pending.sessionId);
  } else {
    const session = await createSession(
      pending.userId,
      pending.tenantId,
      pending.supabaseAccessToken,
      pending.supabaseRefreshToken,
      { mfaPassed: true, ipAddress: getClientIp(req), userAgent: req.get('user-agent') },
    );
    res.cookie(sessionCookieName(), session.id, sessionCookieOptions());
  }

  await trackUserDevice(req, res, pending.userId, pending.tenantId, pending.supabaseAccessToken);

  return pending.returnTo;
}

async function trackUserDevice(
  req: Request,
  res: Response,
  userId: string,
  tenantId: string,
  supabaseAccessToken?: string,
): Promise<void> {
  const ipAddress = getClientIp(req);
  const userAgent = req.get('user-agent') || '';
  const deviceId = req.cookies?.[deviceCookieName()];
  const fingerprint = deviceId ?? randomUUID();
  if (!deviceId) {
    res.cookie(deviceCookieName(), fingerprint, { ...sessionCookieOptions(), maxAge: 365 * 86400 * 1000 });
  }
  try {
    const label = formatDeviceLabel(userAgent);
    const country = detectCountrySync(req);
    const reported = await reportDevice(userId, tenantId, {
      fingerprint,
      label,
      userAgent,
      ipAddress,
      country,
    }, supabaseAccessToken);
    if (reported.riskSignals.length > 0) {
      await createRiskAlert(userId, tenantId, {
        id: randomUUID(),
        signals: reported.riskSignals,
        deviceLabel: reported.device?.label ?? label,
        at: Date.now(),
        seen: false,
      });
    }
  } catch { /* non-fatal */ }
}

async function startMfaStepUp(
  req: Request,
  res: Response,
  ctx: { userId: string; tenantId: string; supabaseAccessToken?: string; supabaseRefreshToken?: string; returnTo: string },
): Promise<boolean> {
  const status = await getMfaStatus(ctx.userId, ctx.tenantId, ctx.supabaseAccessToken);
  if (status.hasMfa) {
    const pendingId = randomUUID();
    await stateStore.setJsonWithTtl(`pending-mfa:${pendingId}`, {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      supabaseAccessToken: ctx.supabaseAccessToken,
      supabaseRefreshToken: ctx.supabaseRefreshToken,
      returnTo: ctx.returnTo,
      hasWebAuthn: status.methods.some((m) => m.type === 'webauthn'),
      hasTotp: status.methods.some((m) => m.type === 'totp'),
      hasBackupCodes: status.backupCodes.total > 0,
      createdAt: Date.now(),
    }, PENDING_MFA_TTL_MS);
    res.redirect(302, `/mfa/challenge?id=${pendingId}`);
    return true;
  }
  return false;
}

// Step-up for an already-logged-in user whose session predates MFA or who is
// now accessing a client whose policy requires MFA.
async function startMfaStepUpForSession(req: Request, res: Response, clientId?: string): Promise<boolean> {
  if (!req.userId || !req.sessionId || req.mfaPassed) return false;
  const status = await getMfaStatus(req.userId, req.tenantId, req.supabaseAccessToken);
  const mfaRequired = clientId ? await getClientMfaPolicy(req.userId, req.tenantId, clientId) : status.mfaRequired;
  if (!mfaRequired) return false;
  if (!status.hasMfa) {
    res.send(mfaSetupRequiredPage(clientId));
    return true;
  }
  const pendingId = randomUUID();
  await stateStore.setJsonWithTtl(`pending-mfa:${pendingId}`, {
    userId: req.userId,
    tenantId: req.tenantId ?? '00000000-0000-0000-0000-000000000001',
    supabaseAccessToken: req.supabaseAccessToken ?? '',
    supabaseRefreshToken: req.supabaseRefreshToken ?? '',
    returnTo: req.originalUrl,
    hasWebAuthn: status.methods.some((m) => m.type === 'webauthn'),
    hasTotp: status.methods.some((m) => m.type === 'totp'),
    hasBackupCodes: status.backupCodes.total > 0,
    createdAt: Date.now(),
    stepUp: true,
    sessionId: req.sessionId,
  }, PENDING_MFA_TTL_MS);
  res.redirect(302, `/mfa/challenge?id=${pendingId}`);
  return true;
}

async function getClientMfaPolicy(userId: string, tenantId: string | undefined, clientId: string): Promise<boolean> {
  const status = await getMfaStatus(userId, tenantId, undefined, clientId);
  return status.mfaRequired;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files (JPG, PNG, GIF, WebP) are allowed.'));
    }
    cb(null, true);
  },
});

function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string): string {
  try {
    if (typeof cloudinary?.utils?.api_sign_request === 'function') {
      return cloudinary.utils.api_sign_request(params, apiSecret);
    }
  } catch {
    // Fallback to manual computation
  }
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



router.get('/login', async (req, res) => {
  const pendingAuthId = req.query.pending_auth as string | undefined;
  const error = req.query.error as string | undefined;
  const message = (req.query.message ?? req.query.magic_link_sent) as string | undefined;
  let returnTo = '/profile';
  if (pendingAuthId) {
    const pending = await getPendingAuth(pendingAuthId);
    if (pending) returnTo = pending.originalUrl;
  } else {
    returnTo = validateReturnTo((req.query.return_to as string) ?? '/dashboard');
  }

  // Auto sign-in / Account Chooser (Phase 7): If already authenticated and not explicitly
  // prompting for re-login, show the Account Chooser UI so they can continue with 1 click.
  if (req.userId && req.query.prompt !== 'login') {
    res.redirect(302, `/sso/chooser?return_to=${encodeURIComponent(returnTo)}`);
    return;
  }

  res.send(loginPage(returnTo, pendingAuthId, error, message));
});


router.post('/login', authRateLimit, async (req, res) => {
  const { email, password, return_to, pending_auth } = req.body;

  let returnTo = '/profile';
  if (pending_auth) {
    const pending = await consumePendingAuth(pending_auth);
    if (pending) {
      returnTo = pending.originalUrl;
    }
  } else if (return_to) {
    // Fix #10: validate return_to to prevent open redirect attacks.
    returnTo = validateReturnTo(return_to);
  }

  if (!email || !password) {
    res.status(400).send(loginPage(returnTo, pending_auth, 'Email and password are required.'));
    return;
  }

  try {
    const result = await loginUser(email, password, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    if ('error' in result) {
      // Email not yet confirmed — send the user to the OTP page so they can
      // finish verification instead of a dead-end error.
      if (result.error === 'email_not_confirmed') {
        res.redirect(302, `/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      if (result.error === 'account_suspended' || result.error === 'account_disabled') {
        res.status(403).send(loginPage(returnTo, pending_auth, result.errorDescription));
        return;
      }
      res.status(401).send(loginPage(returnTo, pending_auth, result.errorDescription));
      return;
    }

    if (await startMfaStepUp(req, res, {
      userId: result.userId,
      tenantId: result.tenantId,
      supabaseAccessToken: result.supabaseAccessToken,
      supabaseRefreshToken: result.supabaseRefreshToken,
      returnTo,
    })) return;

    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent');
    const session = await createSession(result.userId, result.tenantId, result.supabaseAccessToken, result.supabaseRefreshToken, {
      mfaPassed: false,
      ipAddress,
      userAgent,
    });
    cacheSession(session);
    res.cookie(sessionCookieName(), session.id, sessionCookieOptions());
    await trackUserDevice(req, res, result.userId, result.tenantId, result.supabaseAccessToken);
    res.redirect(302, returnTo);
  } catch (err: any) {
    logger.error({ err }, 'login failed');
    const message = err?.message?.includes('timed out')
      ? 'Login is taking too long — please check that the auth service is running and try again.'
      : 'An unexpected error occurred during login. Please try again.';
    res.status(502).send(loginPage(returnTo, pending_auth, message));
  }
});

router.get('/register', async (req, res) => {
  const pendingAuthId = req.query.pending_auth as string | undefined;
  let returnTo = '/profile';
  if (pendingAuthId) {
    const pending = await getPendingAuth(pendingAuthId);
    if (pending) returnTo = pending.originalUrl;
  } else {
    returnTo = validateReturnTo((req.query.return_to as string) ?? '/dashboard');
  }
  res.send(registerPage(returnTo, pendingAuthId));
});

router.post('/register', authRateLimit, async (req, res) => {
  const { name, email, password, return_to, pending_auth } = req.body;

  let returnTo = '/profile';
  if (pending_auth) {
    const pending = await consumePendingAuth(pending_auth);
    if (pending) {
      returnTo = pending.originalUrl;
    }
  } else if (return_to) {
    // Fix #10: validate return_to to prevent open redirect attacks.
    returnTo = validateReturnTo(return_to);
  }

  if (!name || !email || !password) {
    res.status(400).send(registerPage(returnTo, pending_auth, 'All fields are required.'));
    return;
  }

  if (password.length < 8) {
    res.status(400).send(registerPage(returnTo, pending_auth, 'Password must be at least 8 characters.'));
    return;
  }

  try {
    const userCountry = await detectCountry(req);
    const result = await registerUser(name, email, password, userCountry);
    if ('error' in result) {
      res.status(409).send(registerPage(returnTo, pending_auth, result.errorDescription));
      return;
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent');
    const session = await createSession(result.userId, result.tenantId, result.supabaseAccessToken, result.supabaseRefreshToken, {
      mfaPassed: false,
      ipAddress,
      userAgent,
    });
    cacheSession(session);
    res.cookie(sessionCookieName(), session.id, sessionCookieOptions());
    await trackUserDevice(req, res, result.userId, result.tenantId, result.supabaseAccessToken);

    // Fix #7: Pass returnTo through so the user is sent back to the right place
    // after email verification, instead of stranding them at /profile.
    res.redirect(302, `/verify-email?return_to=${encodeURIComponent(returnTo)}`);
  } catch (err: any) {
    logger.error({ err }, 'register failed');
    const message = err?.message?.includes('timed out')
      ? 'Signup is taking too long — please check that the auth service is running and try again.'
      : 'An unexpected error occurred during signup. Please try again.';
    res.status(502).send(registerPage(returnTo, pending_auth, message));
  }
});

router.post('/login/magic-link', authRateLimit, async (req, res) => {
  const { email, return_to, pending_auth } = req.body;

  let returnTo = '/profile';
  if (pending_auth) {
    const pending = await getPendingAuth(pending_auth);
    if (pending) returnTo = pending.originalUrl;
  } else if (return_to) {
    // Fix #10: validate return_to to prevent open redirect attacks.
    returnTo = validateReturnTo(return_to);
  }

  if (!email) {
    res.status(400).send(loginPage(returnTo, pending_auth, 'Email is required.'));
    return;
  }

  const result = await sendMagicLink(email, returnTo);
  if ('error' in result) {
    res.status(400).send(loginPage(returnTo, pending_auth, result.errorDescription));
    return;
  }

  res.send(magicLinkSentPage(returnTo, email, pending_auth, result.token));
});

router.get('/magic-link/verify', async (req, res) => {
  const token = req.query.token as string | undefined;

  if (!token) {
    res.status(400).send('Missing token parameter.');
    return;
  }

  const result = await verifyMagicLink(token);
  if ('error' in result) {
    res.status(400).send(loginPage('/authorize', undefined, result.errorDescription));
    return;
  }

  const returnTo = result.returnTo && result.returnTo.startsWith('/') ? result.returnTo : '/profile';
  if (await startMfaStepUp(req, res, {
    userId: result.userId,
    tenantId: result.tenantId,
    supabaseAccessToken: result.supabaseAccessToken,
    supabaseRefreshToken: result.supabaseRefreshToken,
    returnTo,
  })) return;

  const ipAddress = getClientIp(req);
  const userAgent = req.get('user-agent');
  const session = await createSession(result.userId, result.tenantId, result.supabaseAccessToken, result.supabaseRefreshToken, { mfaPassed: false, ipAddress, userAgent });
  res.cookie(sessionCookieName(), session.id, sessionCookieOptions());
  await trackUserDevice(req, res, result.userId, result.tenantId, result.supabaseAccessToken);
  res.redirect(302, returnTo);
});

router.get('/verify-email', async (req, res) => {
  const queryEmail = req.query.email as string | undefined;
  // Fix #7: propagate return_to through the email verification step.
  // Fix #10: validate to prevent open redirect.
  const returnTo = validateReturnTo(req.query.return_to as string | undefined);

  // Fix #6: If the link in the email includes a ?token= query param, auto-verify
  // it immediately instead of showing the OTP entry form.
  if (req.query.token) {
    const token = req.query.token as string;
    const result = await verifyMagicLink(token);
    if ('error' in result) {
      res.redirect(302, `/verify-email?error=${encodeURIComponent(result.errorDescription)}&return_to=${encodeURIComponent(returnTo)}`);
      return;
    }
    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent');
    const session = await createSession(result.userId, result.tenantId, result.supabaseAccessToken, result.supabaseRefreshToken, { mfaPassed: false, ipAddress, userAgent });
    res.cookie(sessionCookieName(), session.id, sessionCookieOptions());
    await trackUserDevice(req, res, result.userId, result.tenantId, result.supabaseAccessToken);
    res.redirect(302, returnTo.startsWith('/') ? returnTo : '/profile');
    return;
  }

  if (!req.userId) {
    // No session (e.g. arriving from an "email not confirmed" login attempt):
    // render the OTP form directly with the email if one was provided.
    if (queryEmail) {
      res.send(verifyEmailPage(queryEmail, '', undefined, true, returnTo));
      return;
    }
    res.redirect(302, `/login?return_to=${encodeURIComponent('/verify-email')}`);
    return;
  }

  const profile = await getProfile(req.userId, req.tenantId, req.supabaseAccessToken);
  if (profile?.emailVerified) {
    res.redirect(302, returnTo.startsWith('/') ? returnTo : '/profile');
    return;
  }
  res.send(verifyEmailPage(profile?.email ?? queryEmail ?? '', '', undefined, true, returnTo));
});

router.post('/verify-email', authRateLimit, async (req, res) => {
  if (!req.userId) {
    // Fix #14: expired session — redirect to login instead of showing raw JSON
    res.redirect(302, `/login?return_to=${encodeURIComponent('/verify-email')}&error=${encodeURIComponent('Your session expired. Please sign in again.')}`);
    return;
  }

  const profile = await getProfile(req.userId, req.tenantId, req.supabaseAccessToken);
  if (!profile || profile.emailVerified) {
    res.redirect(302, '/profile');
    return;
  }

  const result = await resendEmailOtp(profile.email);
  if ('error' in result) {
    res.send(verifyEmailPage(profile.email, '', result.errorDescription, true));
    return;
  }

  res.send(verifyEmailPage(profile.email, '', undefined, true));
});

router.get('/verify-email/confirm', async (req, res) => {
  // Legacy token-based confirmation — redirect to OTP form
  res.redirect(302, '/verify-email');
});

router.post('/verify-email/otp', authRateLimit, async (req, res) => {
  const { email, token, return_to } = req.body;
  // Fix #7: carry return_to through OTP confirmation.
  const returnTo = (return_to as string) || '/profile';
  const cleanToken = typeof token === 'string' ? token.trim().replace(/\s+/g, '') : token;

  if (!email || !cleanToken) {
    res.status(400).send(verifyEmailPage(email ?? '', '', 'Email and code are required.', true, returnTo));
    return;
  }

  const result = await verifyEmailOtp(email, cleanToken);
  if ('error' in result) {
    res.send(verifyEmailPage(email, '', result.errorDescription, true, returnTo));
    return;
  }

  // Email confirmed — attach the fresh Supabase session to the existing
  // Playsole session so the user is logged in without re-entering credentials.
  const sessionId = req.cookies?.[sessionCookieName()];
  if (sessionId) {
    try {
      await updateSessionTokens(sessionId, result.supabaseAccessToken, result.supabaseRefreshToken);
      res.redirect(302, returnTo.startsWith('/') ? returnTo : '/profile');
      return;
    } catch {
      // Non-fatal: fall through to login.
    }
  }

  // No valid session to attach tokens to (e.g. came from a login attempt
  // without a session cookie) — send the user to log in with their password.
  res.redirect(302, `/login?return_to=${encodeURIComponent(returnTo.startsWith('/') ? returnTo : '/profile')}`);
});

router.post('/verify-email/resend', authRateLimit, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).send(verifyEmailPage('', '', 'Email is required.', true));
    return;
  }

  const result = await resendEmailOtp(email);
  if ('error' in result) {
    res.send(verifyEmailPage(email, '', result.errorDescription, true));
    return;
  }

  res.send(verifyEmailPage(email, '', undefined, true));
});

router.get('/verify-phone', async (req, res) => {
  if (!req.userId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/verify-phone')}`);
    return;
  }
  res.send(verifyPhonePage(''));
});

router.post('/verify-phone', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const phone = (req.body.phone as string)?.trim();
  if (!phone) {
    res.send(verifyPhonePage('', 'Phone number is required.'));
    return;
  }

  const result = await sendPhoneVerification(req.userId, phone, req.tenantId);
  if ('error' in result) {
    res.send(verifyPhonePage(phone, result.errorDescription));
    return;
  }

  res.send(verifyPhonePage(phone, undefined, config.inlineTokens ? result.token : undefined));
});

router.post('/verify-phone/confirm', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const code = (req.body.code as string)?.trim().replace(/\s+/g, '');
  if (!code) {
    res.send(verifyPhonePage('', 'Verification code is required.'));
    return;
  }

  const result = await confirmPhone(req.userId, code, req.tenantId);
  if ('error' in result) {
    res.send(verifyPhonePage('', result.errorDescription));
    return;
  }

  res.redirect(302, '/profile');
});

router.get('/mfa/challenge', async (req, res) => {
  try {
    const pendingId = req.query.id as string | undefined;
    const pending = await getPendingMfa(pendingId);
    if (!pending) {
      res.redirect(302, `/login?return_to=${encodeURIComponent('/profile')}`);
      return;
    }
    res.send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes));
  } catch (err: any) {
    logger.error({ err }, 'failed to render MFA challenge');
    res.redirect(302, `/login?return_to=${encodeURIComponent('/profile')}`);
  }
});

router.post('/mfa/challenge', authRateLimit, async (req, res) => {
  const pendingId = req.body.pending_mfa as string | undefined;
  const code = (req.body.code as string)?.trim().replace(/\s+/g, '');
  const pending = await getPendingMfa(pendingId);
  if (!pending) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/profile')}`);
    return;
  }
  if (!code) {
    res.send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes, 'Enter the code from your authenticator app.'));
    return;
  }

  const result = await verifyTotpChallenge(pending.userId, code, pending.tenantId);
  if ('error' in result) {
    res.send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes, result.errorDescription));
    return;
  }

  try {
    const returnTo = await completeMfaLogin(req, res, pendingId!);
    res.redirect(302, returnTo ?? '/profile');
  } catch (err: any) {
    logger.error({ err }, 'MFA login failed');
    res.status(502).send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes, 'Could not finish sign-in — please try again.'));
  }
});

router.post('/mfa/backup-code', authRateLimit, async (req, res) => {
  const pendingId = req.body.pending_mfa as string | undefined;
  const code = (req.body.code as string)?.trim().replace(/\s+/g, '');
  const pending = await getPendingMfa(pendingId);
  if (!pending) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/profile')}`);
    return;
  }
  if (!code) {
    res.send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes, 'Enter a backup code.', 'backup'));
    return;
  }

  const result = await verifyBackupCode(pending.userId, code, pending.tenantId);
  if ('error' in result) {
    res.send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes, result.errorDescription, 'backup'));
    return;
  }

  try {
    const returnTo = await completeMfaLogin(req, res, pendingId!);
    res.redirect(302, returnTo ?? '/profile');
  } catch (err: any) {
    logger.error({ err }, 'MFA backup-code login failed');
    res.status(502).send(mfaChallengePage(pendingId!, pending.hasWebAuthn, pending.hasTotp, pending.hasBackupCodes, 'Could not finish sign-in — please try again.', 'backup'));
  }
});

// WebAuthn step-up (JSON — driven by the challenge page).
router.post('/api/mfa/webauthn/authenticate/options', apiRateLimit, async (req, res) => {
  const pendingId = req.body.pending_mfa as string | undefined;
  const pending = await getPendingMfa(pendingId);
  if (!pending) {
    res.status(401).json({ error: 'invalid_request', error_description: 'Session expired — sign in again.' });
    return;
  }
  try {
    const options = await webauthnAuthOptions(pending.userId, pending.tenantId);
    res.json({ ...options, pending_mfa: pendingId });
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', error_description: err?.message ?? 'Failed to start passkey check.' });
  }
});

router.post('/api/mfa/webauthn/authenticate', apiRateLimit, async (req, res) => {
  const pendingId = req.body.pending_mfa as string | undefined;
  const pending = await getPendingMfa(pendingId);
  if (!pending) {
    res.status(401).json({ error: 'invalid_request', error_description: 'Session expired — sign in again.' });
    return;
  }

  const result = await webauthnAuthenticate(pending.userId, req.body.response, pending.tenantId);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }

  try {
    const returnTo = await completeMfaLogin(req, res, pendingId!);
    res.json({ ok: true, redirect: returnTo ?? '/profile' });
  } catch (err: any) {
    logger.error({ err }, 'WebAuthn MFA login failed');
    res.status(502).json({ error: 'server_error', error_description: 'Could not finish sign-in — please try again.' });
  }
});

router.get('/authorize', authRateLimit, async (req, res) => {
  const prompt = req.query.prompt as string | undefined;

  if (!req.userId) {
    if (prompt === 'none') {
      const redirectUri = req.query.redirect_uri as string | undefined;
      const state = req.query.state as string | undefined;
      if (redirectUri && (redirectUri.startsWith('http://') || redirectUri.startsWith('https://'))) {
        const sep = redirectUri.includes('?') ? '&' : '?';
        const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
        res.redirect(302, `${redirectUri}${sep}error=login_required&error_description=${encodeURIComponent('No active Playsole session')}${stateParam}`);
        return;
      }
      res.status(400).json({ error: 'login_required', error_description: 'No active Playsole session' });
      return;
    }

    const id = randomUUID();
    await stateStore.setJsonWithTtl(`pending-auth:${id}`, { originalUrl: req.originalUrl, createdAt: Date.now() }, PENDING_AUTH_TTL_MS);
    res.redirect(302, `/login?pending_auth=${id}`);
    return;
  }

  const clientId = req.query.client_id as string | undefined;
  const scope = (req.query.scope as string) ?? 'openid';

  if (clientId) {
    // If client specifically requested account selection, show Account Chooser
    if (prompt === 'select_account') {
      res.redirect(302, `/sso/chooser?client_id=${encodeURIComponent(clientId)}&return_to=${encodeURIComponent(req.originalUrl.replace(/([?&])prompt=select_account(&|$)/, '$1').replace(/[?&]$/, ''))}`);
      return;
    }

    // Enforce the client's MFA policy before consent/authorization. If this
    // session has not completed MFA yet, send the user through the step-up
    // challenge (or ask them to set up MFA if they have no methods).
    if (!req.mfaPassed && await getClientMfaPolicy(req.userId, req.tenantId, clientId)) {
      if (await startMfaStepUpForSession(req, res, clientId)) return;
    }

    // Determine if this is a first-party Playsole client (auto sign-in, bypass consent)
    let isFirstParty = clientId === 'playsole-dev' || clientId.startsWith('playsole-');
    if (!isFirstParty) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.from('clients').select('first_party').eq('client_id', clientId).maybeSingle();
        if (data?.first_party) isFirstParty = true;
      } catch {
        // Non-blocking fallback
      }
    }

    if (!isFirstParty) {
      const result = await checkConsent(req.userId, clientId, scope, req.tenantId, req.supabaseAccessToken);
      if (!result.granted) {
        if (prompt === 'none') {
          const redirectUri = req.query.redirect_uri as string | undefined;
          const state = req.query.state as string | undefined;
          if (redirectUri && (redirectUri.startsWith('http://') || redirectUri.startsWith('https://'))) {
            const sep = redirectUri.includes('?') ? '&' : '?';
            const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
            res.redirect(302, `${redirectUri}${sep}error=consent_required&error_description=${encodeURIComponent('Consent is required')}${stateParam}`);
            return;
          }
          res.status(400).json({ error: 'consent_required', error_description: 'Consent is required' });
          return;
        }

        // Fix #4: store the raw (un-encoded) query string so POST /consent can
        // parse it directly with URLSearchParams, avoiding a double-encoding bug.
        const authorizeParams = req.originalUrl.replace('/authorize', '');
        const profile = await getProfile(req.userId, req.tenantId, req.supabaseAccessToken).catch(() => null);
        let clientAppName: string | undefined;
        try {
          const supabase = getSupabase();
          const { data: cRow } = await supabase.from('clients').select('app_name').eq('client_id', clientId).maybeSingle();
          if (cRow?.app_name) clientAppName = cRow.app_name;
        } catch {}

        res.send(consentPage(clientId, scope.split(' ').filter(Boolean), authorizeParams, undefined, {
          userId: req.userId,
          displayName: profile?.displayName,
          email: profile?.email,
          avatarUrl: profile?.avatarUrl,
        }, clientAppName));
        return;
      }
    }
  } else {
    res.redirect(302, '/profile');
    return;
  }


  const target = config.services.auth;
  const url = new URL(req.originalUrl, target);
  const headers: Record<string, string> = {
    host: new URL(target).host,
    'x-authenticated-user-id': req.userId!,
    'x-request-id': String((req as any).id ?? ''),
    ...internalSecretHeaders(),
  };
  if (req.tenantId) headers['x-tenant-id'] = req.tenantId;
  for (const [key, value] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (lower === 'cookie' || lower === 'content-length') continue;
    if (lower === 'x-authenticated-user-id' || lower === 'x-tenant-id') continue;
    if (typeof value === 'string') headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value.join(', ');
  }

  if (process.env.SERVICES_IN_PROCESS === 'true' || process.env.CLOUDFLARE_WORKER === 'true') {
    try {
      const authApp = getInternalService('auth');
      if (authApp) {
        const response = await dispatchToExpress(authApp, url.toString(), {
          method: req.method,
          headers,
        });
        res.status(response.status);
        response.headers.forEach((val, key) => {
          res.setHeader(key, val);
        });
        const arrayBuf = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuf));
        return;
      }
    } catch (err: any) {
      logger.error({ err }, 'in-process /authorize dispatch failed');
      res.status(502).json({ error: 'bad_gateway', error_description: 'Failed to process authorization' });
      return;
    }
    res.status(502).json({ error: 'bad_gateway', error_description: 'Auth service not registered in process' });
    return;
  }

  const proxyReq = http.request(url.toString(), {
    method: req.method,
    headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode!, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', () => { res.status(502).json({ error: 'bad_gateway' }); });
  req.pipe(proxyReq);
});

router.get('/consent', authRateLimit, async (req, res) => {
  if (!req.userId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent(req.originalUrl)}`);
    return;
  }

  const clientId = req.query.client_id as string;
  const scope = (req.query.scope as string) ?? 'openid';

  if (!clientId) {
    res.status(400).send('Missing client_id parameter.');
    return;
  }

  const authorizeParams = encodeURIComponent(req.url.replace('/consent', ''));
  const profile = req.userId ? await getProfile(req.userId, req.tenantId, req.supabaseAccessToken).catch(() => null) : null;
  let clientAppName: string | undefined;
  try {
    const supabase = getSupabase();
    const { data: cRow } = await supabase.from('clients').select('app_name').eq('client_id', clientId).maybeSingle();
    if (cRow?.app_name) clientAppName = cRow.app_name;
  } catch {}

  res.send(consentPage(clientId, scope.split(' ').filter(Boolean), authorizeParams, undefined, {
    userId: req.userId,
    displayName: profile?.displayName,
    email: profile?.email,
    avatarUrl: profile?.avatarUrl,
  }, clientAppName));
});

router.post('/consent', authRateLimit, async (req, res) => {
  if (!req.userId) {
    // Fix #14: redirect instead of raw JSON for expired sessions on HTML routes.
    res.redirect(302, `/login?return_to=${encodeURIComponent('/grants')}&error=${encodeURIComponent('Your session expired. Please sign in again.')}`);
    return;
  }

  const { authorize_params, decision } = req.body;

  if (!authorize_params) {
    res.status(400).send('Missing authorize_params.');
    return;
  }

  // Fix #4: authorize_params is now the raw query string (e.g. "?client_id=foo&scope=openid").
  // Strip a leading "?" so URLSearchParams can parse it cleanly.
  const rawParams = authorize_params.startsWith('?') ? authorize_params.slice(1) : authorize_params;
  const params = new URLSearchParams(rawParams);
  const clientId = params.get('client_id');
  const scope = params.get('scope') ?? 'openid';
  const redirectUri = params.get('redirect_uri');

  if (!clientId) {
    res.status(400).send('Missing client_id in authorize params.');
    return;
  }

  // Fix #8: Denying consent must redirect to the client's redirect_uri with
  // error=access_denied, not to /login (which is spec non-compliant and confusing).
  if (decision === 'deny') {
    if (redirectUri && redirectUri.startsWith('/')) {
      // Relative redirect URIs are always safe.
      const sep = redirectUri.includes('?') ? '&' : '?';
      res.redirect(302, `${redirectUri}${sep}error=access_denied&error_description=${encodeURIComponent('The user denied access.')}`);
    } else if (redirectUri) {
      // For absolute redirect URIs, forward to the auth service which will
      // validate it against the registered client before redirecting.
      const sep = rawParams ? '?' : '';
      res.redirect(302, `/authorize?${rawParams}&error=access_denied&error_description=${encodeURIComponent('The user denied access.')}`);
    } else {
      res.redirect(302, '/grants');
    }
    return;
  }

  const scopes = scope.split(' ').filter(Boolean);

  // Fix #9: Use upsert so re-consenting with additional/different scopes
  // doesn't throw a 409 and silently fail to save the new scope set.
  await upsertConsentGrant(req.userId, clientId, scopes, req.tenantId, req.supabaseAccessToken);

  res.redirect(302, `/authorize?${rawParams}`);
});

router.get('/profile', async (req, res) => {
  if (!req.userId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/profile')}`);
    return;
  }

  try {
    const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
    if (!data.profile?.emailVerified) {
      res.redirect(302, `/verify-email`);
      return;
    }

    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, {
      activeTab: 'profile',
      message: req.query.message as string,
      error: req.query.error as string,
      detectedCountry: detectCountrySync(req),
    }));
  } catch (err: any) {
    logger.error({ err }, 'GET /profile failed');
    const message = err?.message?.includes('timed out')
      ? 'Profile service is unavailable. Please try again shortly.'
      : 'An unexpected error occurred. Please try again.';
    res.status(502).send(`<html><body style="font-family:sans-serif;padding:40px"><h2>Something went wrong</h2><p>${message}</p><a href="/profile">Retry</a></body></html>`);
  }
});

router.post('/profile', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const { displayName, avatarUrl, locale } = req.body;

  if (!displayName || displayName.trim().length === 0) {
    try {
      const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
      res.status(200).send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'profile', error: 'Display name is required.' }));
      return;
    } catch { /* fall through */ }
    res.status(400).send('Display name is required.');
    return;
  }

  const updates: Record<string, string> = { displayName: displayName.trim() };
  if (avatarUrl) updates.avatarUrl = avatarUrl;
  if (locale) updates.locale = locale;

  try {
    await updateProfile(req.userId, updates, req.tenantId, req.supabaseAccessToken);
    const returnUrl = req.headers.referer?.includes('/dashboard')
      ? '/dashboard?tab=profile&message=' + encodeURIComponent('Profile updated successfully.')
      : '/profile';
    res.redirect(302, returnUrl);
  } catch (err: any) {
    logger.error({ err }, 'POST /profile failed');
    try {
      const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
      const message = err?.message?.includes('timed out')
        ? 'Profile service is unavailable — please try again shortly.'
        : 'Failed to save changes. Please try again.';
      res.status(502).send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'profile', error: message }));
      return;
    } catch { /* fall through */ }
    res.status(502).send('Failed to save changes. Please try again.');
  }
});


router.post('/profile/avatar', (req, res, next) => {
  upload.single('avatar')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'file_too_large', error_description: 'Image file must be under 5MB.' });
        return;
      }
      res.status(400).json({ error: 'upload_error', error_description: err.message || 'Failed to process image file.' });
      return;
    }
    next();
  });
}, async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(503).json({ error: 'not_configured', error_description: 'Avatar upload service is not configured.' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'no_file', error_description: 'No file provided.' });
    return;
  }

  try {
    let uploadBuffer: Buffer = req.file.buffer;
    let formatApplied = false;

    try {
      if (typeof process !== 'undefined' && !process.env.CLOUDFLARE_WORKER) {
        const sharpPkg = 'sharp';
        const sharpModule = await (import(sharpPkg) as Promise<any>).then((m) => m.default || m).catch(() => null);
        if (sharpModule) {
          uploadBuffer = await sharpModule(req.file.buffer)
            .rotate()
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .toBuffer();
          formatApplied = true;
        }
      }
    } catch {
      // Sharp not available in edge/worker environment; Cloudinary will handle transformation
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'avatars';
    const transformation = formatApplied
      ? 'q_auto,f_auto'
      : 'w_400,h_400,c_limit,q_85,f_auto';

    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
      transformation,
    };

    const signature = signCloudinaryParams(paramsToSign, apiSecret);

    const mimeType = req.file.mimetype || 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${uploadBuffer.toString('base64')}`;

    const formData = new FormData();
    formData.append('file', base64Data);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('transformation', transformation);
    formData.append('signature', signature);

    // Direct HTTP fetch to Cloudinary REST API — works in standard Node and Cloudflare Workers (unenv) without https.request
    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = (await uploadRes.json()) as any;

    if (!uploadRes.ok || !result?.secure_url) {
      const errorMsg = result?.error?.message || `Cloudinary upload failed with status ${uploadRes.status}`;
      throw new Error(errorMsg);
    }

    await updateProfile(req.userId, { avatarUrl: result.secure_url }, req.tenantId, req.supabaseAccessToken);

    // Also update users table directly so all services, OIDC tokens, and avatar CDN route stay immediately synchronized
    try {
      await getSupabase().from('users').update({ avatar_url: result.secure_url }).eq('id', req.userId);
    } catch {
      // Non-blocking fallback
    }

    res.json({ avatarUrl: result.secure_url });
  } catch (err: any) {
    res.status(500).json({ error: 'upload_failed', error_description: err.message });
  }
});

function getAvatarColor(name: string): string {
  const colors = [
    '#2563eb', '#4f46e5', '#7c3aed', '#9333ea',
    '#0284c7', '#0891b2', '#0d9488', '#16a34a',
    '#d97706', '#ea580c', '#e11d48', '#475569'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

router.options('/avatar/:userId', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// GET /avatar/:userId — CDN-cached avatar serving (Item 49)
router.get('/avatar/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const supabase = getSupabase();
    let { data } = await supabase.from('users').select('avatar_url, display_name, primary_email').eq('id', userId).maybeSingle();

    // If users.avatar_url is missing or empty, check profiles table as fallback and backfill
    if (!data?.avatar_url || !data.avatar_url.startsWith('http')) {
      const { data: profileData } = await supabase.from('profiles').select('avatar_url, display_name, email').eq('user_id', userId).maybeSingle();
      if (profileData?.avatar_url && profileData.avatar_url.startsWith('http')) {
        if (!data) {
          data = { avatar_url: profileData.avatar_url, display_name: profileData.display_name, primary_email: profileData.email };
        } else {
          data.avatar_url = profileData.avatar_url;
        }
        // Asynchronously backfill users table
        void Promise.resolve(supabase.from('users').update({ avatar_url: profileData.avatar_url }).eq('id', userId)).catch(() => {});
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    if (data?.avatar_url && data.avatar_url.startsWith('http')) {
      res.redirect(302, data.avatar_url);
      return;
    }

    const name = data?.display_name?.trim() || data?.primary_email || 'User';
    const initial = (name.charAt(0) || 'U').toUpperCase();
    const bgColor = data?.avatar_url?.startsWith('#') ? data.avatar_url : getAvatarColor(name);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><circle cx="64" cy="64" r="64" fill="${bgColor}"/><text x="50%" y="54%" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="54" font-weight="700" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${initial}</text></svg>`;

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.send(svg);
  } catch (err: any) {
    res.status(404).send('Not found');
  }
});

// GET /account/export — GDPR Data Portability (Item 53)
router.get('/account/export', async (req, res) => {
  if (!req.userId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/account/export')}`);
    return;
  }
  try {
    const supabase = getSupabase();
    const [userRes, sessionsRes, devicesRes, grantsRes, auditRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', req.userId).maybeSingle(),
      supabase.from('sessions').select('*').eq('user_id', req.userId),
      supabase.from('devices').select('*').eq('user_id', req.userId),
      supabase.from('oauth_consents').select('*').eq('user_id', req.userId),
      supabase.from('audit_log').select('*').eq('user_id', req.userId).limit(500),
    ]);

    const exportPackage = {
      exportTimestamp: new Date().toISOString(),
      platform: 'Playsole One',
      user: userRes.data ? { ...userRes.data, password_hash: undefined } : null,
      sessions: sessionsRes.data || [],
      devices: devicesRes.data || [],
      authorizedApplications: grantsRes.data || [],
      auditEvents: auditRes.data || [],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="playsole-data-export-${req.userId}.json"`);
    res.send(JSON.stringify(exportPackage, null, 2));
  } catch (err: any) {
    logger.error({ err }, 'GET /account/export failed');
    res.status(500).json({ error: 'export_failed', message: err.message });
  }
});

// POST /account/delete — GDPR Right to Erasure / Account Deletion (Item 53)
router.post('/account/delete', async (req, res) => {
  if (!req.userId) {
    res.redirect(302, '/login');
    return;
  }
  const userId = req.userId;
  try {
    const supabase = getSupabase();
    await Promise.all([
      supabase.from('sessions').delete().eq('user_id', userId),
      supabase.from('devices').delete().eq('user_id', userId),
      supabase.from('oauth_consents').delete().eq('user_id', userId),
      supabase.from('risk_alerts').delete().eq('user_id', userId),
      supabase.from('users').delete().eq('id', userId),
    ]);

    await audit({
      eventType: 'user.account.deleted_self',
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.clearCookie(sessionCookieName());
    res.redirect(302, '/login?message=' + encodeURIComponent('Your Playsole One account and associated data have been permanently deleted.'));
  } catch (err: any) {
    logger.error({ err, userId }, 'POST /account/delete failed');
    res.redirect(302, '/dashboard?tab=profile&error=' + encodeURIComponent('Failed to delete account. Please try again.'));
  }
});

// GET /developers — Interactive Developer Integration Portal (Item 55)
router.get('/developers', (_req, res) => {
  res.send(renderDevelopersView());
});
router.get('/docs', (_req, res) => {
  res.redirect(302, '/developers');
});


router.get('/grants', async (req, res) => {
  if (!req.userId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/grants')}`);
    return;
  }
  try {
    const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, {
      activeTab: 'grants',
      message: req.query.message as string,
      error: req.query.error as string,
    }));
  } catch (err: any) {
    logger.error({ err }, 'GET /grants failed');
    res.status(502).send('Failed to load grants.');
  }
});

router.post('/grants/revoke/:id', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  await revokeGrant(req.userId, req.params.id, req.tenantId, req.supabaseAccessToken);
  const returnUrl = req.headers.referer?.includes('/dashboard')
    ? '/dashboard?tab=grants&message=' + encodeURIComponent('Application access revoked.')
    : '/grants';
  res.redirect(302, returnUrl);
});

router.get('/recovery', (req, res) => {
  res.send(recoveryRequestPage());
});

router.post('/recovery', authRateLimit, async (req, res) => {
  const email = (req.body.email as string)?.trim();
  if (!email) {
    res.status(400).send(recoveryRequestPage('Email address is required.'));
    return;
  }

  const result = await requestEmailRecovery(email);
  if ('error' in result) {
    res.status(400).send(recoveryRequestPage(result.errorDescription));
    return;
  }

  res.send(recoveryEmailSentPage(email, config.inlineTokens ? result.token : undefined));
});

router.get('/recovery/verify', async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(400).send(recoveryRequestPage('Missing recovery token.'));
    return;
  }

  const result = await consumeRecoveryToken(token);
  if ('error' in result) {
    res.status(400).send(recoveryConfirmPage(token, result.errorDescription));
    return;
  }

  res.send(recoveryConfirmPage(token));
});

router.post('/recovery/reset', authRateLimit, async (req, res) => {
  const token = (req.body.token as string)?.trim();
  if (!token) {
    res.status(400).send(recoveryRequestPage('Missing recovery token.'));
    return;
  }

  const claim = await consumeRecoveryToken(token);
  if ('error' in claim) {
    res.status(400).send(recoveryConfirmPage(token, claim.errorDescription));
    return;
  }

  const result = await resetMfaForRecovery(claim.userId);
  if ('error' in result) {
    res.status(400).send(recoveryConfirmPage(token, result.errorDescription));
    return;
  }

  res.send(recoveryResetDonePage(result.codes));
});

router.get('/logout', authRateLimit, logoutHandler);
router.post('/logout', authRateLimit, logoutHandler);

// Temporary in-memory flash for one-time developer client secret reveal
const developerSecretFlash = new Map<string, { clientId: string; appName: string; secret: string }>();

async function getDeveloperAdminStatus(userId: string, userEmail?: string): Promise<{ isDeveloperAdmin: boolean; role: string }> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const devAdminEmails = (process.env.DEVELOPER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  let email = userEmail?.toLowerCase();
  let userRole = 'user';

  try {
    const supabase = getSupabase();
    const { data: userRow } = await supabase
      .from('users')
      .select('role, primary_email')
      .eq('id', userId)
      .maybeSingle();

    if (userRow) {
      userRole = userRow.role || 'user';
      if (!email && userRow.primary_email) {
        email = userRow.primary_email.toLowerCase();
      }
    }
  } catch (err) {
    logger.warn({ err, userId }, 'failed to query user role');
  }

  const isDeveloperAdmin =
    userRole === 'developer_admin' ||
    userRole === 'admin' ||
    (Boolean(email) && (adminEmails.includes(email!) || devAdminEmails.includes(email!)));

  return { isDeveloperAdmin, role: userRole };
}

async function loadDashboardData(userId: string, tenantId: string | undefined, supabaseAccessToken: string | undefined) {
  const [profile, mfaStatus, sessions, devices, grants] = await Promise.all([
    getProfile(userId, tenantId, supabaseAccessToken),
    getMfaStatus(userId, tenantId, supabaseAccessToken),
    getSessions(userId),
    getDevices(userId, tenantId, supabaseAccessToken),
    getGrants(userId, tenantId, supabaseAccessToken),
  ]);
  const seenIds = new Set<string>();
  const dedupedSessions = sessions.filter((s) => {
    if (seenIds.has(s.id)) return false;
    seenIds.add(s.id);
    return true;
  });

  const { isDeveloperAdmin, role } = await getDeveloperAdminStatus(userId, profile?.email);
  let developerApps: DeveloperApp[] = [];

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('clients')
      .select('id, client_id, app_name, owner_user_id, redirect_uris, first_party, public_client, created_at');

    if (isDeveloperAdmin) {
      query = query.or(`owner_user_id.eq.${userId},first_party.eq.true`);
    } else {
      query = query.eq('owner_user_id', userId);
    }

    const { data: appsData, error: appsErr } = await query.order('created_at', { ascending: false });
    if (!appsErr && appsData) {
      developerApps = appsData.map((a: any) => ({
        id: a.id,
        appName: a.app_name || a.client_id,
        clientId: a.client_id,
        redirectUris: a.redirect_uris || [],
        firstParty: Boolean(a.first_party),
        publicClient: Boolean(a.public_client),
        createdAt: a.created_at,
        isOwner: a.owner_user_id === userId,
      }));
    } else {
      // Fallback if migration hasn't populated owner_user_id / app_name yet
      const { data: fallbackData } = await supabase
        .from('clients')
        .select('id, client_id, redirect_uris, first_party, public_client, created_at');
      if (fallbackData && isDeveloperAdmin) {
        developerApps = fallbackData.map((a: any) => ({
          id: a.id,
          appName: a.client_id,
          clientId: a.client_id,
          redirectUris: a.redirect_uris || [],
          firstParty: Boolean(a.first_party),
          publicClient: Boolean(a.public_client),
          createdAt: a.created_at,
          isOwner: true,
        }));
      }
    }
  } catch (err) {
    logger.warn({ err }, 'failed to load developer apps in loadDashboardData');
  }

  return {
    profile: profile || {
      displayName: '',
      email: '',
      locale: 'en',
      emailVerified: false,
      createdAt: '',
      updatedAt: '',
    },
    displayName: profile?.displayName ?? '',
    mfaEnabled: mfaStatus.mfaEnabled,
    mfaRequired: mfaStatus.mfaRequired,
    methods: mfaStatus.methods,
    backupCodes: mfaStatus.backupCodes,
    sessions: dedupedSessions,
    devices,
    grants: grants ?? [],
    developerApps,
    isDeveloperAdmin,
    role,
  };
}

async function loadSecurityData(userId: string, tenantId: string | undefined, supabaseAccessToken: string | undefined) {
  return loadDashboardData(userId, tenantId, supabaseAccessToken);
}

router.get('/dashboard', async (req, res) => {
  if (!req.userId) {
    const returnTo = encodeURIComponent(req.originalUrl || '/dashboard');
    res.redirect(302, `/login?return_to=${returnTo}`);
    return;
  }

  try {
    const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
    if (!data.profile?.emailVerified) {
      res.redirect(302, '/verify-email');
      return;
    }
    const alerts = await listRiskAlerts(req.userId);
    const activeTab = (req.query.tab as any) || 'overview';
    const message = req.query.message as string | undefined;
    const error = req.query.error as string | undefined;

    const devFlash = req.userId ? developerSecretFlash.get(req.userId) : undefined;
    if (req.userId && devFlash) developerSecretFlash.delete(req.userId);

    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, {
      activeTab,
      message,
      error,
      alerts,
      developerSecretFlash: devFlash,
      detectedCountry: detectCountrySync(req),
    }));
  } catch (err: any) {
    logger.error({ err }, 'GET /dashboard failed');
    res.status(502).send(`<html><body style="font-family:sans-serif;padding:40px"><h2>Something went wrong</h2><p>Could not load account settings — please try again.</p><a href="/dashboard">Retry</a></body></html>`);
  }
});

router.get('/security', async (req, res) => {
  if (!req.userId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent('/security')}`);
    return;
  }
  try {
    const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
    if (!data.profile?.emailVerified) {
      res.redirect(302, '/verify-email');
      return;
    }
    const alerts = await listRiskAlerts(req.userId);
    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, {
      activeTab: 'security',
      message: req.query.message as string,
      error: req.query.error as string,
      alerts,
    }));
  } catch (err: any) {
    logger.error({ err }, 'GET /security failed');
    res.status(502).send('Failed to load security settings.');
  }
});

router.post('/security/alerts/:id/dismiss', async (req, res) => {
  // Fix #14: redirect expired sessions to login instead of showing raw JSON.
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  await dismissRiskAlert(req.userId, req.params.id);
  res.redirect(302, '/dashboard?tab=security');
});

router.post('/security/totp/begin', async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }

  const result = await beginTotpEnrollment(req.userId, req.tenantId, 'Authenticator app');
  const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
  if ('error' in result) {
    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'security', error: result.errorDescription }));
    return;
  }
  res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'security', totp: result }));
});

router.post('/security/totp/:id/verify', async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }

  const code = (req.body.code as string)?.trim();
  const secret = req.body.secret as string | undefined;
  const otpauthUrl = req.body.otpauthUrl as string | undefined;
  const totpObj = secret && otpauthUrl ? { id: req.params.id, secret, otpauthUrl } : undefined;

  if (!code) {
    const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'security', error: 'Enter the 6-digit code from your authenticator app.', totp: totpObj }));
    return;
  }

  const result = await confirmTotpEnrollment(req.userId, req.params.id, code, req.tenantId);
  if ('error' in result) {
    const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'security', error: result.errorDescription, totp: totpObj }));
    return;
  }
  if (req.sessionId) {
    await markSessionMfaPassed(req.sessionId).catch(() => {});
    invalidateSessionCache(req.sessionId);
  }
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Authenticator app enabled.'));
});

router.post('/security/totp/:id/remove', verifyCsrf, async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  await removeTotpMethod(req.userId, req.params.id, req.tenantId);
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Authenticator app removed.'));
});

// Passkey registration is WebAuthn-driven, so it is JSON — the page JS calls these.
router.post('/security/webauthn/register/options', apiRateLimit, async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
  try {
    const options = await webauthnRegisterOptions(req.userId, req.tenantId, 'Web browser');
    res.json(options);
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', error_description: err?.message ?? 'Failed to start passkey registration.' });
  }
});

router.post('/security/webauthn/register', apiRateLimit, async (req, res) => {
  if (!req.userId) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const result = await webauthnRegister(req.userId, req.body.response, req.tenantId, 'Web browser');
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

router.post('/security/webauthn/:id/remove', verifyCsrf, async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  await removeWebAuthnCredential(req.userId, req.params.id, req.tenantId);
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Passkey removed.'));
});

router.post('/security/backup-codes', verifyCsrf, async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  const result = await generateBackupCodes(req.userId, req.tenantId);
  const data = await loadDashboardData(req.userId, req.tenantId, req.supabaseAccessToken);
  if ('error' in result) {
    res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'security', error: result.errorDescription }));
    return;
  }
  res.send(dashboardPage({ ...data, currentSessionId: req.sessionId }, { activeTab: 'security', backupCodes: result.codes, message: 'New backup codes generated.' }));
});

router.post('/security/sessions/:id/revoke', verifyCsrf, async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  const sessions = await getSessions(req.userId);
  const own = sessions.some((s) => s.id === req.params.id);
  if (!own) {
    res.status(403).json({ error: 'forbidden', error_description: 'That session does not belong to you.' });
    return;
  }
  await revokeSession(req.params.id);
  invalidateSessionCache(req.params.id);
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Session revoked.'));
});

router.post('/security/devices/:id/trust', async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  await setDeviceTrusted(req.userId, req.params.id, true, req.tenantId);
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Device trusted.'));
});

router.post('/security/devices/:id/untrust', async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  await setDeviceTrusted(req.userId, req.params.id, false, req.tenantId);
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Device marked untrusted.'));
});

router.post('/security/devices/:id/remove', async (req, res) => {
  if (!req.userId) { res.redirect(302, `/login?return_to=${encodeURIComponent('/dashboard?tab=security')}&error=${encodeURIComponent('Your session expired.')}`); return; }
  await removeDevice(req.userId, req.params.id, req.tenantId);
  res.redirect(302, '/dashboard?tab=security&message=' + encodeURIComponent('Device forgotten.'));
});

function logoutHandler(req: Request, res: Response) {
  const cookieName = sessionCookieName();
  const sessionId =
    req.cookies?.[cookieName] ||
    req.cookies?.['__Secure-playsole_session'] ||
    req.cookies?.['__Host-playsole_session'] ||
    req.cookies?.['playsole_session'];

  if (sessionId) {
    try {
      invalidateSessionCache(sessionId);
      void deleteSession(sessionId);
    } catch { /* ignore */ }

    const domain = ssoCookieDomain();
    res.clearCookie(cookieName, { path: '/' });
    res.clearCookie('playsole_session', { path: '/' });
    res.clearCookie('__Secure-playsole_session', { path: '/' });
    res.clearCookie('__Host-playsole_session', { path: '/' });

    if (domain) {
      res.clearCookie(cookieName, { path: '/', domain });
      res.clearCookie('playsole_session', { path: '/', domain });
      res.clearCookie('__Secure-playsole_session', { path: '/', domain });
    }
  }
  res.redirect(302, '/login?message=' + encodeURIComponent('You have signed out of Playsole One.'));
}


// Developer Suite Routes
router.get('/developer', (req: Request, res: Response) => {
  res.redirect(302, '/dashboard?tab=developer');
});

router.post('/developer/apps', express.urlencoded({ extended: false }), express.json(), async (req: Request, res: Response) => {
  if (!req.userId) {
    res.redirect(302, '/login?return_to=' + encodeURIComponent('/dashboard?tab=developer'));
    return;
  }

  try {
    const appName = (req.body.appName || '').trim();
    let clientId = (req.body.clientId || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const redirectUrisRaw = req.body.redirectUris || '';
    // Secret is required for all applications registered in Playsole One (Confidential Clients)
    const isPublic = false;
    const wantsFirstParty = Boolean(req.body.firstParty === 'on' || req.body.firstParty === 'true' || req.body.firstParty === true);

    if (!appName) {
      res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent('Application name is required.'));
      return;
    }

    if (!clientId) {
      clientId = appName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32);
    }

    const redirectUris = (typeof redirectUrisRaw === 'string' ? redirectUrisRaw.split(/[\r\n,]+/) : redirectUrisRaw)
      .map((u: string) => u.trim())
      .filter(Boolean);

    if (redirectUris.length === 0) {
      res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent('At least one Redirect URI is required.'));
      return;
    }

    for (const uri of redirectUris) {
      try {
        const parsed = new URL(uri);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error();
        }
        if (parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
          res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent(`Insecure redirect URI ${uri}. Production URIs must use HTTPS.`));
          return;
        }
      } catch {
        res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent(`Invalid redirect URI: ${uri}`));
        return;
      }
    }

    const { isDeveloperAdmin } = await getDeveloperAdminStatus(req.userId);
    const firstParty = wantsFirstParty && isDeveloperAdmin;

    let rawSecret = '';
    let hashedSecret: string | null = null;
    if (!isPublic) {
      rawSecret = 'pso_' + crypto.randomBytes(32).toString('base64url');
      hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
    }

    const supabase = getSupabase();
    const { data: existing } = await supabase.from('clients').select('id').eq('client_id', clientId).maybeSingle();
    if (existing) {
      clientId = `${clientId}-${crypto.randomBytes(3).toString('hex')}`;
    }

    const newClientRecord: Record<string, any> = {
      id: crypto.randomUUID(),
      tenant_id: req.tenantId || '00000000-0000-0000-0000-000000000001',
      client_id: clientId,
      client_secret: hashedSecret,
      redirect_uris: redirectUris,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      grant_types: isPublic ? ['authorization_code', 'refresh_token'] : ['authorization_code', 'refresh_token', 'client_credentials'],
      public_client: isPublic,
      first_party: firstParty,
      owner_user_id: req.userId,
      app_name: appName,
      created_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase.from('clients').insert(newClientRecord);
    if (insertErr) {
      if (insertErr.message?.includes('owner_user_id') || insertErr.message?.includes('app_name')) {
        delete newClientRecord.owner_user_id;
        delete newClientRecord.app_name;
        const { error: retryErr } = await supabase.from('clients').insert(newClientRecord);
        if (retryErr) throw retryErr;
      } else {
        throw insertErr;
      }
    }

    await audit({
      eventType: 'developer.client.created',
      clientId,
      userId: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { appName, publicClient: isPublic, firstParty },
    });

    if (rawSecret) {
      developerSecretFlash.set(req.userId, { clientId, appName, secret: rawSecret });
    }

    res.redirect(302, '/dashboard?tab=developer&message=' + encodeURIComponent(`Application "${appName}" created successfully.`));
  } catch (err: any) {
    logger.error({ err }, 'POST /developer/apps failed');
    res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent(err.message || 'Failed to create application.'));
  }
});

router.post('/developer/apps/:id/rotate-secret', async (req: Request, res: Response) => {
  if (!req.userId) {
    res.redirect(302, '/login');
    return;
  }

  const clientDbId = req.params.id;
  try {
    const supabase = getSupabase();
    const { isDeveloperAdmin } = await getDeveloperAdminStatus(req.userId);

    const { data: client, error: fetchErr } = await supabase
      .from('clients')
      .select('id, client_id, app_name, owner_user_id, public_client')
      .eq('id', clientDbId)
      .maybeSingle();

    if (fetchErr || !client) {
      res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent('Application not found.'));
      return;
    }

    if (client.owner_user_id && client.owner_user_id !== req.userId && !isDeveloperAdmin) {
      res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent('You do not have permission to modify this application.'));
      return;
    }

    const newSecret = 'pso_' + crypto.randomBytes(32).toString('base64url');
    const hashedSecret = crypto.createHash('sha256').update(newSecret).digest('hex');

    const { error: updateErr } = await supabase
      .from('clients')
      .update({ client_secret: hashedSecret })
      .eq('id', clientDbId);

    if (updateErr) throw updateErr;

    await audit({
      eventType: 'developer.client.secret_rotated',
      clientId: client.client_id,
      userId: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    developerSecretFlash.set(req.userId, {
      clientId: client.client_id,
      appName: client.app_name || client.client_id,
      secret: newSecret,
    });

    res.redirect(302, '/dashboard?tab=developer&message=' + encodeURIComponent(`Secret rotated for ${client.app_name || client.client_id}. Store the new secret immediately.`));
  } catch (err: any) {
    logger.error({ err, clientDbId }, 'POST /developer/apps/:id/rotate-secret failed');
    res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent(err.message || 'Failed to rotate secret.'));
  }
});

router.post('/developer/apps/:id/delete', async (req: Request, res: Response) => {
  if (!req.userId) {
    res.redirect(302, '/login');
    return;
  }

  const clientDbId = req.params.id;
  try {
    const supabase = getSupabase();
    const { isDeveloperAdmin } = await getDeveloperAdminStatus(req.userId);

    const { data: client, error: fetchErr } = await supabase
      .from('clients')
      .select('id, client_id, app_name, owner_user_id')
      .eq('id', clientDbId)
      .maybeSingle();

    if (fetchErr || !client) {
      res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent('Application not found.'));
      return;
    }

    if (client.owner_user_id && client.owner_user_id !== req.userId && !isDeveloperAdmin) {
      res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent('You do not have permission to delete this application.'));
      return;
    }

    const { error: delErr } = await supabase.from('clients').delete().eq('id', clientDbId);
    if (delErr) throw delErr;

    await audit({
      eventType: 'developer.client.deleted',
      clientId: client.client_id,
      userId: req.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.redirect(302, '/dashboard?tab=developer&message=' + encodeURIComponent(`Application "${client.app_name || client.client_id}" deleted.`));
  } catch (err: any) {
    logger.error({ err, clientDbId }, 'POST /developer/apps/:id/delete failed');
    res.redirect(302, '/dashboard?tab=developer&error=' + encodeURIComponent(err.message || 'Failed to delete application.'));
  }
});

export { router as bffRouter };

