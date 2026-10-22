import { Router } from 'express';
import { jwtVerify } from 'jose';
import { getKeySet } from '../keys';
import { verifyDpopProof } from '../dpop';
import { getStateStore, getSupabase } from '@playsole-one/shared';
import { config } from '../config';

const router = Router();

// Replay protection for DPoP proofs presented at the userinfo endpoint
// (Redis-backed; in-memory dev fallback when Redis is not configured).
const seenJti = getStateStore();

router.get('/userinfo', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid authorization header.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const ks = await getKeySet();
    const { payload } = await jwtVerify(token, ks.publicKey, { algorithms: ['RS256'] });

    // Sender-constrained access tokens must be accompanied by a valid DPoP
    // proof bound to the same key the token's cnf.jkt confirms.
    const cnf = payload.cnf as { jkt?: string } | undefined;
    if (cnf?.jkt) {
      const proof = req.headers['dpop'] as string | undefined;
      if (!proof) {
        res.status(401).json({ error: 'invalid_token', error_description: 'DPoP proof required for this token.' });
        return;
      }
      const result = await verifyDpopProof(proof, {
        htu: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        htm: req.method,
        seenJti,
      });
      if (!result.ok || result.jkt !== cnf.jkt) {
        res.status(401).json({ error: 'invalid_token', error_description: 'DPoP proof does not match the access token.' });
        return;
      }
    }

    const userId = payload.sub as string;
    let userRow: any = null;
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('users')
        .select('id, primary_email, display_name, avatar_url, email_verified, tenant_id, mfa_enabled')
        .eq('id', userId)
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
        const { data: p } = await getSupabase().from('profiles').select('avatar_url').eq('user_id', userId).maybeSingle();
        if (p?.avatar_url && p.avatar_url.startsWith('http')) {
          avatarUrl = p.avatar_url;
        }
      } catch {
        // Fallback
      }
    }
    if (!avatarUrl) {
      avatarUrl = `${issuer}/avatar/${userId}`;
    }

    res.json({
      sub: userId,
      ...(userRow?.display_name ? { name: userRow.display_name.trim() } : {}),
      ...(userRow?.primary_email ? { email: userRow.primary_email } : {}),
      email_verified: userRow?.email_verified ?? true,
      picture: avatarUrl,
      ...(userRow?.tenant_id ? { tenant_id: userRow.tenant_id } : {}),
      ...(userRow?.mfa_enabled !== undefined ? { mfa_enabled: userRow.mfa_enabled } : {}),
    });
  } catch {
    res.status(401).json({ error: 'invalid_token', error_description: 'Token expired or invalid.' });
  }
});

export { router as userinfoRouter };