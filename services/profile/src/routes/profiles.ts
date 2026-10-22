import { Router } from 'express';
import { z } from 'zod';
import { getProfile, updateProfile } from '../store';

const router = Router();

const updateSchema = z.object({
  displayName: z.string().min(1).max(128).optional(),
  avatarUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  locale: z.string().length(2).optional(),
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

router.get('/profile', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const profile = await getProfile(auth.userId, auth.tenantId, auth.accessToken);
  if (!profile) {
    res.status(404).json({ error: 'not_found', error_description: 'Profile not found.' });
    return;
  }

  res.json(profile);
});

router.put('/profile', async (req, res) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  const updated = await updateProfile(auth.userId, parsed.data, auth.tenantId, auth.accessToken);
  if (!updated) {
    res.status(404).json({ error: 'not_found', error_description: 'Profile not found.' });
    return;
  }

  res.json(updated);
});

export { router as profilesRouter };
