import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { audit } from '@playsole-one/shared';
import {
  getUserMfaState, setUserMfaState,
  listWebAuthnCredentials, getWebAuthnCredential, createWebAuthnCredential,
  updateCredentialCounter, deleteWebAuthnCredential,
  createMfaChallenge, consumeMfaChallenge,
  listTotpMethods, getBackupCodeStats, deleteBackupCodes,
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

function newChallenge(): string {
  return randomBytes(32).toString('base64url');
}

function b64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(value, 'base64url');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function decodeClientData(clientDataJSON: string): { challenge: string; type: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8'));
    if (typeof parsed?.challenge !== 'string') return null;
    return { challenge: parsed.challenge, type: parsed.type };
  } catch {
    return null;
  }
}

/**
 * Start a WebAuthn registration (enrollment). Returns PublicKeyCredentialCreationOptions
 * and persists the challenge so the verify step can be matched against it.
 */
router.post('/mfa/webauthn/register/options', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({ deviceLabel: z.string().max(128).optional() }).safeParse(req.body ?? {});
  const deviceLabel = parsed.success && parsed.data.deviceLabel ? parsed.data.deviceLabel : 'Security key';

  const existing = await listWebAuthnCredentials(auth.userId);
  const excludeCredentials = existing.map((c) => ({
    id: c.credentialId,
    type: 'public-key' as const,
    transports: c.transports as any,
  }));

  const challenge = newChallenge();
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpId,
    userName: auth.userId,
    userID: Buffer.from(auth.userId, 'utf8'),
    challenge,
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await createMfaChallenge(challenge, 'registration', auth.userId, { deviceLabel, username: auth.userId });

  res.json(options);
});

const registrationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal('public-key'),
  clientExtensionResults: z.record(z.any()).optional(),
  response: z.object({
    clientDataJSON: z.string().min(1),
    attestationObject: z.string().min(1),
    transports: z.array(z.string()).optional(),
  }),
});

/** Verify a WebAuthn attestation and store the credential. */
router.post('/mfa/webauthn/register', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({
    response: registrationResponseSchema,
    deviceLabel: z.string().max(128).optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Invalid registration response.' });
    return;
  }

  const clientData = decodeClientData(parsed.data.response.response.clientDataJSON);
  if (!clientData || clientData.type !== 'webauthn.create') {
    res.status(400).json({ error: 'invalid_response', error_description: 'Malformed client data.' });
    return;
  }

  const challenge = await consumeMfaChallenge(clientData.challenge, 'registration');
  if (!challenge) {
    res.status(400).json({ error: 'invalid_challenge', error_description: 'Registration challenge is invalid or expired.' });
    return;
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: parsed.data.response as any,
      expectedChallenge: clientData.challenge,
      expectedOrigin: config.rpOrigin,
      expectedRPID: config.rpId,
      requireUserVerification: false,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'verification_failed', error_description: err?.message ?? 'Registration verification failed.' });
    return;
  }

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: 'verification_failed', error_description: 'Registration could not be verified.' });
    return;
  }

  const credentialId = verification.registrationInfo.credential.id;
  const publicKey = Buffer.from(verification.registrationInfo.credential.publicKey).toString('base64url');
  const transports = parsed.data.response.response.transports ?? [];
  const deviceLabel = parsed.data.deviceLabel ?? (challenge.payload?.deviceLabel as string) ?? 'Security key';

  const credential = await createWebAuthnCredential(auth.userId, credentialId, publicKey, deviceLabel, transports);

  const state = await getUserMfaState(auth.userId);
  const methods = [
    ...state.mfaMethods.filter((m) => m.type !== 'webauthn'),
    { type: 'webauthn', id: credential.id, name: deviceLabel, createdAt: new Date().toISOString() },
  ];
  await setUserMfaState(auth.userId, true, methods);

  void audit({ eventType: 'mfa.webauthn_enrolled', userId: auth.userId, tenantId: auth.tenantId, metadata: { credentialId } });
  res.status(201).json({ ok: true, id: credential.id, name: deviceLabel });
});

/**
 * Start a WebAuthn assertion (login challenge). Returns PublicKeyCredentialRequestOptions
 * scoped to the user's registered credentials and persists the challenge.
 */
router.post('/mfa/webauthn/authenticate/options', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const credentials = await listWebAuthnCredentials(auth.userId);
  const allowCredentials = credentials.map((c) => ({
    id: c.credentialId,
    type: 'public-key' as const,
    transports: c.transports as any,
  }));

  const challenge = newChallenge();
  const options = await generateAuthenticationOptions({
    rpID: config.rpId,
    allowCredentials,
    challenge,
    userVerification: 'preferred',
  });

  await createMfaChallenge(challenge, 'authentication', auth.userId, { username: auth.userId });

  res.json(options);
});

const authenticationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal('public-key'),
  clientExtensionResults: z.record(z.any()).optional(),
  response: z.object({
    clientDataJSON: z.string().min(1),
    authenticatorData: z.string().min(1),
    signature: z.string().min(1),
    userHandle: z.string().optional(),
  }),
});

/** Verify a WebAuthn assertion against a stored credential. */
router.post('/mfa/webauthn/authenticate', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({ response: authenticationResponseSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Invalid assertion response.' });
    return;
  }

  const clientData = decodeClientData(parsed.data.response.response.clientDataJSON);
  if (!clientData || clientData.type !== 'webauthn.get') {
    res.status(400).json({ error: 'invalid_response', error_description: 'Malformed client data.' });
    return;
  }

  const stored = await getWebAuthnCredential(parsed.data.response.id, auth.userId);
  if (!stored) {
    res.status(404).json({ error: 'credential_not_found', error_description: 'This credential is not registered to your account.' });
    return;
  }

  const challenge = await consumeMfaChallenge(clientData.challenge, 'authentication');
  if (!challenge) {
    res.status(400).json({ error: 'invalid_challenge', error_description: 'Authentication challenge is invalid or expired.' });
    return;
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: parsed.data.response as any,
      expectedChallenge: clientData.challenge,
      expectedOrigin: config.rpOrigin,
      expectedRPID: config.rpId,
      credential: {
        id: stored.credentialId,
        publicKey: b64urlToBytes(stored.publicKey),
        counter: stored.counter,
      },
      requireUserVerification: false,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'verification_failed', error_description: err?.message ?? 'Assertion verification failed.' });
    return;
  }

  if (!verification.verified) {
    res.status(400).json({ error: 'verification_failed', error_description: 'Assertion could not be verified.' });
    return;
  }

  await updateCredentialCounter(stored.id, auth.userId, verification.authenticationInfo.newCounter);

  void audit({ eventType: 'mfa.webauthn_verified', userId: auth.userId, tenantId: auth.tenantId, metadata: { credentialId: stored.credentialId } });
  res.json({ ok: true, method: 'webauthn' });
});

/** Remove a WebAuthn credential. */
router.delete('/mfa/webauthn/:id', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const removed = await deleteWebAuthnCredential(req.params.id, auth.userId);
  if (!removed) {
    res.status(404).json({ error: 'not_found', error_description: 'Credential not found.' });
    return;
  }

  const [totp, remainingWebAuthn] = await Promise.all([
    listTotpMethods(auth.userId),
    listWebAuthnCredentials(auth.userId),
  ]);
  const verifiedTotp = totp.filter((t) => t.verified);
  const hasRemainingPrimary = verifiedTotp.length > 0 || remainingWebAuthn.length > 0;
  const methods = [
    ...verifiedTotp.map((t) => ({ type: 'totp', id: t.id, name: t.name, createdAt: t.createdAt })),
    ...remainingWebAuthn.map((c) => ({ type: 'webauthn', id: c.id, name: c.deviceLabel, createdAt: c.createdAt })),
  ];
  await setUserMfaState(auth.userId, hasRemainingPrimary, methods);
  if (!hasRemainingPrimary) {
    await deleteBackupCodes(auth.userId).catch(() => {});
  }

  void audit({ eventType: 'mfa.webauthn_removed', userId: auth.userId, tenantId: auth.tenantId });
  res.status(204).end();
});

export { router as webauthnRouter };