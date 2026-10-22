import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { consumeAuthCode, createSession, createRefreshToken, consumeRefreshToken, revokeRefreshTokensByFamily, getSession } from '../sessionClient';
import { signJwt } from '../keys';
import { config } from '../config';
import { getClient } from '../store';
import { audit, getStateStore, createLogger, getSupabase } from '@playsole-one/shared';
import { verifyDpopProof } from '../dpop';

const logger = createLogger('auth');

const router = Router();

// Replay protection for DPoP proofs within their validity window (Redis-backed;
// in-memory dev fallback when Redis is not configured).
const seenJti = getStateStore();

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  if (typeof codeVerifier !== 'string' || typeof codeChallenge !== 'string') return false;
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url') === codeChallenge;
}

function verifyClientSecret(providedSecret: string | undefined, storedSecretOrHash: string | undefined): boolean {
  if (!providedSecret || !storedSecretOrHash) return false;
  const hash = crypto.createHash('sha256').update(providedSecret).digest('hex');
  if (hash.toLowerCase() === storedSecretOrHash.toLowerCase()) return true;
  if (providedSecret === storedSecretOrHash) return true;
  return false;
}

/**
 * Validate an optional DPoP proof against this token request. Returns the
 * client key thumbprint (jkt) when a valid proof is presented, or null when no
 * proof was sent. Throws with an error object when a proof was sent but is
 * invalid.
 */
async function resolveDpopJkt(req: any): Promise<string | null> {
  const proof = req.headers['dpop'] as string | undefined;
  if (!proof) return null;

  const result = await verifyDpopProof(proof, {
    htu: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    htm: req.method,
    seenJti,
  });
  if (!result.ok) {
    const err: any = new Error(result.error ?? 'Invalid DPoP proof.');
    err.status = 400;
    err.errorCode = 'invalid_dpop_proof';
    throw err;
  }
  return result.jkt!;
}

const authCodeGrantSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  code_verifier: z.string().optional(),
  redirect_uri: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
});

const refreshGrantSchema = z.object({
  grant_type: z.literal('refresh_token'),
  refresh_token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
});

router.options('/token', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, DPoP, Accept');
  res.sendStatus(204);
});

router.post('/token', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, DPoP, Accept');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  const body = { ...(req.body ?? {}) };

  // Support standard HTTP Basic client authentication (client_secret_basic)
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx !== -1) {
        body.client_id ??= decodeURIComponent(decoded.slice(0, colonIdx));
        body.client_secret ??= decodeURIComponent(decoded.slice(colonIdx + 1));
      }
    } catch {
      // ignore base64 decode failure
    }
  }

  try {
    if (body.grant_type === 'authorization_code') {
      const parsed = authCodeGrantSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
        return;
      }

      const client = await getClient(parsed.data.client_id);
      if (!client) {
        res.status(400).json({ error: 'unauthorized_client', error_description: 'Unknown client.' });
        return;
      }

      // Enforce client_secret verification for confidential clients
      if (client.clientSecret || !client.publicClient) {
        if (!parsed.data.client_secret || !verifyClientSecret(parsed.data.client_secret, client.clientSecret)) {
          res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed (invalid or missing client_secret).' });
          return;
        }
      }

      // DPoP: sensitive clients must present a valid proof; others may.
      const jkt = await resolveDpopJkt(req);
      if (client.requiresDpop && !jkt) {
        res.status(400).json({ error: 'invalid_request', error_description: 'DPoP proof required for this client.' });
        return;
      }

      const authCode = await consumeAuthCode(parsed.data.code);
      if (!authCode) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired or invalid.' });
        return;
      }

      if (authCode.codeChallenge) {
        if (!parsed.data.code_verifier || !verifyPkce(parsed.data.code_verifier, authCode.codeChallenge as string)) {
          res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed.' });
          return;
        }
      }

      if (authCode.clientId !== parsed.data.client_id) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Client ID mismatch.' });
        return;
      }

      if (authCode.redirectUri !== parsed.data.redirect_uri) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch.' });
        return;
      }

      // Create a real session row first so the refresh token's FK is satisfied.
      const created = await createSession(authCode.userId as string, authCode.tenantId as string);
      const sessionId = created.id;
      const family = randomUUID();

      const accessToken = await signJwt(
        { sub: authCode.userId as string, client_id: authCode.clientId, scope: authCode.scope, session_id: sessionId, ...(jkt ? { cnf: { jkt } } : {}) },
        config.accessTokenTtlSec,
      );

      let userRow: any = null;
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('users')
          .select('id, primary_email, display_name, avatar_url, email_verified')
          .eq('id', authCode.userId)
          .maybeSingle();
        userRow = data;
      } catch {
        // Non-blocking fallback
      }

      const host = req.get('x-forwarded-host') || req.get('host');
      let issuer = config.issuer;
      if (process.env.OIDC_ISSUER || process.env.BASE_URL || process.env.PUBLIC_ORIGIN) {
        issuer = (process.env.OIDC_ISSUER || process.env.BASE_URL || process.env.PUBLIC_ORIGIN)!.replace(/\/+$/, '');
      } else if (host && host.includes('playsole.xyz')) {
        issuer = 'https://one.playsole.xyz';
      }

      let avatarUrl = userRow?.avatar_url && userRow.avatar_url.startsWith('http') ? userRow.avatar_url : undefined;
      if (!avatarUrl) {
        try {
          const { data: p } = await getSupabase().from('profiles').select('avatar_url').eq('user_id', authCode.userId).maybeSingle();
          if (p?.avatar_url && p.avatar_url.startsWith('http')) {
            avatarUrl = p.avatar_url;
          }
        } catch {
          // Fallback
        }
      }
      if (!avatarUrl) {
        avatarUrl = `${issuer}/avatar/${authCode.userId}`;
      }

      const idTokenPayload: Record<string, any> = {
        sub: authCode.userId as string,
        iss: issuer,
        aud: authCode.clientId,
      };
      if (userRow?.display_name) idTokenPayload.name = userRow.display_name.trim();
      if (userRow?.primary_email) idTokenPayload.email = userRow.primary_email;
      if (userRow?.email_verified !== undefined) idTokenPayload.email_verified = userRow.email_verified;
      if (avatarUrl) idTokenPayload.picture = avatarUrl;

      const idToken = await signJwt(idTokenPayload, config.accessTokenTtlSec);

      const refreshToken = await createRefreshToken(sessionId, authCode.tenantId as string, family, 1, config.refreshTokenTtlSec);

      void audit({ eventType: 'oauth.authorization_code_granted', userId: authCode.userId as string, clientId: authCode.clientId, tenantId: authCode.tenantId as string, metadata: { dpop: jkt ? true : false } });

      res.json({
        access_token: accessToken,
        token_type: jkt ? 'DPoP' : 'Bearer',
        expires_in: config.accessTokenTtlSec,
        refresh_token: refreshToken,
        id_token: idToken,
        scope: authCode.scope,
      });
      return;
    }

    if (body.grant_type === 'refresh_token') {
      const parsed = refreshGrantSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
        return;
      }

      const client = await getClient(parsed.data.client_id);
      if (!client) {
        res.status(400).json({ error: 'unauthorized_client', error_description: 'Unknown client.' });
        return;
      }

      // Enforce client_secret verification for confidential clients
      if (client.clientSecret || !client.publicClient) {
        if (!parsed.data.client_secret || !verifyClientSecret(parsed.data.client_secret, client.clientSecret)) {
          res.status(401).json({ error: 'invalid_client', error_description: 'Client authentication failed (invalid or missing client_secret).' });
          return;
        }
      }

      const jkt = await resolveDpopJkt(req);
      if (client.requiresDpop && !jkt) {
        res.status(400).json({ error: 'invalid_request', error_description: 'DPoP proof required for this client.' });
        return;
      }

      const oldEntry = await consumeRefreshToken(parsed.data.refresh_token);
      if (!oldEntry) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token expired or invalid.' });
        return;
      }

      const session = await getSession(oldEntry.sessionId as string);
      if (!session || session.revokedAt) {
        res.status(400).json({ error: 'invalid_grant', error_description: 'Session not found or revoked.' });
        return;
      }

      await revokeRefreshTokensByFamily(oldEntry.family as string);

      const newSequence = (oldEntry.sequence as number) + 1;
      const newRefreshToken = await createRefreshToken(oldEntry.sessionId as string, oldEntry.tenantId as string, oldEntry.family as string, newSequence, config.refreshTokenTtlSec);

      const accessToken = await signJwt(
        { sub: session.userId, client_id: parsed.data.client_id, scope: oldEntry.scope ?? 'openid', session_id: oldEntry.sessionId, ...(jkt ? { cnf: { jkt } } : {}) },
        config.accessTokenTtlSec,
      );

      void audit({ eventType: 'oauth.refresh_token_granted', userId: session.userId as string, clientId: parsed.data.client_id, tenantId: oldEntry.tenantId as string, metadata: { dpop: jkt ? true : false } });

      res.json({
        access_token: accessToken,
        token_type: jkt ? 'DPoP' : 'Bearer',
        expires_in: config.accessTokenTtlSec,
        refresh_token: newRefreshToken,
      });
      return;
    }

    res.status(400).json({ error: 'unsupported_grant_type' });
  } catch (err: any) {
    if (err?.errorCode === 'invalid_dpop_proof') {
      res.status(400).json({ error: 'invalid_dpop_proof', error_description: `DPoP proof rejected: ${err.message}` });
      return;
    }
    logger.error({ err }, 'token endpoint error');
    res.status(500).json({ error: 'server_error', error_description: 'Internal server error.' });
  }
});

export { router as tokenRouter };
