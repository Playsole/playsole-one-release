import { Router } from 'express';
import { z } from 'zod';
import { createAuthCode, consumeAuthCode } from '../store';

const router = Router();

router.post('/auth-codes', async (req, res) => {
  const schema = z.object({
    clientId: z.string().min(1),
    userId: z.string().min(1),
    tenantId: z.string().min(1),
    redirectUri: z.string().url(),
    codeChallenge: z.string().min(1),
    codeChallengeMethod: z.literal('S256'),
    scope: z.string(),
    ttlSec: z.number().positive(),
    state: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }
  const code = await createAuthCode(
    parsed.data.clientId, parsed.data.userId, parsed.data.tenantId, parsed.data.redirectUri,
    parsed.data.codeChallenge, parsed.data.codeChallengeMethod,
    parsed.data.scope, parsed.data.ttlSec, parsed.data.state,
  );
  res.status(201).json({ code });
});

router.post('/auth-codes/consume', async (req, res) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }
  const entry = await consumeAuthCode(parsed.data.code);
  if (!entry) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(entry);
});

export { router as authCodesRouter };
