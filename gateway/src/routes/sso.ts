import crypto from 'node:crypto';
import express, { Request, Response, Router } from 'express';
import { getSupabase, getStateStore, audit, createLogger } from '@playsole-one/shared';
import { renderAccountChooserView, AccountChooserUser } from '../accountChooserView';
import { sessionCookieName, sessionCookieOptions, deviceCookieName, ssoCookieDomain } from '../cookies';
import { deleteSession } from '../bffClient';
import { invalidateSessionCache } from '../middleware/session';

const logger = createLogger('gateway:sso');
const router = Router();
const stateStore = getStateStore();

const HANDOFF_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch profile details for account chooser without re-authentication (Item 60)
 */
async function getAccountUser(userId: string): Promise<AccountChooserUser | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, primary_email, display_name, avatar_url, status')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    let avatarUrl = data.avatar_url;
    if (!avatarUrl || !avatarUrl.startsWith('http')) {
      try {
        const { data: p } = await supabase.from('profiles').select('avatar_url').eq('user_id', userId).maybeSingle();
        if (p?.avatar_url && p.avatar_url.startsWith('http')) {
          avatarUrl = p.avatar_url;
        }
      } catch {
        // Fallback
      }
    }

    return {
      id: data.id,
      email: data.primary_email,
      displayName: data.display_name || data.primary_email.split('@')[0],
      avatarUrl: avatarUrl,
      isActive: data.status === 'active',
    };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to fetch user for account chooser');
    return null;
  }
}

// GET /sso/accounts — Programmatic JSON endpoint returning active session user profile (Item 60)
router.get('/accounts', async (req: Request, res: Response) => {
  if (!req.userId) {
    res.json({ authenticated: false, accounts: [] });
    return;
  }
  const user = await getAccountUser(req.userId);
  res.json({
    authenticated: true,
    activeUser: user,
    accounts: user ? [user] : [],
  });
});

// GET /sso/chooser (and alias /account-chooser) — Apple-style Account Chooser UI (Item 61)
router.get(['/chooser', '/account-chooser'], async (req: Request, res: Response) => {
  const returnTo = (req.query.return_to as string) || '/dashboard';
  const clientId = (req.query.client_id as string) || undefined;
  const message = (req.query.message as string) || undefined;
  const error = (req.query.error as string) || undefined;

  let clientName = 'Playsole Services';
  if (clientId) {
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from('clients').select('client_id').eq('client_id', clientId).maybeSingle();
      if (data) {
        clientName = data.client_id === 'playsole-dev' ? 'Playsole Developer Studio' : data.client_id;
      }
    } catch {
      // ignore
    }
  }

  let activeUser: AccountChooserUser | null = null;
  if (req.userId) {
    activeUser = await getAccountUser(req.userId);
  }

  const html = renderAccountChooserView({
    activeUser,
    accounts: activeUser ? [activeUser] : [],
    clientName,
    clientId,
    returnTo,
    message,
    error,
  });

  res.send(html);
});

// GET & POST /sso/switch — Account switching (Item 62)
router.all('/switch', async (req: Request, res: Response) => {
  const targetUserId = (req.query.user_id || req.body?.user_id) as string | undefined;
  const returnTo = (req.query.return_to || req.body?.return_to || '/dashboard') as string;

  if (!targetUserId) {
    res.redirect(302, `/login?return_to=${encodeURIComponent(returnTo)}`);
    return;
  }

  // If user is selecting the currently active user, redirect immediately
  if (req.userId === targetUserId) {
    res.redirect(302, returnTo);
    return;
  }

  // To switch identities, redirect to login with user hint and prompt
  res.redirect(302, `/login?login_hint=${encodeURIComponent(targetUserId)}&return_to=${encodeURIComponent(returnTo)}&prompt=login`);
});

// POST /sso/handoff/create — Generate secure cross-device session handoff token (Item 64)
router.post('/handoff/create', async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const handoffToken = crypto.randomBytes(24).toString('base64url');
  const payload = {
    userId: req.userId,
    tenantId: req.tenantId,
    createdAt: Date.now(),
  };

  await stateStore.setJsonWithTtl(`sso:handoff:${handoffToken}`, payload, HANDOFF_TTL_MS);

  // Also record in sso_handoff_tokens in Supabase if table exists
  try {
    const supabase = getSupabase();
    await supabase.from('sso_handoff_tokens').insert({
      token: handoffToken,
      user_id: req.userId,
      tenant_id: req.tenantId,
      expires_at: new Date(Date.now() + HANDOFF_TTL_MS).toISOString(),
    });
  } catch {
    // Non-blocking if table is provisioning
  }

  await audit({
    eventType: 'sso.handoff.created',
    userId: req.userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    handoffToken,
    expiresIn: HANDOFF_TTL_MS / 1000,
    claimUrl: `/sso/handoff/${handoffToken}`,
  });
});

// GET /sso/handoff/:token — Claim cross-device session handoff on mobile / target browser (Item 64)
router.get('/handoff/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  const returnTo = (req.query.return_to as string) || '/dashboard';

  const stored = await stateStore.getJson<{ userId: string; tenantId: string }>(`sso:handoff:${token}`);
  if (!stored) {
    res.redirect(302, `/login?error=${encodeURIComponent('Mobile handoff token has expired or is invalid.')}`);
    return;
  }

  // Consume single-use handoff token
  await stateStore.del(`sso:handoff:${token}`);

  // Create session for user
  try {
    const supabase = getSupabase();
    const sessionId = crypto.randomUUID();

    const { error: sessionError } = await supabase.from('sessions').insert({
      id: sessionId,
      user_id: stored.userId,
      tenant_id: stored.tenantId,
      created_at: new Date().toISOString(),
    });

    if (sessionError) throw sessionError;

    // Set shared SSO session cookie
    res.cookie(sessionCookieName(), sessionId, sessionCookieOptions());

    await audit({
      eventType: 'sso.handoff.claimed',
      userId: stored.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.redirect(302, returnTo);
  } catch (err: any) {
    logger.error({ err }, 'Handoff claim failed');
    res.redirect(302, `/login?error=${encodeURIComponent('Failed to link mobile session.')}`);
  }
});

// GET & POST /sso/logout — Single sign-out across all Playsole apps (Item 65)
router.all('/logout', async (req: Request, res: Response) => {
  const cookieName = sessionCookieName();
  const sessionId =
    req.cookies?.[cookieName] ||
    req.cookies?.['__Secure-playsole_session'] ||
    req.cookies?.['__Host-playsole_session'] ||
    req.cookies?.['playsole_session'];

  const returnTo = (req.query.return_to || req.body?.return_to || '/login') as string;

  if (sessionId) {
    try {
      invalidateSessionCache(sessionId);
      void deleteSession(sessionId);
    } catch {
      // Ignore deletion errors
    }

    if (req.userId) {
      await audit({
        eventType: 'user.sso.logout',
        userId: req.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    // Clear session cookies across root domain and default path
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

  // Fix #5: use & if returnTo already contains ? to avoid a malformed double-? URL.
  const sep = returnTo.includes('?') ? '&' : '?';
  res.redirect(302, `${returnTo}${sep}message=${encodeURIComponent('You have been signed out of all Playsole apps.')}`);
});

export { router as ssoRouter };
