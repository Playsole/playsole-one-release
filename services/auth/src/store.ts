import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, DEFAULT_TENANT_ID, createLogger } from '@playsole-one/shared';
import { randomUUID, createHash } from 'node:crypto';
import { hashPassword } from './password';
import { config } from './config';

const logger = createLogger('auth');

// ── Supabase Auth client (anon key — for signup/login) ──

let authClient: any = null;

function getAuthClient(): any {
  if (!authClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set for Supabase Auth');
    authClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return authClient;
}

// ── Users ──

interface User {
  id: string;
  tenantId: string;
  authUserId?: string;
  email: string;
  displayName: string;
  passwordHash: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status?: string;
}

function toUser(row: any): User {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    authUserId: row.auth_user_id ?? undefined,
    email: row.primary_email ?? '',
    displayName: row.display_name,
    passwordHash: row.password_hash ?? '',
    emailVerified: row.email_verified ?? false,
    phoneVerified: row.phone_verified ?? false,
    status: row.status ?? 'active',
  };
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*').eq('primary_email', email).maybeSingle();
  return data ? toUser(data) : undefined;
}

export async function findUserByAuthId(authUserId: string): Promise<User | undefined> {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*').eq('auth_user_id', authUserId).maybeSingle();
  return data ? toUser(data) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  return data ? toUser(data) : undefined;
}

export async function createUser(email: string, displayName: string, password: string): Promise<User> {
  const id = randomUUID();
  const passwordHash = hashPassword(password);
  const supabase = getSupabase();
  const { error } = await supabase.from('users').insert({
    id, tenant_id: DEFAULT_TENANT_ID, primary_email: email,
    display_name: displayName, password_hash: passwordHash,
  });
  if (error) throw new Error(`Failed to create user: ${error.message}`);

  const { error: profileError } = await supabase.from('profiles').insert({
    user_id: id, tenant_id: DEFAULT_TENANT_ID, email,
    display_name: displayName, locale: 'en',
  });
  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

  return { id, tenantId: DEFAULT_TENANT_ID, email, displayName, passwordHash, emailVerified: false, phoneVerified: false };
}

/**
 * Register a user via Supabase Auth. Creates both the Supabase Auth user
 * and the Playsole user row (linked via auth_user_id). Sets app_metadata.tenant_id
 * so RLS can enforce tenant isolation via JWT claims.
 */
export async function registerWithSupabaseAuth(
  email: string, password: string, displayName: string, tenantId: string,
): Promise<{ user: User; accessToken?: string; refreshToken?: string }> {
  const start = Date.now();
  const step = (label: string) => logger.debug({ ms: Date.now() - start }, `register ${label}`);
  const auth = getAuthClient();
  const admin = getSupabase() as any;
  step('clients ready');

  const { data: authData, error: authError } = await auth.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, tenant_id: tenantId },
    },
  });
  step('supabase signUp done');
  if (authError) throw new Error(`Supabase Auth signup failed: ${authError.message}`);
  if (!authData.user) throw new Error('Supabase Auth signup returned no user');

  // signUp() sends the confirmation email automatically.
  // Do NOT call resend() here — it sends a second email and invalidates the
  // first OTP token, causing "Token has expired or is invalid" when the user
  // copies the code from the first email.

  // Set tenant_id in app_metadata so RLS policies can read it from JWT
  const { error: metaError } = await admin.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { tenant_id: tenantId },
  });
  step('app_metadata set');
  if (metaError) logger.warn({ err: metaError.message }, 'failed to set app_metadata.tenant_id');

  // Create Playsole user row linked to Supabase Auth
  const id = randomUUID();
  const passwordHash = hashPassword(password);
  const { error: userError } = await admin.from('users').insert({
    id, tenant_id: tenantId, primary_email: email,
    display_name: displayName, password_hash: passwordHash,
    auth_user_id: authData.user.id,
  });
  if (userError) throw new Error(`Failed to create Playsole user: ${userError.message}`);

  const { error: profileError } = await admin.from('profiles').insert({
    user_id: id, tenant_id: tenantId, email,
    display_name: displayName, locale: 'en',
  });
  if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

  const user: User = {
    id, tenantId, authUserId: authData.user.id, email, displayName,
    passwordHash, emailVerified: false, phoneVerified: false,
  };
  step('rows inserted');

  // Session is only returned when email confirmation is disabled in Supabase Auth.
  // When confirmation is required, the user must verify email before logging in.
  return {
    user,
    accessToken: authData.session?.access_token,
    refreshToken: authData.session?.refresh_token,
  };
}

/**
 * Login a user via Supabase Auth. Returns the Supabase Auth tokens
 * so they can be stored in the Playsole session for RLS enforcement.
 */
export async function loginWithSupabaseAuth(
  email: string, password: string,
): Promise<{ user: User; accessToken: string; refreshToken: string } | { error: string; errorDescription: string }> {
  const auth = getAuthClient();

  const { data: authData, error: authError } = await auth.auth.signInWithPassword({ email, password });
  if (authError) {
    const message = (authError as any)?.message ?? '';
    // Supabase returns a distinct error when the user hasn't verified email yet.
    if (/not confirmed|email_not_confirmed|confirm/i.test(message)) {
      return { error: 'email_not_confirmed', errorDescription: 'Please verify your email address before signing in.' };
    }
    return { error: 'invalid_credentials', errorDescription: 'Invalid email or password.' };
  }
  if (!authData.session) return { error: 'invalid_credentials', errorDescription: 'No session returned.' };

  // Find Playsole user by auth_user_id
  const user = await findUserByAuthId(authData.user.id);
  if (!user) return { error: 'not_found', errorDescription: 'User not found in Playsole.' };

  if (user.status === 'suspended') {
    return {
      error: 'account_suspended',
      errorDescription: 'Your account has been suspended. Please contact support for assistance (support@playsole.xyz).',
    };
  }

  if (user.status === 'disabled') {
    return {
      error: 'account_disabled',
      errorDescription: 'Your account has been disabled. Please contact support for assistance (support@playsole.xyz).',
    };
  }

  return {
    user,
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
  };
}

/**
 * Verify a Supabase Auth OTP (signup confirmation).
 *
 * Supabase's `verifyOtp({ type: 'signup' })` historically fails for newly
 * registered users with "Token has expired or is invalid" — a long-standing
 * known bug (supabase/auth#876, #12868). The generic `type: 'email'` (added
 * in supabase-js v2.40.3) covers both signup and magiclink tokens, so we try
 * it first, then fall back to `signup`/`magiclink` for older projects.
 *
 * Failed attempts do NOT burn the token, so trying multiple types is safe.
 */
export async function verifySupabaseOtp(
  email: string, token: string,
): Promise<{ success: boolean; error?: string; accessToken?: string; refreshToken?: string }> {
  const auth = getAuthClient();
  const types = ['email', 'signup', 'magiclink'] as const;
  let lastError: string | undefined;

  for (const type of types) {
    const { data, error } = await auth.auth.verifyOtp({ email, token, type });
    if (error) {
      lastError = error.message;
      continue;
    }

    // Mark the Playsole user's email as verified
    const user = await findUserByEmail(email);
    if (user) {
      await verifyUserEmail(user.id);
    }
    return {
      success: true,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };
  }

  return { success: false, error: lastError };
}

/**
 * Resend a Supabase Auth OTP (signup confirmation).
 */
export async function resendSupabaseOtp(
  email: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = getAuthClient();
  const { error } = await auth.auth.resend({ type: 'signup', email });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Create a Supabase Auth session for a user by their auth_user_id.
 * Used after magic link verification to get tokens for RLS enforcement.
 *
 * Generates a Supabase Auth magic link via the admin API, extracts the OTP
 * from the generated properties, and verifies it with the anon client to
 * obtain a session with access/refresh tokens.
 */
export async function createSupabaseSessionForUser(
  authUserId: string,
  email: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const admin = getSupabase() as any;
  const auth = getAuthClient();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkError || !linkData?.properties?.email_otp) {
    logger.warn({ err: linkError?.message ?? 'no OTP', authUserId }, 'failed to generate link');
    return null;
  }

  const { data: sessionData, error: sessionError } = await auth.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'magiclink',
  });
  if (sessionError || !sessionData?.session) {
    logger.warn({ err: sessionError?.message ?? 'no session', authUserId }, 'failed to verify magic link');
    return null;
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

export async function verifyUserEmail(userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error: userError } = await supabase.from('users').update({ email_verified: true }).eq('id', userId);
  if (userError) throw new Error(`Failed to verify email: ${userError.message}`);
  const { error: profileError } = await supabase.from('profiles').update({ email_verified: true }).eq('user_id', userId);
  if (profileError) throw new Error(`Failed to update profile email verification: ${profileError.message}`);
}

export async function verifyUserPhone(userId: string): Promise<void> {
  const { error } = await getSupabase().from('users').update({ phone_verified: true }).eq('id', userId);
  if (error) throw new Error(`Failed to verify phone: ${error.message}`);
}

// ── Login attempts & account lockout ──

export interface LoginAttemptRow {
  id: string;
  email: string;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  createdAt: string;
}

export async function recordLoginAttempt(attempt: {
  email: string; userId?: string; tenantId?: string;
  ipAddress?: string; userAgent?: string; success: boolean;
}): Promise<void> {
  const { error } = await getSupabase().from('login_attempts').insert({
    id: randomUUID(),
    identifier: attempt.email,
    user_id: attempt.userId ?? null,
    tenant_id: attempt.tenantId ?? null,
    ip_address: attempt.ipAddress ?? null,
    user_agent: attempt.userAgent ?? null,
    success: attempt.success,
  });
  if (error) logger.warn({ err: error.message }, 'failed to record login attempt');
}

export async function countRecentFailedAttempts(email: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await getSupabase()
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('identifier', email)
    .eq('success', false)
    .gte('created_at', since);
  if (error) {
    logger.warn({ err: error.message }, 'failed to count login attempts');
    return 0;
  }
  return count ?? 0;
}

/** True when the user's lockout timer (or repeated recent failures) is active. */
export async function isUserLockedOut(email: string): Promise<{ locked: boolean; retryAfterMs: number }> {
  const user = await findUserByEmail(email);

  if (user) {
    const { data } = await getSupabase()
      .from('users').select('locked_until').eq('id', user.id).maybeSingle();
    if (data?.locked_until) {
      const until = new Date(data.locked_until).getTime();
      const remaining = until - Date.now();
      if (remaining > 0) return { locked: true, retryAfterMs: remaining };
    }
  }

  // Even without a user row (unknown email), cap attempts per email so the
  // endpoint can't be used to spray password guesses at many emails.
  const recent = await countRecentFailedAttempts(email, config.lockoutWindowMs);
  if (recent >= config.maxFailedLoginAttempts) {
    return { locked: true, retryAfterMs: config.lockoutMs };
  }

  return { locked: false, retryAfterMs: 0 };
}

export async function recordLoginFailure(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const user = await findUserByEmail(email);
  await recordLoginAttempt({ email, userId: user?.id, tenantId: user?.tenantId, ipAddress, userAgent, success: false });

  if (user) {
    const recent = await countRecentFailedAttempts(email, config.lockoutWindowMs);
    const failedLoginCount = Math.min(recent, config.maxFailedLoginAttempts);
    const shouldLock = recent >= config.maxFailedLoginAttempts;
    await getSupabase().from('users').update({
      failed_login_count: failedLoginCount,
      last_failed_at: new Date().toISOString(),
      locked_until: shouldLock ? new Date(Date.now() + config.lockoutMs).toISOString() : null,
    }).eq('id', user.id);
  }
}

export async function recordLoginSuccess(email: string, userId: string, tenantId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await Promise.all([
    recordLoginAttempt({ email, userId, tenantId, ipAddress, userAgent, success: true }),
    getSupabase().from('users').update({
      failed_login_count: 0,
      last_failed_at: null,
      locked_until: null,
    }).eq('id', userId),
  ]);
}

// ── Verification Tokens ──

interface VerificationToken {
  token: string;
  userId: string;
  type: 'email' | 'phone';
  value: string;
  expiresAt: number;
}

export async function createVerificationToken(userId: string, type: 'email' | 'phone', value: string, ttlSec: number, tokenValue?: string): Promise<string> {
  const token = tokenValue ?? randomUUID();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const { error } = await getSupabase().from('verification_tokens').insert({ token: tokenHash, user_id: userId, type, value, expires_at: expiresAt });
  if (error) throw new Error(`Failed to create verification token: ${error.message}`);
  return token;
}

export async function consumeVerificationToken(token: string): Promise<VerificationToken | null> {
  const supabase = getSupabase();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data } = await supabase
    .from('verification_tokens')
    .delete()
    .eq('token', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .select()
    .maybeSingle();
  if (!data) return null;
  return { token: data.token, userId: data.user_id, type: data.type, value: data.value, expiresAt: new Date(data.expires_at).getTime() };
}

// ── Magic Link Tokens ──

interface MagicLinkToken {
  token: string;
  email: string;
  userId: string;
  returnTo?: string;
  expiresAt: number;
}

export async function createMagicLink(email: string, userId: string, ttlSec: number, returnTo?: string): Promise<string> {
  const token = randomUUID();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const { error } = await getSupabase().from('magic_links').insert({ token: tokenHash, email, user_id: userId, expires_at: expiresAt, return_to: returnTo ?? null });
  if (error) throw new Error(`Failed to create magic link: ${error.message}`);
  return token;
}

export async function consumeMagicLink(token: string): Promise<MagicLinkToken | null> {
  const supabase = getSupabase();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data } = await supabase
    .from('magic_links')
    .delete()
    .eq('token', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .select()
    .maybeSingle();
  if (!data) return null;
  return { token: data.token, email: data.email, userId: data.user_id, returnTo: data.return_to ?? undefined, expiresAt: new Date(data.expires_at).getTime() };
}

// ── OIDC Clients ──

export interface OidcClient {
  id: string;
  tenantId: string;
  clientId: string;
  clientSecret?: string;
  redirectUris: string[];
  grantTypes: string[];
  scopes: string[];
  publicClient: boolean;
  requiresDpop: boolean;
}

function toClient(row: any): OidcClient {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    clientSecret: row.client_secret ?? undefined,
    redirectUris: row.redirect_uris ?? [],
    grantTypes: row.grant_types ?? [],
    scopes: row.scopes ?? [],
    publicClient: row.public_client ?? true,
    requiresDpop: row.requires_dpop ?? false,
  };
}

export async function getClient(clientId: string): Promise<OidcClient | undefined> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from('clients').select('*').eq('client_id', clientId).maybeSingle();
    return data ? toClient(data) : undefined;
  } catch (err: any) {
    logger.warn({ err: err?.message, clientId }, 'Failed to fetch client from database');
    return undefined;
  }
}

export async function validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from('clients').select('redirect_uris').eq('client_id', clientId).maybeSingle();
    if (!data) return false;
    return data.redirect_uris?.includes(redirectUri) ?? false;
  } catch (err: any) {
    logger.warn({ err: err?.message, clientId, redirectUri }, 'Failed to validate redirect URI');
    return false;
  }
}
