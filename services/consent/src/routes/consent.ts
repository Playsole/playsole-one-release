import { Router } from 'express';
import { z } from 'zod';
import { createGrant, getGrant, listGrants, revokeGrant, findGrant, upsertGrant } from '../store';
import { audit } from '@playsole-one/shared';

const router = Router();

const createSchema = z.object({
  clientId: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
});

function authenticate(req: Record<string, any>, res: any): { userId: string; tenantId?: string; accessToken?: string } | null {
  const userId = req.headers['x-authenticated-user-id'];
  if (userId && typeof userId === 'string') {
    const tenantId = req.headers['x-tenant-id'];
    const accessToken = req.headers['x-supabase-access-token'];
    return {
      userId,
      tenantId: typeof tenantId === 'string' ? tenantId : undefined,
      accessToken: typeof accessToken === 'string' ? accessToken : undefined,
    };
  }
  res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid authentication.' });
  return null;
}

router.post('/consent', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  const tenantId = auth.tenantId ?? '00000000-0000-0000-0000-000000000001';
  const grant = await upsertGrant(auth.userId, parsed.data.clientId, parsed.data.scopes, tenantId, auth.accessToken);
  void audit({ eventType: 'consent.granted', userId: auth.userId, clientId: parsed.data.clientId, tenantId });
  res.status(201).json(grant);
});

router.put('/consent', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  const tenantId = auth.tenantId ?? '00000000-0000-0000-0000-000000000001';
  const grant = await upsertGrant(auth.userId, parsed.data.clientId, parsed.data.scopes, tenantId, auth.accessToken);
  void audit({ eventType: 'consent.granted', userId: auth.userId, clientId: parsed.data.clientId, tenantId });
  res.status(200).json(grant);
});

router.get('/consent', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const userGrants = await listGrants(auth.userId, auth.tenantId, auth.accessToken);
  res.json(userGrants);
});

router.get('/consent/check', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const clientId = req.query.client_id as string | undefined;
  const scope = (req.query.scope as string | undefined) ?? '';

  if (!clientId) {
    res.status(400).json({ error: 'invalid_request', error_description: 'client_id is required.' });
    return;
  }

  const grant = await findGrant(auth.userId, clientId, auth.tenantId, auth.accessToken);
  if (!grant) {
    res.json({ granted: false });
    return;
  }

  const requestedScopes = scope.split(' ').filter(Boolean);
  const missing = requestedScopes.filter((s) => !grant.scopes.includes(s));
  res.json({ granted: missing.length === 0, missingScopes: missing.length > 0 ? missing : undefined });
});

router.get('/consent/:id', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const grant = await getGrant(req.params.id, auth.tenantId, auth.accessToken);
  if (!grant || grant.userId !== auth.userId) {
    res.status(404).json({ error: 'not_found', error_description: 'Consent grant not found.' });
    return;
  }

  res.json(grant);
});

router.delete('/consent/:id', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const grant = await getGrant(req.params.id, auth.tenantId, auth.accessToken);
  if (!grant || grant.userId !== auth.userId) {
    res.status(404).json({ error: 'not_found', error_description: 'Consent grant not found.' });
    return;
  }

  await revokeGrant(req.params.id, auth.tenantId, auth.accessToken);
  void audit({ eventType: 'consent.revoked', userId: auth.userId, clientId: grant.clientId, tenantId: grant.tenantId });
  res.status(204).end();
});

export { router as consentRouter };
