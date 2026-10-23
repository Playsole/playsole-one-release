import type { HealthHistoryMetrics } from '@playsole-one/shared';
import { renderSeoHead, statusSeo } from './seo';
import { injectTheme } from './theme';

export interface ServiceCheck {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latencyMs?: number;
  detail?: string;
  category?: 'service' | 'infrastructure' | 'gateway';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderStatusPage(checks: ServiceCheck[], userId?: string, historyMetrics?: HealthHistoryMetrics): string {
  const allOperational = checks.length > 0 && checks.every((s) => s.status === 'operational');
  const validLatencies = checks.map((c) => c.latencyMs).filter((l): l is number => typeof l === 'number' && l >= 0);
  const avgLatency = validLatencies.length > 0 ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : 18;
  const operationalCount = checks.filter((c) => c.status === 'operational').length;
  const totalCount = checks.length || 7;

  // Default descriptive mapping for each service
  const serviceMeta: Record<string, { role: string; desc: string; icon: string }> = {
    Auth: { role: 'Identity Provider', desc: 'OIDC Provider, PKCE Token Engine, JWKS & ECDSA Signing', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    Session: { role: 'State Store', desc: 'Sliding Session Windows, Device Footprinting & Revocation', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    Profile: { role: 'Directory & Accounts', desc: 'User Profiles, Avatar Cache, PII Encryption & GDPR Export', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    Consent: { role: 'OAuth 2.0 Grants', desc: 'Dynamic Scope Approvals, App Authorizations & Grant Lifecycle', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    Security: { role: 'Defense & MFA', desc: 'TOTP Generator, FIDO2/WebAuthn, Lockout & Rate Protection', icon: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4' },
    Database: { role: 'PostgreSQL Cluster', desc: 'Supabase Primary & Read Replicas with Connection Pooling', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    Redis: { role: 'In-Memory Cache', desc: 'Distributed Session Store & WorkerSafe Token Rate Limiting', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    Gateway: { role: 'Edge BFF Proxy', desc: 'Reverse Proxy, CSRF Guard, HTTP Tracing & Health Orchestrator', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  };

  const serviceCardsHtml = checks.map((s) => {
    const meta = serviceMeta[s.name] || {
      role: 'Microservice',
      desc: s.detail || 'High-availability distributed subsystem',
      icon: 'M5 12h14M12 5l7 7-7 7',
    };
    const isOk = s.status === 'operational';
    const isDegraded = s.status === 'degraded';
    const dotColor = isOk ? 'var(--success)' : isDegraded ? 'var(--warning)' : 'var(--danger)';
    const statusLabel = isOk ? 'Operational' : isDegraded ? 'Degraded' : 'Down';
    const capsuleClass = isOk ? 'capsule-success' : isDegraded ? 'capsule-warning' : 'capsule-danger';
    const latencyDisplay = typeof s.latencyMs === 'number' ? `${s.latencyMs} ms` : '&mdash;';
    const latencyClass = typeof s.latencyMs === 'number' && s.latencyMs < 60 ? 'lat-fast' : 'lat-normal';

    return `
      <div class="service-studio-card" data-service="${escapeHtml(s.name)}">
        <div class="service-card-header">
          <div class="service-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="${meta.icon}"></path>
            </svg>
          </div>
          <div class="service-identity">
            <div class="service-name-row">
              <span class="service-name">${escapeHtml(s.name)}</span>
              <span class="service-role-badge">${escapeHtml(meta.role)}</span>
            </div>
            <div class="service-desc">${escapeHtml(meta.desc)}</div>
          </div>
        </div>

        <div class="service-telemetry-row">
          <div class="latency-cell">
            <span class="latency-dot"></span>
            <span class="latency-text ${latencyClass}">${latencyDisplay}</span>
          </div>

          <div class="status-capsule ${capsuleClass}">
            <span class="status-dot-pulse" style="background:${dotColor}"></span>
            <span>${statusLabel}</span>
          </div>
        </div>

        <!-- 90-day mini track -->
        <div class="mini-uptime-track" title="90-day uptime: 100.0%">
          <div class="uptime-track-bar"></div>
        </div>
      </div>
    `;
  }).join('');

  // 90-day history day-bars (each representing 1 day)
  const dayItems = historyMetrics?.dailyUptime && historyMetrics.dailyUptime.length > 0
    ? historyMetrics.dailyUptime
    : Array.from({ length: 90 }, (_, i) => ({ dayNumber: 90 - i, dateStr: '', uptimePct: 100.0, hasIncident: false }));

  const days = dayItems.map((d) => {
    const isDegraded = d.uptimePct < 99.0 && d.uptimePct >= 95.0;
    const isDown = d.uptimePct < 95.0;
    const bgStyle = isDown ? 'background:var(--danger);' : isDegraded ? 'background:var(--warning);' : '';
    const label = d.dateStr ? `${d.dateStr}: ${d.uptimePct}% uptime` : `Day ${d.dayNumber} ago: ${d.uptimePct}% uptime`;
    const incidentTag = d.hasIncident ? ' (Incident logged - click to view)' : ' (Click to inspect)';
    return `<div class="day-tick" style="${bgStyle}" data-day="${d.dayNumber}" data-date="${d.dateStr}" data-uptime="${d.uptimePct}" data-incident="${d.hasIncident}" onclick="inspectDayTick(this)" role="button" tabindex="0" title="${escapeHtml(label + incidentTag)}"></div>`;
  }).join('');

  const overall90DayPct = dayItems.length > 0
    ? (dayItems.reduce((acc, curr) => acc + curr.uptimePct, 0) / dayItems.length).toFixed(1)
    : '100.0';

  const sla30Display = typeof historyMetrics?.sla30Day === 'number'
    ? `${historyMetrics.sla30Day.toFixed(2)}%`
    : '99.99%';

  const incidentsList = historyMetrics?.incidents ?? [];
  const incidentsHtml = incidentsList.length > 0
    ? `<div class="incident-list" style="display:flex; flex-direction:column; gap:12px; width:100%;">
        ${incidentsList.map((inc) => {
          const isResolved = Boolean(inc.resolved_at);
          const statusLabel = isResolved ? 'Resolved' : inc.status === 'down' ? 'Active Outage' : 'Active Degradation';
          const badgeColor = isResolved ? 'var(--success)' : inc.status === 'down' ? 'var(--danger)' : 'var(--warning)';
          const statusBg = isResolved ? 'rgba(52, 199, 89, 0.12)' : inc.status === 'down' ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 159, 10, 0.12)';
          const title = `${inc.service.toUpperCase()} Service`;
          const dateFormatted = new Date(inc.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          return `
            <div style="background:var(--bg-canvas); border:1px solid ${isResolved ? 'var(--border-color)' : 'var(--danger)'}; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${badgeColor}; ${!isResolved ? 'box-shadow: 0 0 8px var(--danger);' : ''}"></span>
                  <span style="font-size:14px; font-weight:700; color:var(--text-primary);">${escapeHtml(title)}</span>
                  <span style="font-size:11px; text-transform:uppercase; font-weight:700; letter-spacing:0.04em; padding:2px 8px; border-radius:6px; background:${statusBg}; color:${badgeColor};">${escapeHtml(statusLabel)}</span>
                </div>
                <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">${dateFormatted}</span>
              </div>
              ${inc.summary ? `<p style="margin:0; font-size:13px; color:var(--text-secondary); line-height:1.5;">${escapeHtml(inc.summary)}</p>` : ''}
              ${inc.resolved_at
                ? `<div style="font-size:11px; color:var(--success); font-weight:600; font-family:var(--font-mono); display:flex; align-items:center; gap:5px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Resolved: ${new Date(inc.resolved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>`
                : `<div style="font-size:11px; color:var(--danger); font-weight:700; font-family:var(--font-mono); display:flex; align-items:center; gap:6px;">
                    <span style="width:6px; height:6px; border-radius:50%; background:var(--danger); display:inline-block;"></span>
                    <span>Unresolved &bull; Active Incident Ongoing</span>
                  </div>`
              }
            </div>
          `;
        }).join('')}
      </div>`
    : `<div class="incidents-empty-card">
        <div class="incidents-check-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <div class="incidents-text-title">No Incidents Reported</div>
          <div class="incidents-text-sub">All distributed clusters and edge gateways are operating normally without degradation.</div>
        </div>
      </div>`;

  return injectTheme(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#ffffff">
${renderSeoHead(statusSeo)}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
  <style>
    :root {
      --brand: #0076FE;
      --brand-hover: #0060d0;
      --brand-glow: rgba(0, 118, 254, 0.2);
      --bg-canvas: #f8fafc;
      --surface-island: rgba(255, 255, 255, 0.88);
      --surface-glass: rgba(255, 255, 255, 0.75);
      --surface-card: #ffffff;
      --border-glass: rgba(226, 232, 240, 0.85);
      --border-color: rgba(226, 232, 240, 0.85);
      --border-hover: #cbd5e1;
      --text-primary: #090d16;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --success: #10b981;
      --success-surface: #ecfdf5;
      --success-border: #a7f3d0;
      --warning: #f59e0b;
      --warning-surface: #fffbeb;
      --danger: #ef4444;
      --danger-surface: #fef2f2;
      --dock-height: 58px;
      --radius-pill: 9999px;
      --radius-xl: 20px;
      --radius-lg: 14px;
      --radius-md: 10px;
      --radius-sm: 8px;
      --shadow-island: 0 10px 30px -5px rgba(0, 0, 0, 0.06), 0 4px 12px -2px rgba(0, 0, 0, 0.03);
      --shadow-card: 0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.03);
      --shadow-elevation: 0 12px 32px -4px rgba(15, 23, 42, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; overflow-x: hidden; }

    body {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
      background: var(--bg-canvas);
      color: var(--text-primary);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Atmospheric Horizon Gradient from design_style.md */
    body::before {
      content: "";
      position: fixed;
      top: -220px;
      left: 50%;
      transform: translateX(-50%);
      width: 1100px;
      height: 480px;
      background: radial-gradient(circle, rgba(0, 118, 254, 0.09) 0%, rgba(16, 185, 129, 0.06) 40%, transparent 72%);
      pointer-events: none;
      z-index: 0;
    }

    /* Fixed Floating Island Omni-Dock */
    .dock-container {
      position: fixed;
      top: 14px;
      left: 0;
      right: 0;
      z-index: 1000;
      display: flex;
      justify-content: center;
      padding: 0 16px;
      pointer-events: none;
      width: 100%;
    }

    .omni-dock {
      background: var(--surface-island);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-pill);
      padding: 7px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: var(--shadow-island);
      max-width: 1200px;
      width: 100%;
      pointer-events: auto;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 700;
      font-size: 15px;
      padding-right: 14px;
      border-right: 1px solid var(--border-glass);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .brand-logo {
      width: 26px;
      height: 26px;
      border-radius: 6px;
    }

    .dock-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      flex: 1;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .dock-nav::-webkit-scrollbar { display: none; }

    .dock-nav a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .dock-nav a:hover {
      color: var(--text-primary);
      background: rgba(15, 23, 42, 0.05);
    }
    .dock-nav a.active {
      color: var(--brand);
      background: rgba(0, 118, 254, 0.08);
    }

    .dock-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .dock-status-capsule {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--success-surface);
      color: #065f46;
      border: 1px solid var(--success-border);
      white-space: nowrap;
    }

    .dock-pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
    }

    .admin-link-btn {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-decoration: none;
      padding: 5px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-glass);
      background: #ffffff;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .admin-link-btn:hover {
      color: var(--text-primary);
      border-color: var(--border-hover);
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }

    /* Main Container Stage */
    .status-stage {
      max-width: 1200px;
      margin: 0 auto;
      padding: 92px 24px 64px 24px;
      width: 100%;
      flex: 1;
      position: relative;
      z-index: 1;
    }

    /* Hero Identity Horizon Card from design_style.md Blueprint B */
    .hero-horizon-card {
      background: var(--surface-card);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      padding: 32px 36px;
      margin-bottom: 28px;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 32px;
      position: relative;
      overflow: hidden;
    }

    .hero-horizon-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: ${allOperational ? 'linear-gradient(90deg, #10b981 0%, #0076fe 100%)' : 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'};
    }

    .hero-beacon-side {
      display: flex;
      align-items: flex-start;
      gap: 22px;
    }

    /* Animated Multi-Ring Radar Orb */
    .radar-orb-wrapper {
      position: relative;
      width: 58px;
      height: 58px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .radar-orb-center {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${allOperational ? 'var(--success)' : 'var(--warning)'};
      box-shadow: 0 0 16px ${allOperational ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)'};
      position: relative;
      z-index: 2;
    }

    .radar-orb-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid ${allOperational ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'};
      animation: radarPulse 2.4s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
    }
    .radar-orb-ring:nth-child(2) {
      animation-delay: 0.8s;
    }

    @keyframes radarPulse {
      0% { transform: scale(0.4); opacity: 0.8; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .hero-info-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .hero-tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--brand);
      background: rgba(0, 118, 254, 0.08);
      padding: 3px 9px;
      border-radius: var(--radius-pill);
      align-self: flex-start;
    }

    .hero-status-title {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .hero-status-desc {
      font-size: 14.5px;
      color: var(--text-secondary);
      line-height: 1.55;
      max-width: 540px;
    }

    /* Right Telemetry Horizon */
    .hero-telemetry-side {
      border-left: 1px solid #f1f5f9;
      padding-left: 32px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .telemetry-tile {
      background: rgba(248, 250, 252, 0.7);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .telemetry-tile:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      background: #ffffff;
    }

    .telemetry-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }

    .telemetry-val {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .telemetry-sub {
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    /* Live Controls Row */
    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .section-headline-group {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .section-headline {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text-primary);
    }

    .section-subtext {
      font-size: 13px;
      color: var(--text-muted);
    }

    .action-tools-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-probe-refresh {
      background: #ffffff;
      border: 1px solid var(--border-glass);
      color: var(--text-primary);
      font-size: 12.5px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      transition: all 0.15s ease;
    }
    .btn-probe-refresh:hover {
      border-color: var(--brand);
      color: var(--brand);
      box-shadow: 0 2px 8px rgba(0, 118, 254, 0.1);
    }
    .btn-probe-refresh:active {
      transform: scale(0.97);
    }

    .refresh-spin-icon {
      transition: transform 0.6s ease;
    }
    .spinning {
      animation: spin 0.75s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .auto-refresh-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.7);
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-glass);
      cursor: pointer;
      user-select: none;
    }

    /* Bento Grid Layout Blueprint C */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
      margin-bottom: 28px;
    }

    .col-12 { grid-column: span 12; }
    .col-8  { grid-column: span 8; }
    .col-6  { grid-column: span 6; }
    .col-4  { grid-column: span 4; }

    .bento-studio-card {
      background: var(--surface-card);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-card);
      padding: 24px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .bento-studio-card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-elevation);
    }

    .card-head-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    /* Service Cards Grid */
    .services-grid-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .service-studio-card {
      background: rgba(248, 250, 252, 0.5);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      padding: 14px 18px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      align-items: center;
      transition: all 0.15s ease;
      min-width: 0;
    }
    .service-studio-card:hover {
      background: #ffffff;
      border-color: var(--border-hover);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      transform: translateY(-1px);
    }

    .service-card-header {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .service-icon-box {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: rgba(0, 118, 254, 0.06);
      color: var(--brand);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .service-identity {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .service-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .service-name {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text-primary);
      word-break: break-word;
    }

    .service-role-badge {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-muted);
      background: rgba(15, 23, 42, 0.04);
      padding: 2px 7px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .service-desc {
      font-size: 12.5px;
      color: var(--text-secondary);
      line-height: 1.4;
      overflow-wrap: break-word;
    }

    .service-telemetry-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .latency-cell {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      color: var(--text-secondary);
      background: rgba(15, 23, 42, 0.03);
      padding: 3px 8px;
      border-radius: 6px;
    }

    .latency-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--success);
    }

    .lat-fast { color: #047857; font-weight: 600; }
    .lat-normal { color: var(--text-secondary); }

    .status-capsule {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }

    .capsule-success {
      background: var(--success-surface);
      color: #065f46;
      border: 1px solid var(--success-border);
    }

    .capsule-warning {
      background: var(--warning-surface);
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .capsule-danger {
      background: var(--danger-surface);
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .status-dot-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .mini-uptime-track {
      grid-column: 1 / -1;
      width: 100%;
      height: 3px;
      background: #f1f5f9;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 2px;
    }

    .uptime-track-bar {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
    }

    /* 90-Day Rolling Uptime Bar */
    .uptime-visual-box {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ticks-container {
      display: flex;
      align-items: center;
      gap: 1.5px;
      width: 100%;
      overflow: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 6px 0;
    }
    .ticks-container::-webkit-scrollbar {
      display: none;
    }

    .day-tick {
      flex: 1 1 0;
      min-width: 0;
      height: 28px;
      background: #10b981;
      border-radius: 2px;
      cursor: pointer;
      transition: all 0.15s ease;
      opacity: 0.85;
      outline: none;
      position: relative;
    }
    .day-tick:hover, .day-tick:focus-visible {
      opacity: 1;
      transform: scaleY(1.22);
      box-shadow: 0 0 0 1.5px var(--brand);
      z-index: 2;
    }
    .day-tick.active-tick {
      opacity: 1;
      transform: scaleY(1.28);
      box-shadow: 0 0 0 2px var(--brand), 0 2px 8px rgba(0, 118, 254, 0.4);
      z-index: 3;
    }

    .uptime-legend-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .day-incident-inspector {
      margin-top: 4px;
      border-top: 1px solid var(--border-color);
      padding-top: 10px;
    }

    .day-inspector-hint {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      color: var(--text-muted);
      background: rgba(15, 23, 42, 0.03);
      padding: 8px 10px;
      border-radius: 8px;
    }

    .day-inspector-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: rgba(248, 250, 252, 0.8);
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      padding: 10px 12px;
      animation: fadeInTick 0.15s ease;
    }

    @keyframes fadeInTick {
      from { opacity: 0; transform: translateY(2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .day-inspector-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .day-inspector-date {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .day-inspector-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .day-inspector-badge {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 5px;
    }

    .day-inspector-incident-item {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }

    .day-inspector-item-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .day-inspector-item-desc {
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.4;
      margin: 0;
    }

    .day-inspector-item-meta {
      font-size: 10.5px;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Infrastructure & Security Pillars */
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .pillar-tile {
      background: rgba(248, 250, 252, 0.6);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .pillar-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pillar-desc {
      font-size: 11.5px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    /* Incidents Empty State */
    .incidents-empty-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--success-surface);
      border: 1px solid var(--success-border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
    }

    .incidents-check-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #10b981;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .incidents-text-title {
      font-size: 14px;
      font-weight: 700;
      color: #065f46;
    }

    .incidents-text-sub {
      font-size: 12.5px;
      color: #047857;
    }

    /* Modern Footer */
    .status-footer {
      text-align: center;
      padding: 16px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border-glass);
      margin-top: auto;
      line-height: 1.5;
    }

    /* Hamburger Navigation Button (Mobile) */
    .dock-hamburger-btn {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-glass);
      background: #ffffff;
      cursor: pointer;
      gap: 4px;
      padding: 0;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .dock-hamburger-btn:hover {
      background: #f8fafc;
      border-color: var(--border-hover);
    }
    .dock-hamburger-btn:active {
      transform: scale(0.95);
    }
    .hamburger-bar {
      display: block;
      width: 16px;
      height: 2px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease;
      transform-origin: center;
    }
    .dock-hamburger-btn.is-open .hamburger-bar:nth-child(1) {
      transform: translateY(6px) rotate(45deg);
    }
    .dock-hamburger-btn.is-open .hamburger-bar:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }
    .dock-hamburger-btn.is-open .hamburger-bar:nth-child(3) {
      transform: translateY(-6px) rotate(-45deg);
    }

    /* Status Mobile Drawer Overlay */
    .status-mobile-menu {
      position: fixed;
      inset: 0;
      z-index: 2000;
      pointer-events: none;
      visibility: hidden;
      transition: visibility 0.25s ease;
    }
    .status-mobile-menu.active {
      pointer-events: auto;
      visibility: visible;
    }
    .status-mobile-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 0.22s ease;
    }
    .status-mobile-menu.active .status-mobile-backdrop {
      opacity: 1;
    }
    .status-mobile-drawer {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      max-width: 440px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(28px) saturate(180%);
      -webkit-backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid var(--border-glass);
      border-radius: 22px;
      box-shadow: 0 20px 48px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04);
      padding: 18px 20px;
      transform: translateY(-16px) scale(0.97);
      opacity: 0;
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      max-height: calc(100vh - 24px);
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .status-mobile-menu.active .status-mobile-drawer {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .status-mobile-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(226, 232, 240, 0.7);
      margin-bottom: 14px;
    }
    .status-mobile-close {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-glass);
      background: #f8fafc;
      color: var(--text-secondary);
      font-size: 20px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .status-mobile-close:hover {
      background: #ffffff;
      color: var(--text-primary);
    }
    .status-mobile-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 10px;
      padding-left: 4px;
    }
    .status-mobile-links {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .status-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 600;
      transition: all 0.15s ease;
    }
    .status-nav-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-nav-item svg {
      color: var(--text-muted);
      transition: color 0.15s ease;
      flex-shrink: 0;
    }
    .status-nav-item:hover {
      background: rgba(0, 118, 254, 0.05);
      color: var(--text-primary);
    }
    .status-nav-item:hover svg {
      color: var(--brand);
    }
    .status-nav-item.active {
      background: rgba(0, 118, 254, 0.08);
      color: var(--brand);
    }
    .status-nav-item.active svg {
      color: var(--brand);
    }
    .status-nav-badge {
      font-size: 11px;
      font-weight: 700;
      color: var(--brand);
      background: rgba(0, 118, 254, 0.1);
      padding: 2px 8px;
      border-radius: var(--radius-pill);
    }
    .status-mobile-divider {
      height: 1px;
      background: rgba(226, 232, 240, 0.7);
      margin: 14px 0;
    }
    .status-mobile-footer-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .status-mobile-admin-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid var(--border-glass);
      color: var(--text-primary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 16px;
      border-radius: var(--radius-pill);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: all 0.15s ease;
    }
    .status-mobile-admin-link:hover {
      border-color: var(--brand);
      color: var(--brand);
    }
    .status-mobile-health-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: var(--success-surface);
      color: #065f46;
      border: 1px solid var(--success-border);
      border-radius: var(--radius-pill);
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Responsive Breakpoints */
    @media (max-width: 900px) {
      .hero-horizon-card {
        grid-template-columns: 1fr;
        padding: 24px;
        gap: 24px;
      }
      .hero-telemetry-side {
        border-left: none;
        border-top: 1px solid #f1f5f9;
        padding-left: 0;
        padding-top: 20px;
      }
      .col-12, .col-8, .col-6, .col-4 {
        grid-column: span 12;
      }
      .dock-nav { display: none; }
      .dock-hamburger-btn { display: inline-flex; }
    }

    @media (max-width: 768px) {
      .admin-link-btn {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .dock-container {
        top: 8px;
        padding: 0 10px;
      }
      .omni-dock {
        padding: 6px 12px;
        width: 100%;
        max-width: 100%;
        justify-content: space-between;
      }
      .brand-section {
        border-right: none;
        padding-right: 0;
      }
      .dock-status-capsule span:not(.dock-pulse-dot) {
        display: none;
      }
      .dock-status-capsule {
        padding: 6px;
      }
      .dock-actions {
        gap: 8px;
      }
      .status-stage {
        padding: 72px 12px 32px 12px;
      }
      .hero-horizon-card {
        padding: 18px 14px;
        border-radius: var(--radius-lg);
        gap: 16px;
      }
      .hero-status-title {
        font-size: 20px;
        line-height: 1.25;
        word-break: break-word;
      }
      .hero-beacon-side {
        gap: 12px;
        min-width: 0;
      }
      .hero-info-group {
        min-width: 0;
        flex: 1;
      }
      .hero-status-desc {
        font-size: 13.5px;
      }
      .radar-orb-wrapper {
        width: 42px;
        height: 42px;
      }
      .radar-orb-center {
        width: 15px;
        height: 15px;
      }
      .hero-telemetry-side {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        padding-top: 14px;
        gap: 8px;
      }
      .telemetry-tile {
        padding: 10px 12px;
        border-radius: var(--radius-md);
      }
      .telemetry-title {
        font-size: 10px;
      }
      .telemetry-val {
        font-size: 17px;
      }
      .telemetry-sub {
        font-size: 11px;
      }
      .controls-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        margin-bottom: 16px;
      }
      .section-headline-group {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .section-headline {
        font-size: 17px;
      }
      .section-subtext {
        font-size: 12px;
      }
      .action-tools-group {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }
      .auto-refresh-toggle {
        padding: 6px 10px;
        font-size: 11.5px;
        gap: 6px;
      }
      .btn-probe-refresh {
        padding: 6px 12px;
        font-size: 12px;
        gap: 6px;
      }
      .bento-studio-card {
        padding: 16px 14px;
        border-radius: var(--radius-lg);
      }
      .card-head-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        margin-bottom: 14px;
      }
      .card-title {
        font-size: 15px;
      }
      .service-studio-card {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 12px 12px;
        border-radius: var(--radius-md);
      }
      .service-card-header {
        gap: 10px;
        min-width: 0;
      }
      .service-icon-box {
        width: 34px;
        height: 34px;
        border-radius: 8px;
      }
      .service-name {
        font-size: 13.5px;
      }
      .service-role-badge {
        font-size: 10px;
      }
      .service-desc {
        font-size: 12px;
      }
      .service-telemetry-row {
        justify-content: space-between;
        width: 100%;
      }
      .status-capsule {
        font-size: 10.5px;
        padding: 3px 8px;
      }
      .latency-cell {
        font-size: 11px;
        padding: 2px 6px;
      }
      .pillars-grid {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .incidents-empty-card {
        padding: 14px;
        font-size: 12.5px;
      }
      .uptime-legend-row {
        font-size: 10px;
        gap: 4px;
      }
      .ticks-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x;
        gap: 2.5px;
        padding: 8px 4px;
        border-radius: 6px;
      }
      .day-tick {
        flex: 0 0 7px;
        min-width: 7px;
        height: 32px;
      }
      .day-tick::before {
        content: "";
        position: absolute;
        top: -8px;
        bottom: -8px;
        left: -2px;
        right: -2px;
      }
      .day-inspector-head {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }

    @media (max-width: 480px) {
      .hero-telemetry-side {
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }
      .telemetry-tile {
        padding: 8px 10px;
      }
      .telemetry-title {
        font-size: 9.5px;
      }
      .telemetry-val {
        font-size: 16px;
      }
      .telemetry-sub {
        font-size: 10.5px;
      }
      .brand-section span {
        font-size: 13.5px;
      }
      .brand-logo {
        width: 22px;
        height: 22px;
      }
      .auto-refresh-toggle {
        padding: 5px 9px;
        font-size: 11px;
        gap: 5px;
      }
      .btn-probe-refresh {
        padding: 5px 11px;
        font-size: 11.5px;
        gap: 5px;
      }
      .status-stage {
        padding: 68px 10px 24px 10px;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Omni-Dock Header (Fixed & Centered) -->
  <div class="dock-container">
    <header class="omni-dock">
      <a href="/" class="brand-section">
        <img src="/logo.png" alt="Playsole One" class="brand-logo" onerror="this.style.display='none'">
        <span>Playsole One</span>
      </a>

      <!-- Centered Navigation Links -->
      <nav class="dock-nav">
        <a href="/">Home</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/profile">Profile</a>
        <a href="/security">Security</a>
        <a href="/grants">Grants</a>
        <a href="/developers">Developers</a>
        <a href="/status" class="active">Status</a>
      </nav>

      <div class="dock-actions">
        <a href="/admin" class="admin-link-btn">Admin Studio</a>
        <button type="button" class="dock-hamburger-btn" id="statusHamburgerBtn" onclick="toggleStatusMobileNav()" aria-label="Toggle navigation menu" aria-expanded="false">
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
        </button>
      </div>
    </header>
  </div>

  <!-- Status Mobile Navigation Menu Overlay -->
  <div class="status-mobile-menu" id="statusMobileMenu" aria-hidden="true">
    <div class="status-mobile-backdrop" onclick="toggleStatusMobileNav(false)"></div>
    <div class="status-mobile-drawer">
      <div class="status-mobile-top">
        <a href="/" class="brand-section" style="border:none; padding:0;">
          <img src="/logo.png" alt="Playsole" class="brand-logo" onerror="this.style.display='none'">
          <span>Playsole One</span>
        </a>
        <button type="button" class="status-mobile-close" onclick="toggleStatusMobileNav(false)" aria-label="Close menu">&times;</button>
      </div>

      <div class="status-mobile-label">Platform Navigation</div>
      <nav class="status-mobile-links">
        <a href="/" class="status-nav-item">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Home</span>
          </div>
        </a>
        <a href="/dashboard" class="status-nav-item">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>Dashboard</span>
          </div>
        </a>
        <a href="/profile" class="status-nav-item">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Profile</span>
          </div>
        </a>
        <a href="/security" class="status-nav-item">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Security</span>
          </div>
        </a>
        <a href="/grants" class="status-nav-item">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Connected Apps</span>
          </div>
        </a>
        <a href="/developers" class="status-nav-item">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span>Developers</span>
          </div>
        </a>
        <a href="/status" class="status-nav-item active">
          <div class="status-nav-item-left">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span>System Status</span>
          </div>
          <span class="status-nav-badge">Current</span>
        </a>
      </nav>

      <div class="status-mobile-divider"></div>

      <div class="status-mobile-footer-actions">
        <a href="/admin" class="status-mobile-admin-link">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span>Open Admin Studio &rarr;</span>
        </a>
      
      </div>
    </div>
  </div>

  <main class="status-stage">

    <!-- Widescreen Hero Identity Horizon Card -->
    <section class="hero-horizon-card">
      <div class="hero-beacon-side">
        <div class="radar-orb-wrapper">
          <div class="radar-orb-center"></div>
          <div class="radar-orb-ring"></div>
          <div class="radar-orb-ring"></div>
        </div>

        <div class="hero-info-group">
          <div class="hero-tag-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Live Telemetry &bull; Updated <span id="heroLastProbe">Just now</span></span>
          </div>
          <h1 class="hero-status-title" id="heroStatusTitle">
            System Status
          </h1>
          <p class="hero-status-desc">
            Continuous synthetic probes monitor Playsole One identity gateways, ECDSA token signers, distributed session replicas, and database cluster latency.
          </p>
        </div>
      </div>

      <div class="hero-telemetry-side">
        <div class="telemetry-tile">
          <span class="telemetry-title">30-Day SLA Uptime</span>
          <span class="telemetry-val" id="telemetrySlaUptime" style="color:var(--success)">${sla30Display}</span>
          <span class="telemetry-sub">Enterprise SLA</span>
        </div>

        <div class="telemetry-tile">
          <span class="telemetry-title">Global Latency</span>
          <span class="telemetry-val" id="telemetryAvgLatency">${avgLatency} ms</span>
          <span class="telemetry-sub">Edge Probe RTT</span>
        </div>

        <div class="telemetry-tile">
          <span class="telemetry-title">Healthy Subsystems</span>
          <span class="telemetry-val" id="telemetryServiceCount" style="color:var(--brand)">${operationalCount}/${totalCount}</span>
          <span class="telemetry-sub">Probes Passing</span>
        </div>

        <div class="telemetry-tile">
          <span class="telemetry-title">Probe Frequency</span>
          <span class="telemetry-val">30s</span>
          <span class="telemetry-sub">Active Health Loop</span>
        </div>
      </div>
    </section>

    <!-- Controls & Action Tools -->
    <div class="controls-row">
      <div class="section-headline-group">
        <h2 class="section-headline">Live Subsystem Health</h2>
        <span class="section-subtext">Real-time status probes across all federated services</span>
      </div>

      <div class="action-tools-group">
        <div class="auto-refresh-toggle" id="autoRefreshBtn" onclick="toggleAutoRefresh()">
          <span id="autoRefreshDot" style="width:6px;height:6px;border-radius:50%;background:var(--success);"></span>
          <span>Auto-Refresh: <strong id="autoRefreshStatus">ON</strong></span>
        </div>

        <button class="btn-probe-refresh" id="probeRefreshBtn" onclick="runLiveProbe()">
          <svg class="refresh-spin-icon" id="refreshIcon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Run Probe</span>
        </button>
      </div>
    </div>

    <!-- Bento Grid Content -->
    <div class="bento-grid">

      <!-- Column 8: Live Services List -->
      <div class="bento-studio-card col-8">
        <div class="card-head-row">
          <h3 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            <span>Federated Identity Microservices</span>
          </h3>
          <span style="font-size:12px; color:var(--text-muted); font-family:'JetBrains Mono',monospace;">protocol: HTTP/REST</span>
        </div>

        <div class="services-grid-list" id="servicesContainer">
          ${serviceCardsHtml}
        </div>
      </div>

      <!-- Column 4: 90-Day Uptime & Pillar Details -->
      <div class="col-4" style="display:flex; flex-direction:column; gap:20px;">

        <!-- 90-Day Uptime Matrix -->
        <div class="bento-studio-card">
          <div class="card-head-row">
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <span>90-Day Reliability</span>
            </h3>
            <span style="font-size:12px; font-weight:700; color:var(--success);">${overall90DayPct}%</span>
          </div>

          <div class="uptime-visual-box">
            <div class="ticks-container" id="ticksContainer">
              ${days}
            </div>
            <div class="uptime-legend-row">
              <span>90 days ago</span>
              <span>${overall90DayPct}% uptime</span>
              <span>Today</span>
            </div>

            <!-- Interactive Day Incident Inspector -->
            <div class="day-incident-inspector" id="dayIncidentInspector">
              <div class="day-inspector-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>Click any bar to inspect daily incident reports &amp; uptime</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Infrastructure Pillars -->
        <div class="bento-studio-card">
          <div class="card-head-row">
            <h3 class="card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Security & Resilience</span>
            </h3>
          </div>

          <div class="pillars-grid">
            <div class="pillar-tile">
              <span class="pillar-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>RFC 9449 DPoP</span>
              </span>
              <span class="pillar-desc">Hardware-bound cryptographic proof keys</span>
            </div>

            <div class="pillar-tile">
              <span class="pillar-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                <span>WorkerSafe Cache</span>
              </span>
              <span class="pillar-desc">Redis memory tier with sliding failover</span>
            </div>

            <div class="pillar-tile">
              <span class="pillar-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                <span>Webhooks Pipeline</span>
              </span>
              <span class="pillar-desc">HMAC-SHA256 verified event dispatch</span>
            </div>

            <div class="pillar-tile">
              <span class="pillar-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Audit Observability</span>
              </span>
              <span class="pillar-desc">Distributed tracing & JSON metrics live</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Column 12: Incident History Log -->
      <div class="bento-studio-card col-12">
        <div class="card-head-row">
          <h3 class="card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Incident Log & Maintenance Notices</span>
          </h3>
          <span style="font-size:12px; color:var(--text-muted);">Window: Last 90 days</span>
        </div>

        ${incidentsHtml}
      </div>

    </div>
  </main>

  <footer class="status-footer">
    Playsole One Identity Platform &bull; Apple Horizontal Island Studio &bull; Real-time Distributed Health Telemetry
  </footer>

  <script>
    let autoRefreshActive = true;
    let autoRefreshInterval = null;
    let incidentsHistory = ${JSON.stringify(incidentsList)};

    function formatTime(d) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function escapeText(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.innerText = str;
      return div.innerHTML;
    }

    function inspectDayTick(elem) {
      if (!elem) return;
      document.querySelectorAll('.day-tick').forEach(t => t.classList.remove('active-tick'));
      elem.classList.add('active-tick');
      try {
        elem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (_) {}

      const dateStr = elem.getAttribute('data-date') || '';
      const dayNum = elem.getAttribute('data-day') || '';
      const uptime = parseFloat(elem.getAttribute('data-uptime') || '100');

      const inspector = document.getElementById('dayIncidentInspector');
      if (!inspector) return;

      const matchingIncidents = dateStr ? (incidentsHistory || []).filter(inc => inc.started_at && inc.started_at.startsWith(dateStr)) : [];

      let formattedDate = dateStr;
      if (dateStr) {
        try {
          const parts = dateStr.split('-');
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        } catch (_) {}
      } else {
        formattedDate = 'Day ' + dayNum + ' ago';
      }

      const isDown = uptime < 95.0;
      const isDegraded = uptime < 99.0 && !isDown;
      const dotColor = isDown ? 'var(--danger)' : isDegraded ? 'var(--warning)' : 'var(--success)';
      const badgeClass = isDown ? 'capsule-danger' : isDegraded ? 'capsule-warning' : 'capsule-success';
      const statusLabel = isDown ? 'Major Outage' : isDegraded ? 'Degraded Performance' : 'Operational';

      let contentHtml = '';
      if (matchingIncidents.length > 0) {
        contentHtml = matchingIncidents.map(inc => {
          const isResolved = Boolean(inc.resolved_at);
          const incBadgeColor = isResolved ? 'var(--success)' : inc.status === 'down' ? 'var(--danger)' : 'var(--warning)';
          const incBg = isResolved ? 'rgba(52, 199, 89, 0.12)' : inc.status === 'down' ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 159, 10, 0.12)';
          const incTitle = (inc.service || 'System').toUpperCase() + ' Service';
          const incStatusLabel = isResolved ? 'Resolved' : inc.status === 'down' ? 'Active Outage' : 'Active Degradation';
          return \`
            <div class="day-inspector-incident-item">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                <span class="day-inspector-item-title">\${escapeText(incTitle)}</span>
                <span style="font-size:10px; font-weight:700; text-transform:uppercase; padding:2px 6px; border-radius:4px; background:\${incBg}; color:\${incBadgeColor};">\${incStatusLabel}</span>
              </div>
              \${inc.summary ? \`<p class="day-inspector-item-desc">\${escapeText(inc.summary)}</p>\` : ''}
              <div class="day-inspector-item-meta">Started: \${new Date(inc.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\${inc.resolved_at ? ' &bull; Resolved: ' + new Date(inc.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ' &bull; <strong style="color:var(--danger)">Unresolved / Active</strong>'}</div>
            </div>
          \`;
        }).join('');
      } else if (isDown || isDegraded) {
        contentHtml = \`
          <div class="day-inspector-incident-item">
            <div class="day-inspector-item-title">Automated Probe Degradation</div>
            <p class="day-inspector-item-desc">Synthetic edge health probes detected intermittent response delays during this period (uptime: \${uptime}%).</p>
          </div>
        \`;
      } else {
        contentHtml = \`
          <div style="font-size:11.5px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; padding:2px 0;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Zero incidents recorded. All 5 federated microservices and clusters operated with \${uptime}% uptime.</span>
          </div>
        \`;
      }

      inspector.innerHTML = \`
        <div class="day-inspector-card">
          <div class="day-inspector-head">
            <div class="day-inspector-date">
              <span class="day-inspector-dot" style="background:\${dotColor}"></span>
              <span>\${formattedDate}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-family:'JetBrains Mono',monospace; font-size:11.5px; font-weight:600; color:\${dotColor};">\${uptime}% Uptime</span>
              <span class="day-inspector-badge \${badgeClass}">\${statusLabel}</span>
            </div>
          </div>
          \${contentHtml}
        </div>
      \`;
    }

    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.classList.contains('day-tick')) {
        e.preventDefault();
        inspectDayTick(document.activeElement);
      }
    });

    async function runLiveProbe() {
      const btn = document.getElementById('probeRefreshBtn');
      const icon = document.getElementById('refreshIcon');
      icon.classList.add('spinning');
      btn.disabled = true;

      try {
        const res = await fetch('/status?format=json', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.checks) {
            updateDashboard(data.checks, data.historyMetrics);
          }
        }
      } catch (err) {
        console.warn('Probe error', err);
      } finally {
        setTimeout(() => {
          icon.classList.remove('spinning');
          btn.disabled = false;
          document.getElementById('heroLastProbe').innerText = formatTime(new Date());
        }, 500);
      }
    }

    function updateDashboard(checks, historyMetrics) {
      let totalLatency = 0;
      let latencyCount = 0;
      let operationalCount = 0;

      checks.forEach(c => {
        if (c.status === 'operational') operationalCount++;
        if (typeof c.latencyMs === 'number') {
          totalLatency += c.latencyMs;
          latencyCount++;
        }

        const card = document.querySelector(\`[data-service="\${c.name}"]\`);
        if (card) {
          const latText = card.querySelector('.latency-text');
          if (latText && typeof c.latencyMs === 'number') {
            latText.innerText = c.latencyMs + ' ms';
          }
        }
      });

      if (latencyCount > 0) {
        const avg = Math.round(totalLatency / latencyCount);
        const latElem = document.getElementById('telemetryAvgLatency');
        if (latElem) latElem.innerText = avg + ' ms';
      }

      const countElem = document.getElementById('telemetryServiceCount');
      if (countElem) countElem.innerText = operationalCount + '/' + checks.length;

      if (historyMetrics && typeof historyMetrics.sla30Day === 'number') {
        const slaElem = document.getElementById('telemetrySlaUptime');
        if (slaElem) slaElem.innerText = historyMetrics.sla30Day.toFixed(2) + '%';
      }

      if (historyMetrics && Array.isArray(historyMetrics.incidents)) {
        incidentsHistory = historyMetrics.incidents;
      }
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const statusText = document.getElementById('autoRefreshStatus');
      const dot = document.getElementById('autoRefreshDot');
      if (autoRefreshActive) {
        statusText.innerText = 'ON';
        dot.style.background = 'var(--success)';
        startInterval();
      } else {
        statusText.innerText = 'OFF';
        dot.style.background = 'var(--text-muted)';
        clearInterval(autoRefreshInterval);
      }
    }

    function toggleStatusMobileNav(open) {
      const menu = document.getElementById('statusMobileMenu');
      const btn = document.getElementById('statusHamburgerBtn');
      if (!menu) return;
      const isOpen = menu.classList.contains('active');
      const shouldOpen = typeof open === 'boolean' ? open : !isOpen;
      if (shouldOpen) {
        menu.classList.add('active');
        menu.setAttribute('aria-hidden', 'false');
        if (btn) {
          btn.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
        document.body.style.overflow = 'hidden';
      } else {
        menu.classList.remove('active');
        menu.setAttribute('aria-hidden', 'true');
        if (btn) {
          btn.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
        }
        document.body.style.overflow = '';
      }
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        toggleStatusMobileNav(false);
      }
    });

    startInterval();
  </script>
</body>
</html>`);
}
