import { describe, expect, it } from 'vitest';
import { dashboardPage, DashboardData } from '../../gateway/src/views';

describe('dashboardPage rendering', () => {
  const mockData: DashboardData = {
    profile: {
      displayName: 'Alice Developer',
      email: 'alice@example.com',
      avatarUrl: undefined,
      locale: 'en',
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
    mfaEnabled: true,
    mfaRequired: false,
    methods: [
      { type: 'totp', id: 'totp-1', name: 'Authenticator app', createdAt: '2026-01-10T00:00:00.000Z' },
      { type: 'webauthn', id: 'webauthn-1', name: 'MacBook TouchID', createdAt: '2026-01-12T00:00:00.000Z' }
    ],
    backupCodes: { total: 10, used: 2 },
    sessions: [
      {
        id: 'session-1',
        tokenType: 'Bearer',
        mfaPassed: true,
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: Date.now() - 3600000,
        lastSeenAt: new Date(Date.now() - 60000).toISOString(),
      }
    ],
    devices: [
      {
        id: 'device-1',
        label: 'MacBook Pro',
        trusted: true,
        firstSeenAt: '2026-01-01T00:00:00.000Z',
        lastSeenAt: '2026-02-15T00:00:00.000Z',
      }
    ],
    grants: [
      {
        id: 'grant-1',
        clientId: 'playsole-mobile-app',
        scopes: ['openid', 'profile', 'email'],
        grantedAt: '2026-01-15T00:00:00.000Z',
      }
    ],
  };

  it('renders unified dashboard layout with navigation tabs and user profile info', () => {
    const html = dashboardPage(mockData);

    // Sidebar & Brand
    expect(html).toContain('Playsole One');
    expect(html).toContain('data-tab="overview"');
    expect(html).toContain('data-tab="profile"');
    expect(html).toContain('data-tab="security"');
    expect(html).toContain('data-tab="grants"');

    // Default active tab should be overview
    expect(html).toContain('class="tab-panel active" id="tab-overview"');

    // User details in overview and footer
    expect(html).toContain('Alice Developer');
    expect(html).toContain('alice@example.com');
    expect(html).toContain('Verified Account');
  });

  it('respects activeTab option when set to security', () => {
    const html = dashboardPage(mockData, { activeTab: 'security' });

    expect(html).toContain('class="tab-panel active" id="tab-security"');
    expect(html).toContain('class="tab-panel " id="tab-overview"');
    expect(html).toContain('Two-Factor Authentication');
    expect(html).toContain('MacBook TouchID');
    expect(html).toContain('Backup codes remaining: <strong>8</strong> of <strong>10</strong>');
  });

  it('renders TOTP setup QR code and form when opts.totp is present', () => {
    const html = dashboardPage(mockData, {
      activeTab: 'security',
      totp: {
        id: 'totp-enroll-1',
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/Playsole:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Playsole',
      }
    });

    expect(html).toContain('Set Up Authenticator App');
    expect(html).toContain('JBSWY3DPEHPK3PXP');
    expect(html).toContain('/security/totp/totp-enroll-1/verify');
    expect(html).toContain('name="code"');
  });

  it('renders newly generated backup codes when opts.backupCodes is provided', () => {
    const codes = ['1111-2222', '3333-4444', '5555-6666'];
    const html = dashboardPage(mockData, {
      activeTab: 'security',
      backupCodes: codes,
    });

    expect(html).toContain('Emergency Backup Codes');
    expect(html).toContain('1111-2222');
    expect(html).toContain('3333-4444');
    expect(html).toContain('5555-6666');
  });

  it('renders authorized applications and revoke action in Connected Apps tab', () => {
    const html = dashboardPage(mockData, { activeTab: 'grants' });

    expect(html).toContain('class="tab-panel active" id="tab-grants"');
    expect(html).toContain('playsole-mobile-app');
    expect(html).toContain('Profile details');
    expect(html).toContain('Email address');
    expect(html).toContain('/grants/revoke/grant-1');
  });

  it('renders empty state for connected apps when grants list is empty', () => {
    const emptyGrantsData: DashboardData = { ...mockData, grants: [] };
    const html = dashboardPage(emptyGrantsData, { activeTab: 'grants' });

    expect(html).toContain('No applications authorized yet');
    expect(html).toContain("You haven't authorized any third-party services yet.");
  });

  it('renders profile tab with avatar upload container and display name input', () => {
    const html = dashboardPage(mockData, { activeTab: 'profile' });

    expect(html).toContain('class="tab-panel active" id="tab-profile"');
    expect(html).toContain('id="avatarInput"');
    expect(html).toContain('id="displayName" name="displayName" value="Alice Developer"');
    expect(html).toContain('id="saveProfileBtn"');
    expect(html).toContain('id="cropModal"');
  });

  it('normalizes client-side tab switching URLs to /dashboard?tab= without hashes or dirty paths', () => {
    const html = dashboardPage(mockData);

    expect(html).toContain("history.replaceState(null, '', '/dashboard?tab=' + tabId);");
    expect(html).not.toContain("u.pathname + u.search + '#' + tabId");
  });

  it('renders mobile hamburger button, active tab chip, and responsive navigation drawer', () => {
    const html = dashboardPage(mockData, { activeTab: 'security' });

    expect(html).toContain('id="userDashboardHamburger"');
    expect(html).toContain('id="dockMobileActiveChip"');
    expect(html).toContain('>Security</span>'); // Active chip matches activeTab
    expect(html).toContain('id="userMobileNavModal"');
    expect(html).toContain('class="user-mobile-nav-list"');
    expect(html).toContain('onclick="mobileSwitchTab(\'overview\')"');
    expect(html).toContain('onclick="mobileSwitchTab(\'security\')"');
    expect(html).toContain('onclick="toggleUserMobileDrawer()"');
  });
});

