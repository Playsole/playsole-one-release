import { Router } from 'express';
import { z } from 'zod';
import { requireInternalSecret } from '@playsole-one/shared';
import { createAuthCode } from '../sessionClient';
import { getClient, validateRedirectUri } from '../store';
import { config } from '../config';

const router = Router();

// The internal-secret guard is applied per-route (not router-wide) so this
// router, mounted at the app root, does not block the public OAuth endpoints
// (/token, /userinfo, /revoke) mounted elsewhere.
const authorizeQuerySchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal('S256'),
  scope: z.string().optional(),
  state: z.string().optional(),
});

router.get('/authorize', requireInternalSecret, async (req, res) => {
  try {
    const parsed = authorizeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
      return;
    }

    const { client_id, redirect_uri, code_challenge, code_challenge_method, scope, state } = parsed.data;

    const client = await getClient(client_id);
    if (!client) {
      res.status(400).json({ error: 'unauthorized_client', error_description: 'Unknown client_id.' });
      return;
    }

    const isValidRedirect = await validateRedirectUri(client_id, redirect_uri);
    if (!isValidRedirect) {
      res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri does not match registered client.' });
      return;
    }

    const userId = req.headers['x-authenticated-user-id'];
    if (!userId || typeof userId !== 'string') {
      res.status(401).json({ error: 'unauthenticated', error_description: 'No valid session.' });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    if (!tenantId) {
      res.status(401).json({ error: 'unauthenticated', error_description: 'No tenant context.' });
      return;
    }

    const code = await createAuthCode(
      client_id, userId, tenantId, redirect_uri,
      code_challenge, code_challenge_method, scope ?? 'openid',
      config.authCodeTtlSec, state,
    );
    const location = new URL(redirect_uri);
    location.searchParams.set('code', code);
    if (state) location.searchParams.set('state', state);
    res.redirect(302, location.toString());
  } catch (err: any) {
    res.status(500).json({ error: 'server_error', error_description: err?.message || 'Failed to process authorization request.' });
  }
});

export { router as authorizeRouter };
