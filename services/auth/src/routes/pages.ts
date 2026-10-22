import { Router } from 'express';
import { findUserByEmail, getUserById, registerWithSupabaseAuth, loginWithSupabaseAuth, verifySupabaseOtp, resendSupabaseOtp, createMagicLink, consumeMagicLink, createSupabaseSessionForUser, isUserLockedOut, recordLoginFailure, recordLoginSuccess } from '../store';
import { sendMagicLinkEmail } from '../email';
import { config } from '../config';
import { requireInternalSecret, DEFAULT_TENANT_ID, audit } from '@playsole-one/shared';

const router = Router();

// Applies the internal-secret guard per route (not router-wide) so these
// identity-header endpoints stay protected without blocking the public OAuth
// endpoints mounted alongside this router at the app root.
router.post('/api/login', requireInternalSecret, async (req, res) => {
  const { email, password, ipAddress, userAgent } = req.body;
  const ip = typeof ipAddress === 'string' && ipAddress ? ipAddress : req.ip;
  const ua = typeof userAgent === 'string' && userAgent ? userAgent : req.get('user-agent');

  if (!email || !password) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Email and password are required.' });
    return;
  }

  const lock = await isUserLockedOut(email);
  if (lock.locked) {
    void audit({ eventType: 'user.login_locked', metadata: { email, ip, retryAfterMs: lock.retryAfterMs } });
    res.status(429).json({
      error: 'account_locked',
      error_description: `Too many failed attempts. Try again in ${Math.ceil(lock.retryAfterMs / 60000)} minute(s).`,
      retry_after_sec: Math.ceil(lock.retryAfterMs / 1000),
    });
    return;
  }

  const result = await loginWithSupabaseAuth(email, password);
  if ('error' in result) {
    await recordLoginFailure(email, ip, ua);
    if (result.error === 'email_not_confirmed') {
      res.status(401).json({ error: result.error, error_description: result.errorDescription });
      return;
    }
    if (result.error === 'account_suspended' || result.error === 'account_disabled') {
      res.status(403).json({ error: result.error, error_description: result.errorDescription });
      return;
    }
    const nowLocked = await isUserLockedOut(email);
    if (nowLocked.locked) {
      void audit({ eventType: 'user.login_locked', metadata: { email, ip, retryAfterMs: nowLocked.retryAfterMs } });
      res.status(429).json({
        error: 'account_locked',
        error_description: `Too many failed attempts. Try again in ${Math.ceil(nowLocked.retryAfterMs / 60000)} minute(s).`,
        retry_after_sec: Math.ceil(nowLocked.retryAfterMs / 1000),
      });
      return;
    }
    res.status(401).json({ error: result.error, error_description: result.errorDescription });
    return;
  }

  await recordLoginSuccess(email, result.user.id, result.user.tenantId, ip, ua);
  void audit({ eventType: 'user.login', userId: result.user.id, tenantId: result.user.tenantId });

  res.json({
    userId: result.user.id,
    tenantId: result.user.tenantId,
    email: result.user.email,
    displayName: result.user.displayName,
    supabaseAccessToken: result.accessToken,
    supabaseRefreshToken: result.refreshToken,
  });
});

router.post('/api/register', requireInternalSecret, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'invalid_request', error_description: 'All fields are required.' });
    return;
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'invalid_request', error_description: 'A valid email address is required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Password must be at least 8 characters.' });
    return;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'duplicate_email', error_description: 'An account with this email already exists.' });
    return;
  }

  try {
    const result = await registerWithSupabaseAuth(email, password, name, DEFAULT_TENANT_ID);

    // Email confirmation is handled by Supabase Auth (6-digit OTP sent on
    // signUp). Do NOT send a second Playsole verification email here — it
    // confuses users with a second token that the OTP page cannot verify.

    void audit({ eventType: 'user.register', userId: result.user.id, tenantId: result.user.tenantId });

    res.status(201).json({
      userId: result.user.id,
      tenantId: result.user.tenantId,
      email: result.user.email,
      displayName: result.user.displayName,
      emailVerified: result.user.emailVerified,
      supabaseAccessToken: result.accessToken,
      supabaseRefreshToken: result.refreshToken,
    });
  } catch (err: any) {
    // If Supabase Auth succeeded but Playsole user creation failed, try fallback:
    // user may already exist in Playsole (e.g., from pre-migration data)
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      // Re-login via Supabase Auth to get tokens
      const loginResult = await loginWithSupabaseAuth(email, password);
      if ('error' in loginResult) {
        res.status(500).json({ error: 'server_error', error_description: 'Registration partially failed.' });
        return;
      }

      void audit({ eventType: 'user.register_fallback', userId: existingUser.id, tenantId: existingUser.tenantId });

      res.status(201).json({
        userId: existingUser.id,
        tenantId: existingUser.tenantId,
        email: existingUser.email,
        displayName: existingUser.displayName,
        emailVerified: existingUser.emailVerified,
        supabaseAccessToken: loginResult.accessToken,
        supabaseRefreshToken: loginResult.refreshToken,
      });
      return;
    }

    res.status(500).json({ error: 'server_error', error_description: err.message ?? 'Registration failed.' });
  }
});

router.post('/api/auth/magic-link', requireInternalSecret, async (req, res) => {
  const { email, return_to } = req.body;

  if (!email) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Email is required.' });
    return;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    res.status(404).json({ error: 'not_found', error_description: 'No account found with this email.' });
    return;
  }

  if (user.status === 'suspended' || user.status === 'disabled') {
    res.status(403).json({
      error: user.status === 'suspended' ? 'account_suspended' : 'account_disabled',
      error_description: `Your account has been ${user.status}. Please contact support for assistance (support@playsole.xyz).`,
    });
    return;
  }

  const token = await createMagicLink(email, user.id, 600, typeof return_to === 'string' && return_to.length > 0 ? return_to : undefined);

  // Deliver the one-time token out-of-band (email). Inline echo is dev-only.
  void sendMagicLinkEmail(email, token);

  void audit({ eventType: 'user.magic_link_requested', userId: user.id, tenantId: user.tenantId });
  res.json({ message: 'Magic link sent.', expiresIn: 600, ...(config.inlineTokens ? { token } : {}) });
});

router.post('/api/auth/magic-link/verify', requireInternalSecret, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Token is required.' });
    return;
  }

  const entry = await consumeMagicLink(token);
  if (!entry) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired magic link.' });
    return;
  }

  const user = await getUserById(entry.userId);
  if (user?.status === 'suspended' || user?.status === 'disabled') {
    res.status(403).json({
      error: user.status === 'suspended' ? 'account_suspended' : 'account_disabled',
      error_description: `Your account has been ${user.status}. Please contact support for assistance (support@playsole.xyz).`,
    });
    return;
  }

  void audit({ eventType: 'user.magic_link_verified', userId: entry.userId, tenantId: user?.tenantId });

  // Create a Supabase Auth session so the gateway can store tokens for RLS
  let supabaseAccessToken: string | undefined;
  let supabaseRefreshToken: string | undefined;
  if (user?.authUserId) {
    const session = await createSupabaseSessionForUser(user.authUserId, entry.email);
    if (session) {
      supabaseAccessToken = session.accessToken;
      supabaseRefreshToken = session.refreshToken;
    }
  }

  res.json({
    userId: entry.userId,
    email: entry.email,
    tenantId: user?.tenantId ?? '',
    returnTo: entry.returnTo ?? '',
    supabaseAccessToken,
    supabaseRefreshToken,
  });
});

router.post('/api/verify/email/otp', requireInternalSecret, async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Email and token are required.' });
    return;
  }

  const result = await verifySupabaseOtp(email, token);
  if (!result.success) {
    res.status(400).json({ error: 'invalid_otp', error_description: result.error ?? 'Invalid or expired code.' });
    return;
  }

  void audit({ eventType: 'user.email_verified_otp', userId: (await findUserByEmail(email))?.id });
  res.json({
    message: 'Email verified successfully.',
    supabaseAccessToken: result.accessToken,
    supabaseRefreshToken: result.refreshToken,
  });
});

router.post('/api/verify/email/resend', requireInternalSecret, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Email is required.' });
    return;
  }

  const result = await resendSupabaseOtp(email);
  if (!result.success) {
    res.status(500).json({ error: 'send_failed', error_description: result.error ?? 'Failed to resend code.' });
    return;
  }

  res.json({ message: 'Verification code resent.' });
});

export { router as pagesRouter };
