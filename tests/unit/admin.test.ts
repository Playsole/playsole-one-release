import { describe, it, expect } from 'vitest';
import { adminDashboardPage, adminAccessDeniedPage, AdminDashboardData } from '../../gateway/src/adminView';

describe('Admin Studio View (Items 39, 40, 41, 42)', () => {
  const mockData: AdminDashboardData = {
    currentUser: {
      displayName: 'System Administrator',
      email: 'admin@playsole.xyz',
    },
    users: [
      {
        id: 'usr-1111-2222-3333',
        tenantId: '00000000-0000-0000-0000-000000000001',
        primaryEmail: 'alex@example.com',
        displayName: 'Alex Carter',
        locale: 'en',
        emailVerified: true,
        mfaEnabled: true,
        status: 'active',
        createdAt: '2026-01-15T10:00:00Z',
      },
      {
        id: 'usr-4444-5555-6666',
        tenantId: '00000000-0000-0000-0000-000000000001',
        primaryEmail: 'badactor@example.com',
        displayName: 'Bad Actor',
        locale: 'en',
        emailVerified: false,
        mfaEnabled: false,
        status: 'suspended',
        createdAt: '2026-02-01T12:00:00Z',
      },
    ],
    clients: [
      {
        id: 'client-1',
        tenantId: '00000000-0000-0000-0000-000000000001',
        clientId: 'playsole-web-app',
        publicClient: false,
        redirectUris: ['https://app.playsole.xyz/callback'],
        grantTypes: ['authorization_code', 'refresh_token'],
        scopes: ['openid', 'profile', 'email'],
        createdAt: '2026-01-10T08:00:00Z',
      },
    ],
    tenants: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        slug: 'default',
        name: 'Default Tenant',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    auditLogs: [
      {
        id: 'log-1',
        eventType: 'user.login.success',
        userId: 'usr-1111-2222-3333',
        clientId: 'playsole-web-app',
        ipAddress: '192.168.1.1',
        metadata: { method: 'totp' },
        createdAt: '2026-09-20T12:00:00Z',
      },
    ],
    metrics: {
      totalUsers: 2,
      activeUsers: 1,
      suspendedUsers: 1,
      totalClients: 1,
      totalTenants: 1,
      totalLogs: 1,
    },
  };

  it('renders top floating island dock with admin studio badge and tab switchers', () => {
    const html = adminDashboardPage(mockData, { activeTab: 'users' });
    expect(html).toContain('ADMIN STUDIO');
    expect(html).toContain('data-tab="users"');
    expect(html).toContain('data-tab="clients"');
    expect(html).toContain('data-tab="tenants"');
    expect(html).toContain('data-tab="audit-logs"');
    expect(html).toContain('/dashboard'); // return to user dashboard link
  });

  it('renders telemetry counters for users, clients, tenants, and logs', () => {
    const html = adminDashboardPage(mockData);
    expect(html).toContain('<div class="telemetry-val">2</div>'); // total users
    expect(html).toContain('<div class="telemetry-val">1</div>'); // total clients
    expect(html).toContain('1 active &middot; 1 suspended');
  });

  it('renders user search, status capsules, suspend/unsuspend, and delete actions (Item 39)', () => {
    const html = adminDashboardPage(mockData);
    expect(html).toContain('Alex Carter');
    expect(html).toContain('alex@example.com');
    expect(html).toContain('capsule-success'); // Active
    expect(html).toContain('capsule-warning'); // Suspended
    expect(html).toContain('/admin/users/usr-1111-2222-3333/suspend');
    expect(html).toContain('/admin/users/usr-4444-5555-6666/unsuspend');
    expect(html).toContain('/admin/users/usr-1111-2222-3333/delete');
    expect(html).toContain('id="userSearchInput"');
    expect(html).toContain('id="userStatusFilter"');
  });

  it('renders OAuth client management with secret rotation and delete triggers (Item 40)', () => {
    const html = adminDashboardPage(mockData, { activeTab: 'clients' });
    expect(html).toContain('playsole-web-app');
    expect(html).toContain('https://app.playsole.xyz/callback');
    expect(html).toContain('/admin/clients/client-1/rotate-secret');
    expect(html).toContain('/admin/clients/client-1/delete');
    expect(html).toContain('Register Client');
  });

  it('renders multi-tenant list and create tenant modal (Item 41)', () => {
    const html = adminDashboardPage(mockData, { activeTab: 'tenants' });
    expect(html).toContain('Default Tenant');
    expect(html).toContain('Primary System Tenant');
    expect(html).toContain('Create Tenant');
    expect(html).toContain('id="create-tenant-modal"');
  });

  it('renders live audit trail with export buttons for JSON and CSV (Item 42)', () => {
    const html = adminDashboardPage(mockData, { activeTab: 'audit-logs' });
    expect(html).toContain('user.login.success');
    expect(html).toContain('192.168.1.1');
    expect(html).toContain('/admin/audit-logs/export?format=json');
    expect(html).toContain('/admin/audit-logs/export?format=csv');
  });

  it('renders rotated secret feedback banner when credentials are generated', () => {
    const html = adminDashboardPage(mockData, {
      rotatedSecret: {
        clientId: 'playsole-web-app',
        secret: 'sec_test_1234567890abcdef',
      },
    });
    expect(html).toContain('Secret Rotated for playsole-web-app');
    expect(html).toContain('sec_test_1234567890abcdef');
  });

  it('validates client-side script syntax parsing in Node runtime', () => {
    const html = adminDashboardPage(mockData);
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const script = scriptMatch![1];
    expect(() => new Function(script)).not.toThrow();
  });

  it('renders admin mobile hamburger button, active tab chip, and responsive navigation drawer', () => {
    const html = adminDashboardPage(mockData, { activeTab: 'clients' });

    expect(html).toContain('id="adminDashboardHamburger"');
    expect(html).toContain('id="adminActiveTabChip"');
    expect(html).toContain('>OAuth Clients</span>'); // Active chip matches activeTab
    expect(html).toContain('id="adminMobileNavModal"');
    expect(html).toContain('class="admin-mobile-nav-list"');
    expect(html).toContain('onclick="mobileSwitchAdminTab(\'users\')"');
    expect(html).toContain('onclick="mobileSwitchAdminTab(\'clients\')"');
    expect(html).toContain('onclick="toggleAdminMobileDrawer()"');
  });


  it('renders styled Apple-inspired Access Denied page when unconfigured or unauthorized', () => {
    const htmlUnconfigured = adminAccessDeniedPage('Admin Studio Unavailable', 'The studio is disabled.');
    expect(htmlUnconfigured).toContain('Admin Studio Unavailable');
    expect(htmlUnconfigured).toContain('Administrative Boundary');
    expect(htmlUnconfigured).toContain('Return to Dashboard');
    expect(htmlUnconfigured).toContain('/dashboard');

    const htmlUnauthorized = adminAccessDeniedPage('Access Restricted', 'Not authorized.', 'unauthorized@example.com');
    expect(htmlUnauthorized).toContain('Access Restricted');
    expect(htmlUnauthorized).toContain('unauthorized@example.com');
    expect(htmlUnauthorized).toContain('Sign in with authorized account');
    expect(htmlUnauthorized).toContain('adminModalOverlay');
    expect(htmlUnauthorized).toContain('adminModalForm');
    expect(htmlUnauthorized).toContain('/admin/login');
    expect(htmlUnauthorized).toContain('Admin Studio Authentication');
  });

  it('validates access denied page client-side keystroke script syntax in Node runtime', () => {
    const html = adminAccessDeniedPage('Access Restricted', 'Not authorized.');
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const script = scriptMatch![1];
    expect(() => new Function(script)).not.toThrow();
  });
});

