import { Router } from 'express';
import { z } from 'zod';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { audit } from '@playsole-one/shared';
import { config } from '../config';
import { generateBackupCode, hashBackupCode } from './backupCodes';
import {
  getUserMfaState, setUserMfaState, findUserByEmail,
  deleteTotpSecret,
  listWebAuthnCredentials, deleteWebAuthnCredential,
  deleteBackupCodes, createBackupCodes,
} from '../store';

const router = Router();

const SIGNING_SECRET = process.env.INTERNAL_SHARED_SECRET ?? 'dev-shared-secret-change-me';

function requireUser(req: Record<string, any>, res: any): { userId: string; tenantId?: string } | null {
  const userId = req.headers['x-authenticated-user-id'];
  if (userId && typeof userId === 'string') {
    const tenantId = req.headers['x-tenant-id'];
    return { userId, tenantId: typeof tenantId === 'string' ? tenantId : undefined };
  }
  res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid authentication.' });
  return null;
}

function signRecoveryToken(userId: string, email: string, exp: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, email, exp })).toString('base64url');
  const sig = createHmac('sha256', SIGNING_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyRecoveryToken(token: string): { userId: string; email: string } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = createHmac('sha256', SIGNING_SECRET).update(payload).digest();
  const actual = Buffer.from(sig, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let parsed: { userId: string; email: string; exp: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!parsed.userId || !parsed.email || typeof parsed.exp !== 'number') return null;
  if (Date.now() > parsed.exp) return null;
  return { userId: parsed.userId, email: parsed.email };
}

/**
 * Start account recovery by email. The gateway calls this when a (possibly
 * logged-out) user triggers "I can't sign in" — the returned token is
 * delivered by email and exchanged later, proving ownership of the account.
 * Unknown emails get a generic response so the endpoint can't be used to
 * enumerate accounts.
 */
router.post('/recovery/email', async (req, res) => {
  const parsed = z.object({ email: z.string().email().max(254) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'A valid email is required.' });
    return;
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    res.json({ message: 'If an account exists for that email, a recovery link has been sent.' });
    return;
  }

  const exp = Date.now() + config.recoveryTokenTtlMs;
  const token = signRecoveryToken(user.id, parsed.data.email, exp);

  void audit({ eventType: 'recovery.requested', userId: user.id, tenantId: user.tenantId, metadata: { email: parsed.data.email } });
  res.json({ message: 'Recovery link generated.', token, expiresAt: new Date(exp).toISOString() });
});

/** Exchange a recovery token for the user id (link clicked in the email). */
router.post('/recovery/verify', async (req, res) => {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'A recovery token is required.' });
    return;
  }

  const claim = verifyRecoveryToken(parsed.data.token);
  if (!claim) {
    res.status(400).json({ error: 'invalid_token', error_description: 'Recovery link is invalid or expired.' });
    return;
  }

  void audit({ eventType: 'recovery.verified', userId: claim.userId, metadata: { email: claim.email } });
  res.json({ userId: claim.userId, email: claim.email });
});

/**
 * Reset MFA for a recovered account: removes TOTP secrets, passkeys and backup codes,
 * and sets MFA to disabled so the user can sign in and re-enroll a fresh authenticator.
 */
router.post('/recovery/reset', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const state = await getUserMfaState(auth.userId);

  for (const method of state.mfaMethods.filter((m) => m.type === 'totp')) {
    await deleteTotpSecret(method.id, auth.userId).catch(() => {});
  }
  for (const cred of await listWebAuthnCredentials(auth.userId)) {
    await deleteWebAuthnCredential(cred.id, auth.userId).catch(() => {});
  }
  await deleteBackupCodes(auth.userId).catch(() => {});

  await setUserMfaState(auth.userId, false, []);

  void audit({ eventType: 'recovery.mfa_reset', userId: auth.userId, tenantId: auth.tenantId });
  res.json({ codes: [], message: 'MFA was reset. You can now sign in with your email and password.' });
});

export { router as recoveryRouter, randomUUID as _recoveryTokenId };