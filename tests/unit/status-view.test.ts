import { describe, it, expect } from 'vitest';
import { renderStatusPage, ServiceCheck } from '../../gateway/src/statusView';

describe('Live System Status View (statusView.ts)', () => {
  const mockChecks: ServiceCheck[] = [
    { name: 'Auth', status: 'operational', latencyMs: 14 },
    { name: 'Session', status: 'operational', latencyMs: 8 },
    { name: 'Profile', status: 'operational', latencyMs: 19 },
    { name: 'Consent', status: 'operational', latencyMs: 12 },
    { name: 'Security', status: 'operational', latencyMs: 15 },
    { name: 'Database', status: 'operational', latencyMs: 22 },
    { name: 'Redis', status: 'operational', latencyMs: 4 },
    { name: 'Gateway', status: 'operational', latencyMs: 5 },
  ];

  it('renders omni-dock with status pulse and mobile hamburger button', () => {
    const html = renderStatusPage(mockChecks);

    expect(html).toContain('Playsole One');
    expect(html).toContain('class="omni-dock"');
    expect(html).toContain('class="dock-nav"');
    expect(html).toContain('id="statusHamburgerBtn"');
    expect(html).toContain('class="dock-hamburger-btn"');
    expect(html).toContain('onclick="toggleStatusMobileNav()"');
  });

  it('renders responsive status mobile drawer with all navigation links', () => {
    const html = renderStatusPage(mockChecks);

    expect(html).toContain('id="statusMobileMenu"');
    expect(html).toContain('class="status-mobile-menu"');
    expect(html).toContain('class="status-mobile-drawer"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/profile"');
    expect(html).toContain('href="/security"');
    expect(html).toContain('href="/grants"');
    expect(html).toContain('href="/developers"');
    expect(html).toContain('href="/status"');
    expect(html).toContain('href="/admin"');
    expect(html).toContain('onclick="toggleStatusMobileNav(false)"');
  });

  it('renders live subsystem cards with telemetry latencies and roles', () => {
    const html = renderStatusPage(mockChecks);

    expect(html).toContain('data-service="Auth"');
    expect(html).toContain('data-service="Session"');
    expect(html).toContain('data-service="Database"');
    expect(html).toContain('Identity Provider');
    expect(html).toContain('PostgreSQL Cluster');
    expect(html).toContain('14 ms');
    expect(html).toContain('22 ms');
  });

  it('renders 90-day reliability timeline bar and day tick inspector hint', () => {
    const html = renderStatusPage(mockChecks);

    expect(html).toContain('id="ticksContainer"');
    expect(html).toContain('class="ticks-container"');
    expect(html).toContain('class="day-tick"');
    expect(html).toContain('id="dayIncidentInspector"');
    expect(html).toContain('Click any bar to inspect daily incident reports');
  });

  it('validates client-side script syntax parsing in Node runtime', () => {
    const html = renderStatusPage(mockChecks);
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const script = scriptMatch![1];
    expect(() => new Function(script)).not.toThrow();
  });
});
