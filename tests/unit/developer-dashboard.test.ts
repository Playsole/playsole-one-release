import { describe, expect, it } from 'vitest';
import { dashboardPage, DashboardData } from '../../gateway/src/views';

describe('Developer Dashboard & Role Suite', () => {
  const baseMockData: DashboardData = {
    profile: {
      displayName: 'Dev User',
      email: 'dev@example.com',
      avatarUrl: undefined,
      locale: 'en',
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
    mfaEnabled: true,
    mfaRequired: false,
    methods: [],
    backupCodes: { total: 10, used: 0 },
    sessions: [],
    devices: [],
    grants: [],
    developerApps: [],
    isDeveloperAdmin: false,
  };

  it('renders developer dock navigation button and tab panel', () => {
    const html = dashboardPage(baseMockData, { activeTab: 'developer' });

    expect(html).toContain('data-tab="developer"');
    expect(html).toContain('Developer');
    expect(html).toContain('id="tab-developer"');
    expect(html).toContain('Developer Console & OAuth Applications');
    expect(html).toContain('Register New Application');
  });

  it('renders empty state when user has no registered apps', () => {
    const html = dashboardPage(baseMockData, { activeTab: 'developer' });

    expect(html).toContain('No applications registered yet');
    expect(html).toContain('Register your first application to integrate Playsole One login');
  });

  it('renders registered applications with client ID, allowed redirect URIs and rotate/delete buttons', () => {
    const dataWithApps: DashboardData = {
      ...baseMockData,
      developerApps: [
        {
          id: 'client-uuid-1',
          appName: 'SkyBattle Royale',
          clientId: 'skybattle-royale',
          redirectUris: ['https://skybattle.io/callback', 'http://localhost:3000/callback'],
          firstParty: false,
          publicClient: false,
          createdAt: '2026-03-01T12:00:00.000Z',
        }
      ],
    };

    const html = dashboardPage(dataWithApps, { activeTab: 'developer' });

    expect(html).toContain('SkyBattle Royale');
    expect(html).toContain('skybattle-royale');
    expect(html).toContain('https://skybattle.io/callback');
    expect(html).toContain('http://localhost:3000/callback');
    expect(html).toContain('/developer/apps/client-uuid-1/rotate-secret');
    expect(html).toContain('/developer/apps/client-uuid-1/delete');
    expect(html).toContain('Confidential');
  });

  it('hides First-Party toggle for standard users', () => {
    const html = dashboardPage(baseMockData, { activeTab: 'developer' });

    expect(html).not.toContain('First-Party Trusted Application');
    expect(html).not.toContain('Developer Admin Privilege');
  });

  it('shows First-Party toggle and Developer Admin badge for developer_admin users', () => {
    const adminData: DashboardData = {
      ...baseMockData,
      isDeveloperAdmin: true,
      role: 'developer_admin',
    };

    const html = dashboardPage(adminData, { activeTab: 'developer' });

    expect(html).toContain('Developer Admin');
    expect(html).toContain('First-Party Trusted Application');
    expect(html).toContain('Developer Admin Privilege:');
    expect(html).toContain('name="firstParty"');
  });

  it('renders first-party badge on client cards flagged as first_party', () => {
    const dataWithFirstPartyApp: DashboardData = {
      ...baseMockData,
      isDeveloperAdmin: true,
      developerApps: [
        {
          id: 'fp-uuid-1',
          appName: 'Playsole Studio Core',
          clientId: 'playsole-studio-core',
          redirectUris: ['https://studio.playsole.xyz/callback'],
          firstParty: true,
          publicClient: false,
          createdAt: '2026-03-01T12:00:00.000Z',
        }
      ],
    };

    const html = dashboardPage(dataWithFirstPartyApp, { activeTab: 'developer' });

    expect(html).toContain('Playsole Studio Core');
    expect(html).toContain('First-Party');
    expect(html).toContain('title="Internal ecosystem bypass"');
  });

  it('renders one-time secret reveal alert banner when developerSecretFlash is provided', () => {
    const html = dashboardPage(baseMockData, {
      activeTab: 'developer',
      developerSecretFlash: {
        appName: 'New Game Client',
        clientId: 'new-game-client',
        secret: 'pso_testsecret_1234567890abcdef',
      },
    });

    expect(html).toContain('Application Credentials Generated: New Game Client');
    expect(html).toContain('new-game-client');
    expect(html).toContain('pso_testsecret_1234567890abcdef');
    expect(html).toContain('never be shown again');
  });

  it('includes standard integration endpoints quick reference', () => {
    const html = dashboardPage(baseMockData, { activeTab: 'developer' });

    expect(html).toContain('https://one.playsole.xyz/.well-known/openid-configuration');
    expect(html).toContain('https://one.playsole.xyz/authorize');
    expect(html).toContain('https://one.playsole.xyz/token');
    expect(html).toContain('https://one.playsole.xyz/userinfo');
    expect(html).toContain('/developers');
  });
});
