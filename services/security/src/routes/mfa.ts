import { Router } from 'express';
import { z } from 'zod';
import { audit } from '@playsole-one/shared';
import {
  getUserMfaState, setUserMfaState,
  createTotpSecret, getTotpSecret, getVerifiedTotp, listTotpMethods, markTotpVerified, deleteTotpSecret,
  listWebAuthnCredentials,
  getBackupCodeStats, deleteBackupCodes,
  isMfaRequired, getMfaPolicy, setMfaPolicy,
} from '../store';
import { generateSecret, otpauthUrl, verifyTotp } from '../totp';
import { config } from '../config';

const router = Router();

function requireUser(req: Record<string, any>, res: any): { userId: string; tenantId?: string } | null {
  const userId = req.headers['x-authenticated-user-id'];
  if (userId && typeof userId === 'string') {
    const tenantId = req.headers['x-tenant-id'];
    return { userId, tenantId: typeof tenantId === 'string' ? tenantId : undefined };
  }
  res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid authentication.' });
  return null;
}

/**
 * MFA status for a user — used by the login flow to decide whether to step up
 * to a challenge, and by the security settings page.
 */
router.get('/mfa/status', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const state = await getUserMfaState(auth.userId);
  const totp = await listTotpMethods(auth.userId);
  const webauthn = await listWebAuthnCredentials(auth.userId);
  const backupCodes = await getBackupCodeStats(auth.userId);
  const clientId = req.query.client_id && typeof req.query.client_id === 'string' ? req.query.client_id : undefined;
  const mfaRequired = await isMfaRequired(auth.tenantId ?? '00000000-0000-0000-0000-000000000001', clientId);

  const verifiedTotp = totp.filter((t) => t.verified);
  const primaryMethods = [
    ...verifiedTotp.map((t) => ({ type: 'totp', id: t.id, name: t.name, createdAt: t.createdAt })),
    ...webauthn.map((c) => ({ type: 'webauthn', id: c.id, name: c.deviceLabel, createdAt: c.createdAt })),
  ];

  const hasPrimaryMfa = primaryMethods.length > 0;
  res.json({
    mfaEnabled: hasPrimaryMfa,
    mfaRequired,
    hasMfa: hasPrimaryMfa,
    methods: primaryMethods,
    backupCodes,
  });
});

/** List enrolled MFA methods. */
router.get('/mfa', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const [totp, webauthn, backupCodes] = await Promise.all([
    listTotpMethods(auth.userId),
    listWebAuthnCredentials(auth.userId),
    getBackupCodeStats(auth.userId),
  ]);

  res.json({
    totp: totp.map((t) => ({ id: t.id, name: t.name, verified: t.verified, createdAt: t.createdAt })),
    webauthn: webauthn.map((c) => ({ id: c.id, name: c.deviceLabel, createdAt: c.createdAt, lastUsedAt: c.lastUsedAt })),
    backupCodes,
  });
});

/** Begin TOTP enrollment — returns the base32 secret + otpauth URL. */
router.post('/mfa/totp', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({ name: z.string().max(128).optional() }).safeParse(req.body ?? {});
  const name = parsed.success && parsed.data.name ? parsed.data.name : 'Authenticator app';

  const existing = await getVerifiedTotp(auth.userId);
  if (existing) {
    res.status(409).json({ error: 'already_enrolled', error_description: 'TOTP is already enrolled for this account.' });
    return;
  }

  const secret = generateSecret();
  const method = await createTotpSecret(auth.userId, secret, name);

  res.status(201).json({
    id: method.id,
    secret: method.secret,
    otpauthUrl: otpauthUrl(method.secret, auth.userId, config.rpName),
    expiresIn: 600,
  });
});

/** Confirm TOTP enrollment by verifying the current code. */
router.post('/mfa/totp/:id/verify', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({ code: z.string().min(6).max(8) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'A verification code is required.' });
    return;
  }

  const method = await getTotpSecret(req.params.id, auth.userId);
  if (!method) {
    res.status(404).json({ error: 'not_found', error_description: 'TOTP enrollment not found.' });
    return;
  }

  if (!verifyTotp(method.secret, parsed.data.code, 0)) {
    res.status(400).json({ error: 'invalid_code', error_description: 'That code is invalid or expired.' });
    return;
  }

  await markTotpVerified(method.id, auth.userId);
  const state = await getUserMfaState(auth.userId);
  const methods = [
    ...state.mfaMethods.filter((m) => m.type !== 'totp'),
    { type: 'totp', id: method.id, name: method.name, createdAt: new Date().toISOString() },
  ];
  await setUserMfaState(auth.userId, true, methods);

  void audit({ eventType: 'mfa.totp_enrolled', userId: auth.userId, tenantId: auth.tenantId });
  res.json({ ok: true, mfaEnabled: true });
});

/** Remove a TOTP method. */
router.delete('/mfa/totp/:id', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const removed = await deleteTotpSecret(req.params.id, auth.userId);
  if (!removed) {
    res.status(404).json({ error: 'not_found', error_description: 'TOTP method not found.' });
    return;
  }

  const [remainingTotp, webauthn] = await Promise.all([
    listTotpMethods(auth.userId),
    listWebAuthnCredentials(auth.userId),
  ]);
  const verifiedTotp = remainingTotp.filter((t) => t.verified);
  const hasRemainingPrimary = verifiedTotp.length > 0 || webauthn.length > 0;
  const methods = [
    ...verifiedTotp.map((t) => ({ type: 'totp', id: t.id, name: t.name, createdAt: t.createdAt })),
    ...webauthn.map((c) => ({ type: 'webauthn', id: c.id, name: c.deviceLabel, createdAt: c.createdAt })),
  ];
  await setUserMfaState(auth.userId, hasRemainingPrimary, methods);
  if (!hasRemainingPrimary) {
    await deleteBackupCodes(auth.userId).catch(() => {});
  }

  void audit({ eventType: 'mfa.totp_removed', userId: auth.userId, tenantId: auth.tenantId });
  res.status(204).end();
});

/** Verify a TOTP code during login (challenge). */
router.post('/mfa/totp/challenge', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({ code: z.string().min(6).max(8) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'A verification code is required.' });
    return;
  }

  const method = await getVerifiedTotp(auth.userId);
  if (!method) {
    res.status(409).json({ error: 'no_method', error_description: 'No TOTP method is enrolled for this account.' });
    return;
  }

  if (!verifyTotp(method.secret, parsed.data.code)) {
    void audit({ eventType: 'mfa.totp_failed', userId: auth.userId, tenantId: auth.tenantId });
    res.status(400).json({ error: 'invalid_code', error_description: 'That code is invalid or expired.' });
    return;
  }

  void audit({ eventType: 'mfa.totp_verified', userId: auth.userId, tenantId: auth.tenantId });
  res.json({ ok: true, method: 'totp' });
});

/**
 * MFA enforcement policy for a tenant (client_id omitted = tenant-wide default).
 * Managed server-side (the Phase 4 admin dashboard will expose this to admins).
 */
router.get('/mfa/policy', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const clientId = req.query.client_id && typeof req.query.client_id === 'string' ? req.query.client_id : undefined;
  const tenantId = auth.tenantId ?? '00000000-0000-0000-0000-000000000001';
  const policy = await getMfaPolicy(tenantId, clientId);
  res.json({
    tenantId,
    clientId: policy?.clientId ?? null,
    required: policy?.required ?? false,
  });
});

router.put('/mfa/policy', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({
    clientId: z.string().nullable().optional(),
    required: z.boolean(),
  }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  const tenantId = auth.tenantId ?? '00000000-0000-0000-0000-000000000001';
  await setMfaPolicy(tenantId, parsed.data.clientId ?? null, parsed.data.required);
  void audit({
    eventType: parsed.data.required ? 'mfa.policy_required' : 'mfa.policy_optional',
    tenantId,
    metadata: { clientId: parsed.data.clientId ?? null },
  });
  res.json({ ok: true, tenantId, clientId: parsed.data.clientId ?? null, required: parsed.data.required });
});

export { router as mfaRouter };