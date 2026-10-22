import { Router } from 'express';
import { z } from 'zod';
import { createRefreshToken, consumeRefreshToken, revokeRefreshTokensByFamily } from '../store';

const router = Router();

router.post('/refresh-tokens', async (req, res) => {
  const parsed = z.object({
    sessionId: z.string().min(1),
    tenantId: z.string().min(1),
    family: z.string().min(1),
    sequence: z.number().int().positive(),
    ttlSec: z.number().positive(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }
  const token = await createRefreshToken(parsed.data.sessionId, parsed.data.tenantId, parsed.data.family, parsed.data.sequence, parsed.data.ttlSec);
  res.status(201).json({ token });
});

router.post('/refresh-tokens/consume', async (req, res) => {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }
  const entry = await consumeRefreshToken(parsed.data.token);
  if (!entry) { res.status(404).json({ error: 'not_found' }); return; }
  res.json(entry);
});

router.post('/refresh-tokens/revoke-family', async (req, res) => {
  const parsed = z.object({ family: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }
  await revokeRefreshTokensByFamily(parsed.data.family);
  res.status(204).end();
});

export { router as refreshTokensRouter };
