import crypto from 'node:crypto';
import express, { Request, Response, Router } from 'express';
import { getSupabase, audit, createLogger, apiVersioningMiddleware } from '@playsole-one/shared';

const logger = createLogger('gateway:admin-api');
const router = Router();

router.use(apiVersioningMiddleware({ version: '1.0' }));
router.use(express.json());

// Middleware: Authenticate programmatic API requests via Bearer token or ADMIN_API_KEY
function requireAdminApiKey(req: Request, res: Response, next: express.NextFunction): void {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-admin-api-key'] as string | undefined;

  const expectedSecret = process.env.ADMIN_API_KEY || process.env.INTERNAL_SHARED_SECRET || 'dev-internal-secret';

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (apiKey) {
    token = apiKey.trim();
  }

  if (!token || token !== expectedSecret) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or missing administrative API credentials.',
    });
    return;
  }

  next();
}

router.use(requireAdminApiKey);

// GET /api/v1/admin/users — List users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
    const offset = parseInt(req.query.offset as string || '0', 10);
    const status = req.query.status as string | undefined;

    let query = supabase
      .from('users')
      .select('id, tenant_id, primary_email, display_name, avatar_url, locale, email_verified, mfa_enabled, status, created_at, updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      object: 'list',
      data: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    logger.error({ err }, 'GET /api/v1/admin/users failed');
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /api/v1/admin/users/:id — Get user details
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'not_found', message: 'User not found' });
      return;
    }

    // Omit sensitive password hash
    delete data.password_hash;

    res.json({ object: 'user', data });
  } catch (err: any) {
    logger.error({ err }, 'GET /api/v1/admin/users/:id failed');
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// PATCH /api/v1/admin/users/:id — Update user status/profile
router.patch('/users/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const { status, displayName, locale } = req.body;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status) {
      if (!['active', 'suspended', 'disabled'].includes(status)) {
        res.status(400).json({ error: 'bad_request', message: 'Invalid status value' });
        return;
      }
      updates.status = status;
    }
    if (displayName) updates.display_name = String(displayName).trim();
    if (locale) updates.locale = String(locale).trim();

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: 'not_found', message: 'User not found' });
      return;
    }

    await audit({
      eventType: 'admin.api.user.updated',
      userId,
      ipAddress: req.ip,
      metadata: { updates },
    });

    delete data.password_hash;
    res.json({ object: 'user', data });
  } catch (err: any) {
    logger.error({ err }, 'PATCH /api/v1/admin/users/:id failed');
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// DELETE /api/v1/admin/users/:id — Delete user
router.delete('/users/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;

    await audit({
      eventType: 'admin.api.user.deleted',
      userId,
      ipAddress: req.ip,
    });

    res.json({ success: true, deletedId: userId });
  } catch (err: any) {
    logger.error({ err }, 'DELETE /api/v1/admin/users/:id failed');
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// GET /api/v1/admin/tenants — List tenants
router.get('/tenants', async (_req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ object: 'list', data: data || [] });
  } catch (err: any) {
    logger.error({ err }, 'GET /api/v1/admin/tenants failed');
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

// POST /api/v1/admin/tenants — Create tenant
router.post('/tenants', async (req: Request, res: Response) => {
  try {
    const { name, slug, domain, config } = req.body;
    if (!name || !slug) {
      res.status(400).json({ error: 'bad_request', message: 'Name and slug are required.' });
      return;
    }

    const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('tenants')
      .insert({
        id: crypto.randomUUID(),
        name: String(name).trim(),
        slug: cleanSlug,
        domain: domain ? String(domain).trim() : null,
        config: config || {},
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await audit({
      eventType: 'admin.api.tenant.created',
      ipAddress: req.ip,
      metadata: { slug: cleanSlug },
    });

    res.status(201).json({ object: 'tenant', data });
  } catch (err: any) {
    logger.error({ err }, 'POST /api/v1/admin/tenants failed');
    res.status(500).json({ error: 'server_error', message: err.message });
  }
});

export { router as adminApiRouter };
