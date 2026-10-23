import { describe, expect, it } from 'vitest';
import { themeScript, themeStyles, themeToggleHtml, injectTheme } from '../../gateway/src/theme';

describe('Dark mode and floating theme toggle', () => {
  it('exports themeScript with local storage and system prefers-color-scheme detection', () => {
    expect(themeScript).toContain("localStorage.getItem('playsole_theme')");
    expect(themeScript).toContain("prefers-color-scheme: dark");
    expect(themeScript).toContain("data-theme");
  });

  it('exports themeStyles containing dark mode tokens and floating button CSS', () => {
    expect(themeStyles).toContain('playsole-theme-toggle');
    expect(themeStyles).toContain('position: fixed');
    expect(themeStyles).toContain('bottom: 20px');
    expect(themeStyles).toContain('right: 20px');
    expect(themeStyles).toContain('html.dark');
    expect(themeStyles).toContain('[data-theme="dark"]');
    expect(themeStyles).toContain('--bg-canvas');
    expect(themeStyles).toContain('#000000');
  });

  it('verifies developer portal supports true black in dark mode and clean light mode', async () => {
    const { renderDevelopersView } = await import('../../gateway/src/developersView');
    const html = renderDevelopersView();
    expect(html).toContain('--bg-base: #000000');
    expect(html).toContain('html:not(.dark):not([data-theme="dark"])');
    expect(html).toContain('--bg-base: #f8fafc');
  });

  it('verifies landing page nav, boxes, and footer have developer pure black dark mode styles', async () => {
    expect(themeStyles).toContain('html.dark .nav');
    expect(themeStyles).toContain('html.dark footer');
    expect(themeStyles).toContain('html.dark .bento-card');
    expect(themeStyles).toContain('html.dark .step-card');
    expect(themeStyles).toContain('html.dark .integration-box');
    expect(themeStyles).toContain('html.dark .mobile-drawer');

    const { landingPage } = await import('../../gateway/src/views');
    const html = landingPage();
    const themed = injectTheme(html);
    expect(themed).toContain('id="playsole-theme-styles"');
    expect(themed).toContain('id="playsoleThemeToggle"');
  });

  it('verifies CTA box Ready to integrate has developer pure black dark mode style and tokens', () => {
    expect(themeStyles).toContain('--bg-dark: #08080a');
    expect(themeStyles).toContain('html.dark .cta-card');
    expect(themeStyles).toContain('[data-theme="dark"] .cta-card');
    expect(themeStyles).toContain('background: #08080a !important');
  });

  it('verifies status page has pure black dark mode rules and is wrapped with injectTheme', async () => {
    const { renderStatusPage } = await import('../../gateway/src/statusView');
    const html = renderStatusPage([
      { name: 'Auth', status: 'operational', latencyMs: 5 },
      { name: 'Database', status: 'operational', latencyMs: 12 },
    ]);
    expect(html).toContain('id="playsole-theme-styles"');
    expect(html).toContain('id="playsoleThemeToggle"');
    expect(themeStyles).toContain('html.dark .hero-horizon-card');
    expect(themeStyles).toContain('html.dark .service-studio-card');
    expect(themeStyles).toContain('html.dark .bento-studio-card');
    expect(themeStyles).toContain('html.dark .btn-probe-refresh');
  });

  it('verifies user dashboard has pure black dark mode rules and is wrapped with injectTheme', async () => {
    const { dashboardPage } = await import('../../gateway/src/dashboardView');
    const html = dashboardPage({
      displayName: 'Skynet Dev',
      primaryEmail: 'dev@playsole.xyz',
      profile: {
        displayName: 'Skynet Dev',
        email: 'dev@playsole.xyz',
        locale: 'US',
        emailVerified: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      sessions: [],
      devices: [],
      methods: [],
      backupCodes: { total: 5, used: 0 },
      grants: [],
      developerApps: [],
    });
    expect(html).toContain('id="playsole-theme-styles"');
    expect(html).toContain('id="playsoleThemeToggle"');
    expect(themeStyles).toContain('html.dark .identity-horizon-card');
    expect(themeStyles).toContain('html.dark .telemetry-session-card');
    expect(themeStyles).toContain('html.dark .app-vault-item');
    expect(themeStyles).toContain('html.dark .totp-setup-card');
  });

  it('verifies admin dashboard and access denied page have pure black dark mode rules and injectTheme', async () => {
    const { adminDashboardPage, adminAccessDeniedPage } = await import('../../gateway/src/adminView');
    const html = adminDashboardPage({
      currentAdmin: { id: 'adm_1', email: 'admin@playsole.xyz', role: 'superadmin' },
      currentUser: { id: 'adm_1', email: 'admin@playsole.xyz', displayName: 'Admin' },
      users: [],
      clients: [],
      tenants: [],
      auditLogs: [],
      metrics: {
        totalUsers: 10,
        activeUsers: 8,
        suspendedUsers: 2,
        totalClients: 3,
        totalTenants: 1,
        totalLogs: 42,
      },
    });
    expect(html).toContain('id="playsole-theme-styles"');
    expect(html).toContain('id="playsoleThemeToggle"');
    expect(themeStyles).toContain('html.dark .admin-table');
    expect(themeStyles).toContain('html.dark .client-card');
    expect(themeStyles).toContain('html.dark .tenant-card');

    const deniedHtml = adminAccessDeniedPage('Restricted', 'Not permitted');
    expect(deniedHtml).toContain('id="playsole-theme-styles"');
    expect(deniedHtml).toContain('id="playsoleThemeToggle"');
  });

  it('exports themeToggleHtml with toggle button and vertical line / circle SVGs', () => {
    expect(themeToggleHtml).toContain('id="playsoleThemeToggle"');
    expect(themeToggleHtml).toContain('theme-icon-sun');
    expect(themeToggleHtml).toContain('theme-icon-moon');
    expect(themeToggleHtml).toContain('theme-icon-line');
    expect(themeToggleHtml).toContain('theme-icon-o');
    expect(themeToggleHtml).toContain('line x1="12" y1="5" x2="12" y2="19"');
    expect(themeToggleHtml).toContain('circle cx="12" cy="12" r="7"');
    expect(themeToggleHtml).toContain('playsole-theme-toggle');
  });

  it('injectTheme inserts theme styles into head and button into body', () => {
    const rawHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
    const themed = injectTheme(rawHtml);

    expect(themed).toContain('id="playsole-theme-styles"');
    expect(themed).toContain('id="playsoleThemeToggle"');
    expect(themed).toContain('theme-icon-sun');
    expect(themed).toContain('theme-icon-moon');

    // Should not inject twice if already present
    const doubleInjected = injectTheme(themed);
    expect(doubleInjected).toBe(themed);
  });
});
