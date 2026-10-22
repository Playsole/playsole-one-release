import { Router } from 'express';
import { z } from 'zod';
import { createHash, randomInt } from 'node:crypto';
import { audit } from '@playsole-one/shared';
import {
  createBackupCodes, getBackupCodeStats, consumeBackupCode, deleteBackupCodes,
  listTotpMethods, listWebAuthnCredentials,
} from '../store';
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

function randomGroup(digits: number): string {
  return String(randomInt(0, 10 ** digits)).padStart(digits, '0');
}

/** Format like `abcde-fghij` — readable and unambiguous. */
export function generateBackupCode(): string {
  return `${randomGroup(5)}-${randomGroup(5)}`;
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Generate a fresh set of backup codes (replaces any previous set). The
 * plaintext codes are returned exactly once; only hashes are persisted.
 * Requires at least one active primary factor (TOTP or Passkey).
 */
router.post('/mfa/backup-codes', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const [totp, webauthn] = await Promise.all([
    listTotpMethods(auth.userId),
    listWebAuthnCredentials(auth.userId),
  ]);
  const hasPrimary = totp.some((t) => t.verified) || webauthn.length > 0;
  if (!hasPrimary) {
    res.status(400).json({
      error: 'mfa_not_enrolled',
      error_description: 'You must enroll an authenticator app or passkey before generating backup codes.',
    });
    return;
  }

  const codes = Array.from({ length: config.backupCodeCount }, () => generateBackupCode());
  const hashes = codes.map(hashBackupCode);

  await deleteBackupCodes(auth.userId);
  await createBackupCodes(auth.userId, hashes);

  void audit({ eventType: 'mfa.backup_codes_generated', userId: auth.userId, tenantId: auth.tenantId, metadata: { count: codes.length } });
  res.status(201).json({ codes });
});

/** Backup code status (counts only — never the plaintext). */
router.get('/mfa/backup-codes', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const stats = await getBackupCodeStats(auth.userId);
  res.json({ ...stats, remaining: stats.total - stats.used });
});

/** Verify a backup code during login (single-use). */
router.post('/mfa/backup-codes/challenge', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'A backup code is required.' });
    return;
  }

  const rawCode = parsed.data.code.trim();
  let ok = await consumeBackupCode(auth.userId, hashBackupCode(rawCode));

  // If not matched, try formatting variations (e.g. user entered without hyphen or with spaces)
  if (!ok) {
    const alnum = rawCode.replace(/[^0-9a-zA-Z]/g, '');
    if (alnum.length === 10) {
      const hyphenated = `${alnum.slice(0, 5)}-${alnum.slice(5)}`;
      ok = await consumeBackupCode(auth.userId, hashBackupCode(hyphenated));
    }
  }
  if (!ok && rawCode.includes('-')) {
    const unhyphenated = rawCode.replace(/-/g, '');
    ok = await consumeBackupCode(auth.userId, hashBackupCode(unhyphenated));
  }
  if (!ok) {
    ok = await consumeBackupCode(auth.userId, hashBackupCode(rawCode.toLowerCase()));
  }
  if (!ok) {
    ok = await consumeBackupCode(auth.userId, hashBackupCode(rawCode.toUpperCase()));
  }

  if (!ok) {
    void audit({ eventType: 'mfa.backup_code_failed', userId: auth.userId, tenantId: auth.tenantId });
    res.status(400).json({ error: 'invalid_code', error_description: 'That backup code is invalid or already used.' });
    return;
  }

  void audit({ eventType: 'mfa.backup_code_verified', userId: auth.userId, tenantId: auth.tenantId });
  res.json({ ok: true, method: 'backup-code' });
});

export { router as backupCodesRouter };