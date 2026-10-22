import { Router } from 'express';
import { z } from 'zod';
import { consumeRefreshToken } from '../sessionClient';

const router = Router();

const revokeSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.string().optional(),
});

router.post('/revoke', async (req, res) => {
  const parsed = revokeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  try {
    await consumeRefreshToken(parsed.data.token);
  } catch {
    // RFC 7009 Section 2.2: Must return HTTP 200 even if token is invalid or already revoked
  }
  res.status(200).json({});
});

export { router as revokeRouter };
