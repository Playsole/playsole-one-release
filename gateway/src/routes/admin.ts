import crypto from 'node:crypto';
import express, { Request, Response, Router } from 'express';
import { getSupabase, audit, createLogger } from '@playsole-one/shared';
import { adminDashboardPage, adminAccessDeniedPage, AdminUser, AdminClient, AdminTenant, AdminAuditLog } from '../adminView';
import { invalidateSessionCacheForUser, cacheSession } from '../middleware/session';
import { loginUser, createSession, revokeSessionsByUser } from '../bffClient';
import { sessionCookieName, sessionCookieOptions } from '../cookies';

const logger = createLogger('gateway:admin');
const router = Router();

// POST /admin/login — Dedicated Admin Authentication
// Handles credentials submitted from the secret 'admin' modal on the Access Restricted page.
router.post('/login', express.json(), express.urlencoded({ extended: false }), async (req: Request, res: Response) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password;

  const isJson = Boolean(
    req.headers['content-type']?.includes('application/json') ||
    req.headers.accept?.includes('application/json') ||
    req.xhr
  );

  if (!email || !password) {
    if (isJson) {
      res.status(400).json({ error: 'invalid_request', message: 'Email and password are required.' });
      return;
    }
    res.status(400).send(adminAccessDeniedPage('Access Restricted', 'Email and password are required.'));
    return;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    const message = 'The administrative studio has not been enabled on this server. Contact system administrator.';
    if (isJson) {
      res.status(403).json({ error: 'forbidden', message });
      return;
    }
    res.status(403).send(adminAccessDeniedPage('Admin Studio Unavailable', message));
    return;
  }

  // Check allowlist: only emails listed in ADMIN_EMAILS can access admin
  if (!adminEmails.includes(email)) {
    logger.warn({ email, ip: req.ip }, 'Admin login rejected: email not in ADMIN_EMAILS allowlist');
    await audit({
      eventType: 'admin.login.failed_not_allowlisted',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { attemptedEmail: email },
    });
    const message = 'This email address is not authorized for Admin Studio access.';
    if (isJson) {
      res.status(403).json({ error: 'forbidden', message });
      return;
    }
    res.status(403).send(adminAccessDeniedPage('Access Restricted', message, email));
    return;
  }

  try {
    const result = await loginUser(email, password, { ipAddress: req.ip, userAgent: req.get('user-agent') });
    if ('error' in result) {
      logger.warn({ email, err: result.error }, 'Admin login authentication failed');
      if (isJson) {
        res.status(401).json({ error: result.error, message: result.errorDescription });
        return;
      }
      res.status(401).send(adminAccessDeniedPage('Access Restricted', result.errorDescription, email));
      return;
    }

    const session = await createSession(
      result.userId,
      result.tenantId,
      result.supabaseAccessToken,
      result.supabaseRefreshToken,
      { mfaPassed: false, ipAddress: req.ip, userAgent: req.get('user-agent') }
    );

    // Immediately cache session in gateway memory so subsequent redirect finds it instantly
    cacheSession(session);
    res.cookie(sessionCookieName(), session.id, sessionCookieOptions());

    await audit({
      eventType: 'admin.login.success',
      userId: result.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { email },
    });

    if (isJson) {
      res.json({ ok: true, redirect: '/admin' });
      return;
    }

    res.redirect(302, '/admin');
  } catch (err: any) {
    logger.error({ err, email }, 'Admin login unexpected error');
    const message = 'An error occurred during authentication. Please try again.';
    if (isJson) {
      res.status(500).json({ error: 'server_error', message });
      return;
    }
    res.status(500).send(adminAccessDeniedPage('Access Restricted', message, email));
  }
});

// Middleware to ensure user is logged in AND is on the ADMIN_EMAILS allowlist.
// Default deny: if ADMIN_EMAILS is not set or the user's email is not in the list,
// deny access with an Apple-grade Access Denied screen adhering to design_style.md.
async function requireAdminAuth(req: Request, res: Response, next: express.NextFunction): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // If ADMIN_EMAILS is not configured at all, deny access and log a warning
  // so the operator is aware the admin panel is not accessible.
  if (adminEmails.length === 0) {
    logger.warn('ADMIN_EMAILS env var is not set — /admin access denied to all users. Set ADMIN_EMAILS to grant access.');
    res.status(403).send(adminAccessDeniedPage(
      'Admin Studio Unavailable',
      'The administrative studio has not been enabled on this server. An operator must configure <code>ADMIN_EMAILS</code> in the environment.'
    ));
    return;
  }

  // If user is not logged in, render the Access Restricted page so they can type 'admin' to authenticate
  if (!req.userId) {
    res.status(403).send(adminAccessDeniedPage(
      'Access Restricted',
      'You do not have administrative permissions to access the Admin Studio.'
    ));
    return;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('primary_email').eq('id', req.userId).maybeSingle();
  if (error) {
    logger.error({ err: error, userId: req.userId }, 'Failed to query user primary_email in requireAdminAuth');
  }
  const email = data?.primary_email?.toLowerCase();
  if (!email || !adminEmails.includes(email)) {
    logger.warn({ userId: req.userId, email }, 'Unauthorized attempt to access Admin Studio');
    res.status(403).send(adminAccessDeniedPage(
      'Access Restricted',
      'You do not have administrative permissions to access the Admin Studio.',
      email
    ));
    return;
  }

  next();
}

// Protect all /admin routes by default
router.use(requireAdminAuth);

// Temporary in-memory flash for secret reveal across redirect
const secretFlash = new Map<string, { clientId: string; secret: string }>();

// GET /admin — Main Admin Studio Dashboard
router.get('/', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    // 1. Fetch Users from real database
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select('id, tenant_id, primary_email, display_name, avatar_url, locale, email_verified, mfa_enabled, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (usersErr) logger.warn({ err: usersErr }, 'failed to fetch users for admin');

    const users: AdminUser[] = (usersData || []).map((u: any) => ({
      id: u.id,
      tenantId: u.tenant_id,
      primaryEmail: u.primary_email || '',
      displayName: u.display_name || 'Unnamed',
      avatarUrl: u.avatar_url,
      locale: u.locale || 'en',
      emailVerified: Boolean(u.email_verified),
      mfaEnabled: Boolean(u.mfa_enabled),
      status: u.status || 'active',
      createdAt: u.created_at,
    }));

    // 2. Fetch Clients from real database
    const { data: clientsData, error: clientsErr } = await supabase
      .from('clients')
      .select('id, tenant_id, client_id, public_client, redirect_uris, grant_types, scopes, created_at')
      .order('created_at', { ascending: false });

    if (clientsErr) logger.warn({ err: clientsErr }, 'failed to fetch clients for admin');

    const clients: AdminClient[] = (clientsData || []).map((c: any) => ({
      id: c.id,
      tenantId: c.tenant_id,
      clientId: c.client_id,
      publicClient: Boolean(c.public_client),
      redirectUris: c.redirect_uris || [],
      grantTypes: c.grant_types || [],
      scopes: c.scopes || [],
      createdAt: c.created_at,
    }));

    // 3. Fetch Tenants from real database
    const { data: tenantsData, error: tenantsErr } = await supabase
      .from('tenants')
      .select('id, slug, name, domain, config, created_at')
      .order('created_at', { ascending: true });

    if (tenantsErr) logger.warn({ err: tenantsErr }, 'failed to fetch tenants for admin');

    const tenants: AdminTenant[] = (tenantsData || []).map((t: any) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      domain: t.domain,
      config: t.config,
      createdAt: t.created_at,
    }));

    // 4. Fetch Audit Logs from real database
    const { data: logsData, error: logsErr } = await supabase
      .from('audit_log')
      .select('id, event_type, user_id, client_id, tenant_id, ip_address, user_agent, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsErr) logger.warn({ err: logsErr }, 'failed to fetch audit logs for admin');

    const auditLogs: AdminAuditLog[] = (logsData || []).map((l: any) => ({
      id: l.id,
      eventType: l.event_type,
      userId: l.user_id,
      clientId: l.client_id,
      tenantId: l.tenant_id,
      ipAddress: l.ip_address,
      userAgent: l.user_agent,
      metadata: l.metadata,
      createdAt: l.created_at,
    }));

    // Telemetry metrics
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === 'active').length;
    const suspendedUsers = users.filter((u) => u.status === 'suspended').length;
    const totalClients = clients.length;
    const totalTenants = tenants.length;
    const totalLogs = auditLogs.length;

    // Check flash secret reveal
    const flash = req.userId ? secretFlash.get(req.userId) : undefined;
    if (req.userId && flash) secretFlash.delete(req.userId);

    const activeTab = (req.query.tab as any) || 'users';

    const currentAdmin = users.find((u) => u.id === req.userId);
    res.send(adminDashboardPage({
      currentUser: {
        displayName: currentAdmin?.displayName || currentAdmin?.primaryEmail || 'Admin User',
        email: currentAdmin?.primaryEmail || '',
        avatarUrl: currentAdmin?.avatarUrl,
      },
      users,
      clients,
      tenants,
      auditLogs,
      metrics: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        totalClients,
        totalTenants,
        totalLogs,
      },
    }, {
      activeTab,
      message: req.query.message as string,
      error: req.query.error as string,
      rotatedSecret: flash,
    }));
  } catch (err: any) {
    logger.error({ err }, 'GET /admin error');
    res.status(500).send(`
      <!DOCTYPE html>
      <html><body style="font-family:sans-serif;padding:40px;">
        <h2>Admin Studio Error</h2>
        <p style="color:#ef4444;">Failed to load administrative workspace: ${err?.message || 'Internal Server Error'}</p>
        <a href="/admin">&larr; Retry</a>
      </body></html>
    `);
  }
});

// POST /admin/users/:id/suspend (Item 39)
router.post('/users/:id/suspend', requireAdminAuth, async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    // Immediately revoke all live sessions so the user is ejected right away
    // and cannot continue using an existing session cookie.
    await revokeSessionsByUser(userId).catch((err: any) =>
      logger.warn({ err, userId }, 'Failed to revoke sessions on suspend — user may remain logged in briefly')
    );
    invalidateSessionCacheForUser(userId);

    await audit({
      eventType: 'admin.user.suspended',
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId },
    });

    res.redirect(302, '/admin?tab=users&message=' + encodeURIComponent('User account suspended and all active sessions revoked.'));
  } catch (err: any) {
    logger.error({ err, userId }, 'POST /admin/users/:id/suspend failed');
    res.redirect(302, '/admin?tab=users&error=' + encodeURIComponent(err.message || 'Failed to suspend user.'));
  }
});

// POST /admin/users/:id/unsuspend (Item 39)
router.post('/users/:id/unsuspend', requireAdminAuth, async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    await audit({
      eventType: 'admin.user.reactivated',
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId },
    });

    res.redirect(302, '/admin?tab=users&message=' + encodeURIComponent('User account reactivated successfully.'));
  } catch (err: any) {
    logger.error({ err, userId }, 'POST /admin/users/:id/unsuspend failed');
    res.redirect(302, '/admin?tab=users&error=' + encodeURIComponent(err.message || 'Failed to reactivate user.'));
  }
});

// POST /admin/users/:id/delete (Item 39)
router.post('/users/:id/delete', requireAdminAuth, async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    if (userId === req.userId) {
      res.redirect(302, '/admin?tab=users&error=' + encodeURIComponent('You cannot delete your own active admin account.'));
      return;
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;

    await audit({
      eventType: 'admin.user.deleted',
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId },
    });

    res.redirect(302, '/admin?tab=users&message=' + encodeURIComponent('User account deleted permanently.'));
  } catch (err: any) {
    logger.error({ err, userId }, 'POST /admin/users/:id/delete failed');
    res.redirect(302, '/admin?tab=users&error=' + encodeURIComponent(err.message || 'Failed to delete user.'));
  }
});

// POST /admin/clients (Item 40)
router.post('/clients', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { clientId, clientType, redirectUris, scopes } = req.body;
    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      res.redirect(302, '/admin?tab=clients&error=' + encodeURIComponent('Client ID is required.'));
      return;
    }

    // Secret is required for all clients registered in Playsole One (Confidential Clients)
    const isPublic = false;
    const parsedUris = (redirectUris || '')
      .split(',')
      .map((u: string) => u.trim())
      .filter(Boolean);

    const parsedScopes = (scopes || 'openid,profile,email')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    let rawSecret: string | undefined;
    let hashedSecret: string | null = null;

    if (!isPublic) {
      rawSecret = crypto.randomBytes(32).toString('hex');
      // Hash with SHA-256 for database storage
      hashedSecret = crypto.createHash('sha256').update(rawSecret).digest('hex');
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('clients').insert({
      id: crypto.randomUUID(),
      tenant_id: req.tenantId || '00000000-0000-0000-0000-000000000001',
      client_id: clientId.trim(),
      client_secret: hashedSecret,
      redirect_uris: parsedUris,
      scopes: parsedScopes,
      grant_types: isPublic ? ['authorization_code', 'refresh_token'] : ['authorization_code', 'refresh_token', 'client_credentials'],
      public_client: isPublic,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    await audit({
      eventType: 'admin.client.created',
      clientId: clientId.trim(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId, publicClient: isPublic },
    });

    if (rawSecret && req.userId) {
      secretFlash.set(req.userId, { clientId: clientId.trim(), secret: rawSecret });
    }

    res.redirect(302, '/admin?tab=clients&message=' + encodeURIComponent(`Client ${clientId} registered successfully.`));
  } catch (err: any) {
    logger.error({ err }, 'POST /admin/clients failed');
    res.redirect(302, '/admin?tab=clients&error=' + encodeURIComponent(err.message || 'Failed to register client.'));
  }
});

// POST /admin/clients/:id/rotate-secret (Item 40)
router.post('/clients/:id/rotate-secret', requireAdminAuth, async (req: Request, res: Response) => {
  const clientIdDb = req.params.id;
  try {
    const supabase = getSupabase();
    const { data: client, error: fetchErr } = await supabase
      .from('clients')
      .select('id, client_id, public_client')
      .eq('id', clientIdDb)
      .single();

    if (fetchErr || !client) throw new Error('Client not found.');

    const newSecret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = crypto.createHash('sha256').update(newSecret).digest('hex');

    const { error: updateErr } = await supabase
      .from('clients')
      .update({ client_secret: hashedSecret })
      .eq('id', clientIdDb);

    if (updateErr) throw updateErr;

    await audit({
      eventType: 'admin.client.secret_rotated',
      clientId: client.client_id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId },
    });

    if (req.userId) {
      secretFlash.set(req.userId, { clientId: client.client_id, secret: newSecret });
    }

    res.redirect(302, '/admin?tab=clients&message=' + encodeURIComponent(`Secret rotated for ${client.client_id}.`));
  } catch (err: any) {
    logger.error({ err, clientIdDb }, 'POST /admin/clients/:id/rotate-secret failed');
    res.redirect(302, '/admin?tab=clients&error=' + encodeURIComponent(err.message || 'Failed to rotate secret.'));
  }
});

// POST /admin/clients/:id/delete (Item 40)
router.post('/clients/:id/delete', requireAdminAuth, async (req: Request, res: Response) => {
  const clientIdDb = req.params.id;
  try {
    const supabase = getSupabase();
    const { data: client } = await supabase.from('clients').select('client_id').eq('id', clientIdDb).single();
    const { error } = await supabase.from('clients').delete().eq('id', clientIdDb);
    if (error) throw error;

    await audit({
      eventType: 'admin.client.deleted',
      clientId: client?.client_id || clientIdDb,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId },
    });

    res.redirect(302, '/admin?tab=clients&message=' + encodeURIComponent('Client deleted successfully.'));
  } catch (err: any) {
    logger.error({ err, clientIdDb }, 'POST /admin/clients/:id/delete failed');
    res.redirect(302, '/admin?tab=clients&error=' + encodeURIComponent(err.message || 'Failed to delete client.'));
  }
});

// POST /admin/tenants (Item 41)
router.post('/tenants', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, slug, domain } = req.body;
    if (!name || !slug) {
      res.redirect(302, '/admin?tab=tenants&error=' + encodeURIComponent('Tenant name and slug are required.'));
      return;
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const supabase = getSupabase();

    const { error } = await supabase.from('tenants').insert({
      id: crypto.randomUUID(),
      name: name.trim(),
      slug: cleanSlug,
      domain: domain ? domain.trim() : null,
      config: {},
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    await audit({
      eventType: 'admin.tenant.created',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId, slug: cleanSlug, name: name.trim() },
    });

    res.redirect(302, '/admin?tab=tenants&message=' + encodeURIComponent(`Tenant ${name} created.`));
  } catch (err: any) {
    logger.error({ err }, 'POST /admin/tenants failed');
    res.redirect(302, '/admin?tab=tenants&error=' + encodeURIComponent(err.message || 'Failed to create tenant.'));
  }
});

// POST /admin/tenants/:id/delete (Item 41)
router.post('/tenants/:id/delete', requireAdminAuth, async (req: Request, res: Response) => {
  const tenantId = req.params.id;
  try {
    const supabase = getSupabase();
    const { data: tenant } = await supabase.from('tenants').select('slug').eq('id', tenantId).single();
    if (tenant?.slug === 'default') {
      res.redirect(302, '/admin?tab=tenants&error=' + encodeURIComponent('Cannot delete the primary system default tenant.'));
      return;
    }

    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
    if (error) throw error;

    await audit({
      eventType: 'admin.tenant.deleted',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { adminUserId: req.userId, tenantId },
    });

    res.redirect(302, '/admin?tab=tenants&message=' + encodeURIComponent('Tenant deleted successfully.'));
  } catch (err: any) {
    logger.error({ err, tenantId }, 'POST /admin/tenants/:id/delete failed');
    res.redirect(302, '/admin?tab=tenants&error=' + encodeURIComponent(err.message || 'Failed to delete tenant.'));
  }
});

// GET /admin/audit-logs/export (Item 42)
router.get('/audit-logs/export', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'json';
    const supabase = getSupabase();

    const { data: logs, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    if (format === 'csv') {
      const headers = ['id', 'created_at', 'event_type', 'user_id', 'client_id', 'tenant_id', 'ip_address', 'metadata'];
      const csvRows = [headers.join(',')];

      (logs || []).forEach((row: any) => {
        const meta = JSON.stringify(row.metadata || {}).replace(/"/g, '""');
        const values = [
          `"${row.id}"`,
          `"${row.created_at}"`,
          `"${row.event_type}"`,
          `"${row.user_id || ''}"`,
          `"${row.client_id || ''}"`,
          `"${row.tenant_id || ''}"`,
          `"${row.ip_address || ''}"`,
          `"${meta}"`,
        ];
        csvRows.push(values.join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="playsole-audit-logs.csv"');
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="playsole-audit-logs.json"');
      res.send(JSON.stringify(logs || [], null, 2));
    }
  } catch (err: any) {
    logger.error({ err }, 'GET /admin/audit-logs/export failed');
    res.status(500).json({ error: 'failed_to_export', message: err.message });
  }
});

export { router as adminRouter };
