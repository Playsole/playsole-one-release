import { Router } from 'express';
import { z } from 'zod';
import {
  createSession, getSession, deleteSession, revokeSession, listSessionsByUser,
  markSessionMfaPassed, updateSessionTokens, revokeRefreshTokensBySession,
} from '../store';

const router = Router();

const createSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  supabaseAccessToken: z.string().optional(),
  supabaseRefreshToken: z.string().optional(),
  clientId: z.string().optional(),
  tokenType: z.enum(['bearer', 'dpop']).optional(),
  deviceInfo: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  mfaPassed: z.boolean().optional(),
  expiresAt: z.string().optional(),
});

router.post('/sessions', async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
      return;
    }
    const session = await createSession({
      userId: parsed.data.userId,
      tenantId: parsed.data.tenantId,
      supabaseAccessToken: parsed.data.supabaseAccessToken,
      supabaseRefreshToken: parsed.data.supabaseRefreshToken,
      clientId: parsed.data.clientId,
      tokenType: parsed.data.tokenType,
      deviceInfo: parsed.data.deviceInfo,
      ipAddress: parsed.data.ipAddress,
      userAgent: parsed.data.userAgent,
      mfaPassed: parsed.data.mfaPassed,
      expiresAt: parsed.data.expiresAt,
    });
    res.status(201).json(session);
  } catch (err) { next(err); }
});

router.get('/sessions', async (req, res, next) => {
  try {
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', error_description: 'userId is required.' });
      return;
    }
    const sessions = await listSessionsByUser(parsed.data.userId);
    res.json(sessions);
  } catch (err) { next(err); }
});

// Bulk-revoke all active sessions for a user (called on account suspension).
router.delete('/sessions', async (req, res, next) => {
  try {
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', error_description: 'userId is required.' });
      return;
    }
    const sessions = await listSessionsByUser(parsed.data.userId);
    await Promise.all(sessions.map((s) => revokeSession(s.id).catch(() => {})));
    res.status(204).end();
  } catch (err) { next(err); }
});

router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(session);
  } catch (err) { next(err); }
});

router.delete('/sessions/:id', async (req, res, next) => {
  try {
    await deleteSession(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/sessions/:id/revoke', async (req, res, next) => {
  try {
    const ok = await revokeSession(req.params.id);
    if (!ok) { res.status(404).json({ error: 'not_found' }); return; }
    // Also invalidate the session's OAuth refresh tokens so a revoked session
    // cannot mint new access tokens.
    await revokeRefreshTokensBySession(req.params.id).catch(() => {});
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/sessions/:id/mfa', async (req, res, next) => {
  try {
    const session = await markSessionMfaPassed(req.params.id);
    if (!session) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(session);
  } catch (err) { next(err); }
});

router.patch('/sessions/:id/tokens', async (req, res, next) => {
  try {
    const parsed = z.object({
      supabaseAccessToken: z.string().optional(),
      supabaseRefreshToken: z.string().optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
      return;
    }
    const session = await updateSessionTokens(
      req.params.id,
      parsed.data.supabaseAccessToken,
      parsed.data.supabaseRefreshToken,
    );
    if (!session) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(session);
  } catch (err) { next(err); }
});

export { router as sessionsRouter };