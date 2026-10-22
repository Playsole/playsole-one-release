import { cleanIp, formatUserAgent, formatDeviceLabel } from '@playsole-one/shared';

export interface DashboardProfile {
  displayName: string;
  email: string;
  avatarUrl?: string;
  locale: string;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardGrant {
  id: string;
  clientId: string;
  scopes: string[];
  grantedAt: string;
}

export interface DashboardSession {
  id: string;
  clientId?: string;
  tokenType: string;
  deviceInfo?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  mfaPassed: boolean;
  lastSeenAt?: string;
  createdAt: number;
}

export interface DashboardDevice {
  id: string;
  label: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  trusted: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface DashboardMethod {
  type: string;
  id: string;
  name: string;
  createdAt: string;
}

export interface DeveloperApp {
  id: string;
  appName: string;
  clientId: string;
  redirectUris: string[];
  firstParty?: boolean;
  publicClient?: boolean;
  createdAt?: string;
  isOwner?: boolean;
}

export interface DashboardData {
  profile: DashboardProfile;
  displayName?: string;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  methods: DashboardMethod[];
  backupCodes: { total: number; used: number };
  sessions: DashboardSession[];
  devices: DashboardDevice[];
  grants: DashboardGrant[];
  developerApps?: DeveloperApp[];
  isDeveloperAdmin?: boolean;
  role?: string;
  currentSessionId?: string;
}

export interface DashboardOptions {
  activeTab?: 'overview' | 'profile' | 'security' | 'grants' | 'developer';
  message?: string;
  error?: string;
  totp?: { id: string; secret: string; otpauthUrl: string };
  backupCodes?: string[];
  alerts?: Array<{ id: string; signals: string[]; deviceLabel: string; at: number; seen: boolean }>;
  developerSecretFlash?: { clientId: string; appName: string; secret: string };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAvatarColor(name: string): string {
  const colors = [
    '#2563eb', '#4f46e5', '#7c3aed', '#9333ea',
    '#0284c7', '#0891b2', '#0d9488', '#16a34a',
    '#d97706', '#ea580c', '#e11d48', '#475569'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function getInitials(name: string): string {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
}

function renderAvatar(displayName: string, email: string, avatarUrl?: string, size = 42): string {
  const isColor = avatarUrl?.startsWith('#');
  const isImage = Boolean(avatarUrl && !isColor);
  const name = displayName || email || 'User';
  const initial = getInitials(name);
  const bgColor = isColor ? avatarUrl! : getAvatarColor(name);

  if (isImage) {
    return `<img src="${escapeHtml(avatarUrl!)}" alt="${escapeHtml(name)}" class="user-avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
  }
  return `<div class="user-avatar user-avatar-initials" style="width:${size}px;height:${size}px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:${Math.round(size * 0.42)}px;user-select:none;">${initial}</div>`;
}

function scopeDescriptionShort(scope: string): string {
  const descriptions: Record<string, string> = {
    openid: 'Account ID',
    profile: 'Profile details',
    email: 'Email address',
    offline_access: 'Persistent access',
  };
  return descriptions[scope] ?? scope;
}

export function dashboardPage(data: DashboardData, opts: DashboardOptions = {}): string {
  const profile = data.profile || {
    displayName: data.displayName || 'User',
    email: '',
    locale: 'en',
    emailVerified: false,
    createdAt: '',
    updatedAt: '',
  };
  const displayName = profile.displayName || data.displayName || 'User';
  const email = profile.email || '';
  const initialTab = opts.activeTab || 'overview';
  const tabLabelMap: Record<string, string> = {
    overview: 'Overview',
    profile: 'Profile',
    security: 'Security',
    grants: 'Connected Apps',
    developer: 'Developer',
  };
  const initialTabLabel = tabLabelMap[initialTab] || 'Overview';

  const SIGNAL_LABELS: Record<string, string> = {
    new_device: 'New device sign-in detected',
    new_ip: 'Sign-in from a new IP address',
    new_location: 'Sign-in from a new location',
    new_city: 'Sign-in from a new city',
    impossible_travel: 'Location conflicts with recent sign-in activity',
    untrusted_device: 'Sign-in from an untrusted device',
  };

  const alertRows = (opts.alerts ?? []).map((a) => {
    const lines = a.signals.map((s) => SIGNAL_LABELS[s] ?? s).map(escapeHtml).join(' &middot; ');
    return `
      <div class="signal-alert-banner ${a.seen ? 'seen' : 'unseen'}">
        <div class="signal-alert-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="signal-alert-text">
          <div class="signal-alert-title">${lines}</div>
          <div class="signal-alert-sub">${escapeHtml(a.deviceLabel)} &middot; ${new Date(a.at).toLocaleString()}</div>
        </div>
        ${!a.seen ? `
        <form method="POST" action="/security/alerts/${escapeHtml(a.id)}/dismiss">
          <button type="submit" class="btn-island-ghost btn-sm">Dismiss</button>
        </form>` : ''}
      </div>`;
  }).join('');

  const methodRows = data.methods.map((method) => {
    const isTotp = method.type === 'totp';
    const isWebAuthn = method.type === 'webauthn';
    const typeLabel = isTotp ? 'Authenticator App' : isWebAuthn ? 'Passkey / Biometrics' : 'Emergency Backup Codes';
    const icon = isTotp
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`
      : isWebAuthn
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

    const removeAction = isTotp
      ? `<form method="POST" action="/security/totp/${escapeHtml(method.id)}/remove" data-confirm="Remove this authenticator app?"><button type="submit" class="btn-island-danger btn-sm">Remove</button></form>`
      : isWebAuthn
        ? `<form method="POST" action="/security/webauthn/${escapeHtml(method.id)}/remove" data-confirm="Remove this passkey?"><button type="submit" class="btn-island-danger btn-sm">Remove</button></form>`
        : '';

    return `
      <div class="method-horizon-row">
        <div class="method-symbol">${icon}</div>
        <div class="method-details">
          <div class="method-title">${escapeHtml(typeLabel)}</div>
          <div class="method-meta">${escapeHtml(method.name || '')}${method.createdAt ? ' &middot; Added ' + new Date(method.createdAt).toLocaleDateString() : ''}</div>
        </div>
        <div class="method-action">${removeAction}</div>
      </div>`;
  }).join('');

  const sessionRows = data.sessions.map((s) => {
    const isCurrent = data.currentSessionId && s.id === data.currentSessionId;
    const lastSeen = s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : new Date(s.createdAt).toLocaleString();
    const rawUa = s.userAgent || (typeof s.deviceInfo?.ua === 'string' ? s.deviceInfo.ua : '');
    const friendlyUa = formatUserAgent(rawUa);
    const ip = s.ipAddress ? escapeHtml(cleanIp(s.ipAddress)) : '';
    return `
      <div class="telemetry-session-card ${isCurrent ? 'is-current' : ''}">
        <div class="session-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <div class="session-card-body">
          <div class="session-card-title">
            <span title="${escapeHtml(rawUa || friendlyUa)}">${escapeHtml(friendlyUa)}</span>
            ${isCurrent ? '<span class="status-capsule capsule-current">This Device</span>' : ''}
            ${s.mfaPassed ? '<span class="status-capsule capsule-mfa">2FA Passed</span>' : ''}
          </div>
          <div class="session-card-meta">
            ${ip ? ip + ' &middot; ' : ''}Client: ${escapeHtml(s.clientId || 'Playsole One')} &middot; Active ${lastSeen}
          </div>
        </div>
        <div class="session-card-action">
          <form method="POST" action="/security/sessions/${escapeHtml(s.id)}/revoke" data-confirm="Revoke this session? That browser will be signed out.">
            <button type="submit" class="btn-island-danger btn-sm">Revoke</button>
          </form>
        </div>
      </div>`;
  }).join('');

  const deviceRows = data.devices.map((d) => {
    const where = ([d.country, d.city].filter(Boolean) as string[]).map(escapeHtml).join(', ');
    const lastSeen = d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : '—';
    const friendlyLabel = (d.label && d.label !== 'Web browser') ? d.label : formatDeviceLabel(d.userAgent);
    const cleanDeviceIp = cleanIp(d.ipAddress);
    return `
      <div class="telemetry-session-card">
        <div class="session-card-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
        </div>
        <div class="session-card-body">
          <div class="session-card-title">
            <span title="${escapeHtml(d.userAgent || friendlyLabel)}">${escapeHtml(friendlyLabel)}</span>
            ${d.trusted ? '<span class="status-capsule capsule-success">Trusted</span>' : '<span class="status-capsule capsule-neutral">Untrusted</span>'}
          </div>
          <div class="session-card-meta">
            ${cleanDeviceIp ? escapeHtml(cleanDeviceIp) + ' &middot; ' : ''}${where ? where + ' &middot; ' : ''}Last seen ${lastSeen}
          </div>
        </div>
        <div class="session-card-action">
          ${d.trusted
            ? `<form method="POST" action="/security/devices/${escapeHtml(d.id)}/untrust" style="display:inline"><button type="submit" class="btn-island-ghost btn-sm">Mark untrusted</button></form>`
            : `<form method="POST" action="/security/devices/${escapeHtml(d.id)}/trust" style="display:inline"><button type="submit" class="btn-island-ghost btn-sm">Trust</button></form>`}
          <form method="POST" action="/security/devices/${escapeHtml(d.id)}/remove" style="display:inline" data-confirm="Forget this device from your list?">
            <button type="submit" class="btn-island-danger btn-sm">Forget</button>
          </form>
        </div>
      </div>`;
  }).join('');

  const grantRows = (data.grants ?? []).map((g, idx) => {
    const scopes = g.scopes.filter((s) => s !== 'openid').map((s) => `<span class="scope-chip">${scopeDescriptionShort(s)}</span>`).join(' ');
    const grantedDate = g.grantedAt ? new Date(g.grantedAt).toLocaleDateString() : '—';
    return `
      <div class="app-vault-item" id="grant-row-${idx}">
        <div class="app-vault-symbol">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </div>
        <div class="app-vault-body">
          <div class="app-vault-title">${escapeHtml(g.clientId)}</div>
          <div class="app-vault-scopes">${scopes || '<span class="scope-chip">Basic profile</span>'}</div>
          <div class="app-vault-meta">Authorized on ${grantedDate}</div>
        </div>
        <div class="app-vault-action">
          <form method="POST" action="/grants/revoke/${escapeHtml(g.id)}" data-confirm="Revoke access for ${escapeHtml(g.clientId)}?">
            <button type="submit" class="btn-island-danger btn-sm">Revoke</button>
          </form>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Account Settings — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-island: rgba(255, 255, 255, 0.88);
    --surface-glass: rgba(255, 255, 255, 0.7);
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.85);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --success: #10b981;
    --success-surface: #ecfdf5;
    --warning: #f59e0b;
    --warning-surface: #fffbeb;
    --danger: #ef4444;
    --danger-surface: #fef2f2;
    --dock-height: 64px;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --shadow-island: 0 10px 30px -5px rgba(0, 0, 0, 0.06), 0 4px 12px -2px rgba(0, 0, 0, 0.03);
    --shadow-card: 0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.03);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
    background: var(--bg-canvas);
    color: var(--text-primary);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    position: relative;
  }

  /* Atmospheric Gradient Horizon */
  body::before {
    content: "";
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 1000px;
    height: 450px;
    background: radial-gradient(circle, rgba(0, 118, 254, 0.07) 0%, rgba(99, 102, 241, 0.04) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* TOP FLOATING ISLAND OMNI-DOCK */
  .island-dock-container {
    position: sticky;
    top: 18px;
    z-index: 100;
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .island-dock {
    background: var(--surface-island);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border-glass);
    box-shadow: var(--shadow-island);
    border-radius: var(--radius-pill);
    height: var(--dock-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px 0 16px;
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .dock-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    cursor: pointer;
  }

  .dock-brand-logo {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    object-fit: contain;
  }

  .dock-brand-text {
    font-weight: 700;
    font-size: 15px;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dock-brand-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(0, 118, 254, 0.09);
    color: var(--brand);
    padding: 2px 7px;
    border-radius: var(--radius-pill);
  }

  /* Center Segmented Island Switcher */
  .dock-nav-segment {
    display: flex;
    align-items: center;
    background: rgba(241, 245, 249, 0.8);
    border: 1px solid rgba(226, 232, 240, 0.6);
    padding: 4px;
    border-radius: var(--radius-pill);
    gap: 4px;
  }

  .dock-btn {
    border: none;
    background: transparent;
    padding: 7px 15px;
    border-radius: var(--radius-pill);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
    font-family: inherit;
  }

  .dock-btn:hover {
    color: var(--text-primary);
  }

  .dock-btn.active {
    background: #ffffff;
    color: var(--brand);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .dock-btn svg {
    flex-shrink: 0;
  }

  .dock-badge-num {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(0, 118, 254, 0.1);
    color: var(--brand);
  }

  .dock-btn.active .dock-badge-num {
    background: var(--brand);
    color: #fff;
  }

  /* Dock User Capsule */
  .dock-user-capsule {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px 4px 12px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(226, 232, 240, 0.6);
  }

  .dock-user-info {
    text-align: right;
    line-height: 1.2;
  }

  .dock-user-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    max-width: 110px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dock-signout-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    text-decoration: none;
    background: transparent;
    transition: all 0.15s ease;
  }

  .dock-signout-btn:hover {
    color: var(--danger);
    background: var(--danger-surface);
  }

  /* MAIN HORIZON CANVAS */
  .horizon-stage {
    position: relative;
    z-index: 10;
    max-width: 1120px;
    margin: 32px auto 80px;
    padding: 0 20px;
  }

  .tab-panel {
    display: none;
    animation: stageFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .tab-panel.active {
    display: block;
  }

  @keyframes stageFade {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* WIDESCREEN HERO IDENTITY HORIZON CARD */
  .identity-horizon-card {
    background: #ffffff;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    padding: 32px;
    margin-bottom: 24px;
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 32px;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .identity-horizon-card::after {
    content: "";
    position: absolute;
    right: 0;
    top: 0;
    width: 250px;
    height: 100%;
    background: radial-gradient(circle at 100% 50%, rgba(0, 118, 254, 0.04) 0%, transparent 70%);
    pointer-events: none;
  }

  .identity-left-col {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .hero-avatar-halo {
    position: relative;
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    border-radius: 50%;
    cursor: pointer;
  }

  .hero-avatar-halo .user-avatar {
    width: 100% !important;
    height: 100% !important;
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.12);
  }

  .avatar-edit-lens {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(9, 13, 22, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .hero-avatar-halo:hover .avatar-edit-lens {
    opacity: 1;
  }

  .identity-info h1 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .identity-info p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .identity-chips {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .status-capsule {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 600;
  }

  .capsule-success { background: var(--success-surface); color: var(--success); }
  .capsule-warning { background: var(--warning-surface); color: var(--warning); }
  .capsule-neutral { background: #f1f5f9; color: var(--text-secondary); }
  .capsule-current { background: #eff6ff; color: var(--brand); }
  .capsule-mfa { background: #ecfdf5; color: #059669; }

  .identity-telemetry-col {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    border-left: 1px solid #f1f5f9;
    padding-left: 32px;
  }

  .telemetry-tile {
    background: #f8fafc;
    border: 1px solid rgba(226, 232, 240, 0.7);
    border-radius: var(--radius-lg);
    padding: 16px;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .telemetry-tile:hover {
    transform: translateY(-2px);
    border-color: var(--border-hover);
  }

  .telemetry-tile-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }

  .telemetry-tile-val {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .telemetry-tile-sub {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  /* BENTO HORIZON GRID */
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 24px;
  }

  .bento-col-8 { grid-column: span 8; }
  .bento-col-4 { grid-column: span 4; }
  .bento-col-6 { grid-column: span 6; }
  .bento-col-12 { grid-column: span 12; }

  .studio-card {
    background: var(--surface-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    padding: 28px;
    position: relative;
  }

  .studio-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 22px;
    gap: 16px;
  }

  .studio-card-title h2 {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .studio-card-title p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  /* WIDESCREEN BUTTONS & CONTROLS */
  .btn-island-primary {
    background: var(--brand);
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: var(--radius-pill);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
    font-family: inherit;
  }

  .btn-island-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
  }

  .btn-island-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-island-secondary {
    background: #ffffff;
    color: var(--text-primary);
    border: 1px solid var(--border-glass);
    padding: 9px 18px;
    border-radius: var(--radius-pill);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
    font-family: inherit;
    text-decoration: none;
  }

  .btn-island-secondary:hover {
    background: #f8fafc;
    border-color: var(--border-hover);
  }

  .btn-island-ghost {
    background: transparent;
    color: var(--brand);
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    font-family: inherit;
    transition: background 0.15s ease;
  }

  .btn-island-ghost:hover {
    background: rgba(0, 118, 254, 0.08);
  }

  .btn-island-danger {
    background: transparent;
    color: var(--danger);
    border: 1px solid transparent;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 5px 12px;
    border-radius: var(--radius-pill);
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .btn-island-danger:hover {
    background: var(--danger-surface);
    border-color: #fecaca;
  }

  .btn-sm {
    padding: 5px 12px;
    font-size: 12px;
  }

  /* FORMS & INPUTS */
  .island-input-group {
    margin-bottom: 20px;
  }

  .island-input-group label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .island-input-group input,
  .island-input-group select {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-family: inherit;
    color: var(--text-primary);
    background: #ffffff;
    transition: all 0.15s ease;
  }

  .island-input-group input:focus,
  .island-input-group select:focus {
    outline: none;
    border-color: var(--brand);
    box-shadow: 0 0 0 4px var(--brand-glow);
  }

  .island-input-group input:disabled {
    background: #f8fafc;
    color: var(--text-muted);
    cursor: not-allowed;
  }

  /* Method Horizon List */
  .method-horizon-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .method-horizon-row:last-child {
    border-bottom: none;
  }

  .method-symbol {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: #f1f5f9;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .method-details {
    flex: 1;
    min-width: 0;
  }

  .method-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .method-meta {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  /* Telemetry Session Cards */
  .telemetry-session-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #ffffff;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    margin-bottom: 12px;
    transition: border-color 0.15s ease;
  }

  .telemetry-session-card.is-current {
    border-color: rgba(0, 118, 254, 0.4);
    background: #fbfdff;
  }

  .session-card-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #f1f5f9;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .session-card-body {
    flex: 1;
    min-width: 0;
  }

  .session-card-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 3px;
  }

  .session-card-meta {
    font-size: 12px;
    color: var(--text-muted);
  }

  /* App Vault Cards */
  .app-vault-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #ffffff;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    margin-bottom: 12px;
  }

  .app-vault-symbol {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: rgba(0, 118, 254, 0.08);
    color: var(--brand);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .app-vault-body {
    flex: 1;
    min-width: 0;
  }

  .app-vault-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .app-vault-scopes {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 4px 0;
  }

  .scope-chip {
    font-size: 11px;
    font-weight: 600;
    background: #f1f5f9;
    color: var(--text-secondary);
    padding: 2px 8px;
    border-radius: 6px;
  }

  .app-vault-meta {
    font-size: 12px;
    color: var(--text-muted);
  }

  /* Alerts */
  .banner-notify {
    padding: 14px 20px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.4s ease, margin 0.4s ease, padding 0.4s ease;
    max-height: 80px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .banner-notify.success { background: var(--success-surface); color: var(--success); border: 1px solid #bbf7d0; }
  .banner-notify.error { background: var(--danger-surface); color: var(--danger); border: 1px solid #fecaca; }

  .banner-close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
    color: currentColor;
    opacity: 0.6;
    padding: 0 4px;
    border-radius: 4px;
    transition: opacity 0.15s ease;
  }

  .banner-close-btn:hover {
    opacity: 1;
  }

  .signal-alert-banner {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: var(--warning-surface);
    border: 1px solid #fde68a;
    border-radius: var(--radius-lg);
    margin-bottom: 14px;
    color: #92400e;
  }

  .signal-alert-banner.seen {
    opacity: 0.75;
    background: #f8fafc;
    border-color: #e2e8f0;
    color: var(--text-secondary);
  }

  .signal-alert-text {
    flex: 1;
  }

  .signal-alert-title {
    font-size: 13px;
    font-weight: 700;
  }

  .signal-alert-sub {
    font-size: 11px;
    opacity: 0.85;
  }

  /* Modals */
  .island-modal-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(9, 13, 22, 0.45);
    backdrop-filter: blur(8px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
  }

  .island-modal-backdrop.open {
    display: flex;
  }

  .island-modal-card {
    background: #ffffff;
    border-radius: var(--radius-xl);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    padding: 32px;
    width: 90%;
    max-width: 440px;
    text-align: left;
  }

  .island-modal-card h3 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--text-primary);
  }

  .island-modal-card p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 24px;
  }

  .island-modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  /* Crop Modal View */
  .crop-canvas-box {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 16px;
    overflow: hidden;
    background: #090d16;
    margin-bottom: 18px;
  }

  .crop-canvas-box img {
    position: absolute;
    top: 50%;
    left: 50%;
    max-width: none;
    max-height: none;
    cursor: grab;
    user-select: none;
  }

  .crop-canvas-box img.dragging {
    cursor: grabbing;
  }

  .crop-iris-circle {
    position: absolute;
    inset: 0;
    box-shadow: 0 0 0 9999px rgba(9, 13, 22, 0.6);
    border-radius: 50%;
    pointer-events: none;
  }

  .crop-slider-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .crop-slider-bar label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .crop-slider-bar input[type=range] {
    flex: 1;
  }

  /* TOTP Authenticator Setup Responsive Styles */
  .totp-setup-card {
    border: 2px solid var(--brand) !important;
    margin-bottom: 24px;
    background: #ffffff;
  }

  .totp-setup-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 16px;
  }

  .totp-step-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .totp-step-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .totp-step-badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 7px;
    border-radius: 6px;
    background: rgba(0, 118, 254, 0.1);
    color: var(--brand);
  }

  .totp-step-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .totp-media-box {
    display: flex;
    align-items: center;
    gap: 24px;
    background: #f8fafc;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 16px;
  }

  .totp-qr-frame {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border: 1px solid var(--border-glass);
    border-radius: 12px;
    padding: 8px;
    flex-shrink: 0;
  }

  .totp-qr-img {
    width: 140px;
    height: 140px;
    display: block;
    border-radius: 6px;
  }

  .totp-mobile-launcher {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .totp-app-launch-btn {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }

  .totp-launcher-hint {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .secret-pill-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 10px 14px;
    max-width: 100%;
    min-width: 0;
  }

  .secret-pill-box code {
    flex: 1;
    min-width: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--brand);
    word-break: break-all;
    overflow-wrap: break-word;
    user-select: all;
  }

  .totp-verify-form {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .totp-input-wrap {
    min-width: 0;
  }

  .totp-code-input {
    width: 180px;
    padding: 10px 14px;
    border: 1.5px solid var(--border-glass);
    border-radius: var(--radius-lg);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.25em;
    text-align: center;
    background: #ffffff;
    color: var(--text-primary);
    transition: all 0.15s ease;
  }

  .totp-code-input:focus {
    border-color: var(--brand);
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 118, 254, 0.12);
  }

  .totp-verify-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .backup-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    background: #f8fafc;
    border: 1px dashed var(--border-glass);
    border-radius: var(--radius-lg);
    padding: 18px;
    margin: 14px 0 18px;
  }

  .backup-item {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-primary);
    word-break: break-all;
  }

  .spinner-dot {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .btn-loading {
    pointer-events: none;
    opacity: 0.85;
  }

  /* Mobile Hamburger Button */
  .dock-mobile-hamburger {
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
  .dock-mobile-hamburger:hover {
    background: #f8fafc;
    border-color: var(--border-hover);
  }
  .dock-mobile-hamburger:active {
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
  .dock-mobile-hamburger.is-open .hamburger-bar:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
  }
  .dock-mobile-hamburger.is-open .hamburger-bar:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }
  .dock-mobile-hamburger.is-open .hamburger-bar:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
  }

  .dock-mobile-active-chip {
    display: none;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: rgba(0, 118, 254, 0.09);
    color: var(--brand);
    padding: 3px 8px;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  /* User Mobile Drawer Modal */
  .user-mobile-nav-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    pointer-events: none;
    visibility: hidden;
    transition: visibility 0.25s ease;
  }
  .user-mobile-nav-modal.active {
    pointer-events: auto;
    visibility: visible;
  }
  .user-mobile-nav-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 0.22s ease;
  }
  .user-mobile-nav-modal.active .user-mobile-nav-backdrop {
    opacity: 1;
  }
  .user-mobile-nav-drawer {
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
  .user-mobile-nav-modal.active .user-mobile-nav-drawer {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  .user-mobile-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.7);
    margin-bottom: 14px;
  }
  .user-mobile-profile-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .user-mobile-profile-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .user-mobile-profile-name {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .user-mobile-profile-email {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .user-mobile-drawer-close {
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
    flex-shrink: 0;
  }
  .user-mobile-drawer-close:hover {
    background: #ffffff;
    color: var(--text-primary);
  }
  .user-mobile-drawer-section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 10px;
    padding-left: 4px;
  }
  .user-mobile-nav-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .user-mobile-nav-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 600;
    text-align: left;
    transition: all 0.15s ease;
    width: 100%;
    font-family: inherit;
  }
  .user-mobile-nav-item:hover {
    background: rgba(0, 118, 254, 0.05);
    color: var(--text-primary);
  }
  .user-mobile-nav-item.active {
    background: rgba(0, 118, 254, 0.09);
    color: var(--brand);
    font-weight: 700;
  }
  .user-mobile-nav-item .nav-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .user-mobile-nav-item svg {
    color: var(--text-muted);
    transition: color 0.15s ease;
    flex-shrink: 0;
  }
  .user-mobile-nav-item.active svg {
    color: var(--brand);
  }
  .nav-item-indicator {
    color: var(--text-muted);
    font-size: 14px;
    transition: transform 0.15s ease;
  }
  .user-mobile-nav-item:hover .nav-item-indicator {
    transform: translateX(2px);
    color: var(--brand);
  }
  .user-mobile-quick-links {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 5px;
  }
  .user-mobile-sublink {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 12px;
    text-decoration: none;
    color: var(--text-secondary);
    font-size: 13.5px;
    font-weight: 600;
    transition: all 0.15s ease;
  }
  .user-mobile-sublink .nav-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .user-mobile-sublink svg {
    color: var(--text-muted);
  }
  .user-mobile-sublink:hover {
    background: rgba(15, 23, 42, 0.04);
    color: var(--text-primary);
  }
  .user-mobile-drawer-footer {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(226, 232, 240, 0.7);
  }
  .user-mobile-logout-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 11px 16px;
    border-radius: var(--radius-pill);
    border: 1px solid rgba(239, 68, 68, 0.2);
    background: #fff5f5;
    color: #dc2626;
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 600;
    transition: all 0.15s ease;
  }
  .user-mobile-logout-btn:hover {
    background: #fee2e2;
    border-color: #dc2626;
  }

  /* Responsive Rules */
  @media (max-width: 900px) {
    .identity-horizon-card {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .identity-telemetry-col {
      border-left: none;
      padding-left: 0;
      border-top: 1px solid #f1f5f9;
      padding-top: 20px;
    }
    .bento-col-8, .bento-col-4, .bento-col-6 {
      grid-column: span 12;
    }
  }

  @media (max-width: 840px) {
    .dock-nav-segment {
      display: none;
    }
    .dock-mobile-hamburger {
      display: inline-flex;
    }
    .dock-mobile-active-chip {
      display: inline-flex;
    }
    .island-dock {
      justify-content: space-between;
      gap: 8px;
      padding: 0 12px;
    }
  }

  @media (max-width: 640px) {
    :root {
      --dock-height: 54px;
    }
    .island-dock-container {
      top: 8px;
      padding: 0 10px;
    }
    .island-dock {
      padding: 0 10px;
    }
    .dock-user-info {
      display: none;
    }
    .dock-user-capsule {
      padding: 0;
      gap: 6px;
      background: transparent;
      border: none;
    }
    .dock-signout-btn {
      display: none;
    }
    .horizon-stage {
      margin: 16px auto 60px;
      padding: 0 12px;
    }
    .studio-card {
      padding: 20px 16px;
      border-radius: var(--radius-lg);
    }
    .identity-horizon-card {
      padding: 20px 16px;
      border-radius: var(--radius-lg);
      gap: 16px;
    }
    .hero-avatar-halo {
      width: 72px;
      height: 72px;
    }
    .identity-left-col {
      gap: 16px;
    }
    .identity-info h1 {
      font-size: 20px;
      word-break: break-word;
    }
    .identity-info p {
      font-size: 13px;
      word-break: break-all;
    }
    .telemetry-tile {
      padding: 12px 14px;
    }
    .telemetry-tile-val {
      font-size: 16px;
    }
    .telemetry-session-card, .app-vault-item {
      flex-wrap: wrap;
      gap: 12px;
      padding: 14px;
    }
    .session-card-action, .app-vault-action, .method-action {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }
    .session-card-title {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .method-horizon-row {
      flex-wrap: wrap;
      gap: 12px;
    }
    .island-modal-card {
      padding: 22px 18px;
      width: 95%;
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
    }
    .island-modal-actions {
      flex-direction: column-reverse;
      gap: 8px;
    }
    .island-modal-actions button {
      width: 100%;
    }
    .totp-media-box {
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      padding: 14px;
    }
    .totp-qr-img {
      width: 150px;
      height: 150px;
    }
    .totp-mobile-launcher {
      align-items: center;
      width: 100%;
    }
    .totp-app-launch-btn {
      width: 100%;
      justify-content: center;
      align-self: stretch;
      padding: 11px 16px;
    }
    .secret-pill-box {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      padding: 12px 14px;
    }
    .secret-pill-box code {
      text-align: center;
      font-size: 13px;
    }
    .secret-pill-box button {
      width: 100%;
      justify-content: center;
    }
    .totp-verify-form {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      width: 100%;
    }
    .totp-input-wrap {
      width: 100%;
    }
    .totp-code-input {
      width: 100%;
      font-size: 20px;
      padding: 12px;
      border-radius: var(--radius-md);
    }
    .totp-verify-actions {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
      gap: 8px;
    }
    .totp-verify-actions button,
    .totp-verify-actions a {
      width: 100%;
      justify-content: center;
      text-align: center;
      padding: 11px 16px;
    }
    .backup-grid {
      grid-template-columns: 1fr;
      padding: 14px;
      gap: 8px;
    }
  }

  @media (max-width: 480px) {
    .identity-left-col {
      flex-direction: column;
      text-align: center;
      align-items: center;
    }
    .identity-chips {
      justify-content: center;
    }
    .identity-telemetry-col {
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .dock-brand-text {
      display: none;
    }
    .dock-brand {
      gap: 0;
    }
    .bento-grid {
      gap: 14px;
    }
    .studio-card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .studio-card-header button,
    .studio-card-header a {
      width: 100%;
      text-align: center;
      justify-content: center;
    }
    .banner-notify {
      padding: 12px 14px;
      font-size: 13px;
    }
    .signal-alert-banner {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
</head>
<body>

<!-- TOP FLOATING ISLAND OMNI-DOCK -->
<div class="island-dock-container">
  <header class="island-dock">
    <div style="display:flex; align-items:center; gap:10px;">
      <a href="/dashboard" class="dock-brand">
        <img src="/logo.png" alt="Playsole" class="dock-brand-logo" onerror="this.style.display='none'">
        <div class="dock-brand-text">
          <span>Playsole</span> One
        </div>
      </a>
      <span class="dock-mobile-active-chip" id="dockMobileActiveChip">${initialTabLabel}</span>
    </div>

    <!-- Center Segmented Switcher (Desktop) -->
    <nav class="dock-nav-segment" role="tablist">
      <button type="button" class="dock-btn ${initialTab === 'overview' ? 'active' : ''}" data-tab="overview" onclick="switchTab('overview')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <span>Overview</span>
      </button>

      <button type="button" class="dock-btn ${initialTab === 'profile' ? 'active' : ''}" data-tab="profile" onclick="switchTab('profile')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Profile</span>
      </button>

      <button type="button" class="dock-btn ${initialTab === 'security' ? 'active' : ''}" data-tab="security" onclick="switchTab('security')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Security</span>
        ${data.mfaEnabled ? '<span class="dock-badge-num">2FA</span>' : ''}
      </button>

      <button type="button" class="dock-btn ${initialTab === 'grants' ? 'active' : ''}" data-tab="grants" onclick="switchTab('grants')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Connected Apps</span>
        ${(data.grants ?? []).length > 0 ? `<span class="dock-badge-num">${(data.grants ?? []).length}</span>` : ''}
      </button>

      <button type="button" class="dock-btn ${initialTab === 'developer' ? 'active' : ''}" data-tab="developer" onclick="switchTab('developer')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        <span>Developer</span>
        ${(data.developerApps ?? []).length > 0 ? `<span class="dock-badge-num">${(data.developerApps ?? []).length}</span>` : ''}
      </button>
    </nav>

    <!-- Right User Capsule & Hamburger -->
    <div style="display:flex; align-items:center; gap:8px;">
      <div class="dock-user-capsule">
        ${renderAvatar(displayName, email, profile.avatarUrl, 32)}
        <div class="dock-user-info">
          <div class="dock-user-name">${escapeHtml(displayName)}</div>
        </div>
        <a href="/logout" class="dock-signout-btn" title="Sign out">
          <span style="display:none">Sign out</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </a>
      </div>
      <button type="button" class="dock-mobile-hamburger" id="userDashboardHamburger" onclick="toggleUserMobileDrawer()" aria-label="Toggle navigation menu" aria-expanded="false">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
    </div>
  </header>
</div>

<!-- User Mobile Navigation Drawer Modal -->
<div class="user-mobile-nav-modal" id="userMobileNavModal" aria-hidden="true">
  <div class="user-mobile-nav-backdrop" onclick="toggleUserMobileDrawer(false)"></div>
  <div class="user-mobile-nav-drawer">
    <div class="user-mobile-drawer-header">
      <div class="user-mobile-profile-preview">
        ${renderAvatar(displayName, email, profile.avatarUrl, 38)}
        <div class="user-mobile-profile-meta">
          <div class="user-mobile-profile-name">${escapeHtml(displayName)}</div>
          <div class="user-mobile-profile-email">${escapeHtml(email)}</div>
        </div>
      </div>
      <button type="button" class="user-mobile-drawer-close" onclick="toggleUserMobileDrawer(false)" aria-label="Close menu">&times;</button>
    </div>

    <div class="user-mobile-drawer-section-label">Dashboard Navigation</div>
    <nav class="user-mobile-nav-list" role="tablist">
      <button type="button" class="user-mobile-nav-item ${initialTab === 'overview' ? 'active' : ''}" data-tab="overview" onclick="mobileSwitchTab('overview')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Overview</span>
        </div>
        <span class="nav-item-indicator">&rarr;</span>
      </button>

      <button type="button" class="user-mobile-nav-item ${initialTab === 'profile' ? 'active' : ''}" data-tab="profile" onclick="mobileSwitchTab('profile')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </div>
        <span class="nav-item-indicator">&rarr;</span>
      </button>

      <button type="button" class="user-mobile-nav-item ${initialTab === 'security' ? 'active' : ''}" data-tab="security" onclick="mobileSwitchTab('security')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Security</span>
        </div>
        ${data.mfaEnabled ? '<span class="dock-badge-num">2FA</span>' : '<span class="nav-item-indicator">&rarr;</span>'}
      </button>

      <button type="button" class="user-mobile-nav-item ${initialTab === 'grants' ? 'active' : ''}" data-tab="grants" onclick="mobileSwitchTab('grants')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Connected Apps</span>
        </div>
        ${(data.grants ?? []).length > 0 ? `<span class="dock-badge-num">${(data.grants ?? []).length}</span>` : '<span class="nav-item-indicator">&rarr;</span>'}
      </button>

      <button type="button" class="user-mobile-nav-item ${initialTab === 'developer' ? 'active' : ''}" data-tab="developer" onclick="mobileSwitchTab('developer')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span>Developer Console</span>
        </div>
        ${(data.developerApps ?? []).length > 0 ? `<span class="dock-badge-num">${(data.developerApps ?? []).length}</span>` : '<span class="nav-item-indicator">&rarr;</span>'}
      </button>
    </nav>

    <div class="user-mobile-drawer-section-label">Platform &amp; Docs</div>
    <div class="user-mobile-quick-links">
      <a href="/status" class="user-mobile-sublink">
        <div class="nav-item-left">
          <span class="dock-pulse-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;"></span>
          <span>Live System Status</span>
        </div>
        <span style="font-size:11.5px;color:#047857;font-weight:600;">Operational</span>
      </a>
      <a href="/developers" class="user-mobile-sublink">
        <div class="nav-item-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>API Docs &amp; Guides</span>
        </div>
        <span class="nav-item-indicator">&rarr;</span>
      </a>
    </div>

    <div class="user-mobile-drawer-footer">
      <a href="/logout" class="user-mobile-logout-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Sign Out</span>
      </a>
    </div>
  </div>
</div>

<!-- WIDESCREEN HORIZON STAGE -->
<main class="horizon-stage">
  ${opts.message ? `<div class="banner-notify success" role="alert"><span>${escapeHtml(opts.message)}</span><button type="button" class="banner-close-btn" onclick="dismissBanner(this.parentElement)" aria-label="Close">&times;</button></div>` : ''}
  ${opts.error ? `<div class="banner-notify error" role="alert"><span>${escapeHtml(opts.error)}</span><button type="button" class="banner-close-btn" onclick="dismissBanner(this.parentElement)" aria-label="Close">&times;</button></div>` : ''}

  <!-- OVERVIEW TAB -->
  <section class="tab-panel ${initialTab === 'overview' ? 'active' : ''}" id="tab-overview">
    <!-- Hero Identity Horizon Card -->
    <div class="identity-horizon-card">
      <div class="identity-left-col">
        <div class="hero-avatar-halo" onclick="switchTab('profile')" title="Click to view profile photo">
          ${renderAvatar(displayName, email, profile.avatarUrl, 96)}
          <div class="avatar-edit-lens">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
        </div>
        <div class="identity-info">
          <h1>${escapeHtml(displayName)}</h1>
          <p>${escapeHtml(email)}</p>
          <div class="identity-chips">
            ${profile.emailVerified
              ? '<span class="status-capsule capsule-success"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Verified Account</span>'
              : '<a href="/verify-email" class="status-capsule capsule-warning" style="text-decoration:none">Verify Email &rarr;</a>'}
            <span class="status-capsule capsule-neutral">${data.mfaEnabled ? 'Shield Active' : 'Standard Protection'}</span>
          </div>
        </div>
      </div>

      <div class="identity-telemetry-col">
        <div class="telemetry-tile">
          <div class="telemetry-tile-label">Security Shield</div>
          <div class="telemetry-tile-val" style="color:${data.mfaEnabled ? 'var(--success)' : 'var(--warning)'}">${data.mfaEnabled ? 'Protected' : 'Off'}</div>
          <div class="telemetry-tile-sub">${data.methods.length} authentication method${data.methods.length === 1 ? '' : 's'}</div>
        </div>

        <div class="telemetry-tile">
          <div class="telemetry-tile-label">Authorized Apps</div>
          <div class="telemetry-tile-val">${(data.grants ?? []).length} Active</div>
          <div class="telemetry-tile-sub">Connected services</div>
        </div>
      </div>
    </div>

    <!-- Overview Action Bento -->
    <div class="bento-grid">
      <div class="studio-card bento-col-8">
        <div class="studio-card-header">
          <div class="studio-card-title">
            <h2>Quick Actions</h2>
            <p>Direct shortcuts to your most frequent account settings.</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button type="button" class="btn-island-secondary" onclick="switchTab('profile')">Update Profile Name</button>
          ${!data.mfaEnabled ? '<button type="button" class="btn-island-secondary" onclick="switchTab(\'security\');enrollTotp()">Enable Two-Factor Auth</button>' : ''}
          <button type="button" class="btn-island-secondary" onclick="switchTab(\'security\');enrollPasskey()">Register Passkey</button>
          <button type="button" class="btn-island-secondary" onclick="switchTab(\'security\')">View Active Sessions</button>
          <button type="button" class="btn-island-secondary" onclick="switchTab(\'grants\')">Review Authorized Apps</button>
        </div>
      </div>

      <div class="studio-card bento-col-4">
        <div class="studio-card-header">
          <div class="studio-card-title">
            <h2>Active Devices</h2>
            <p>${data.sessions.length} browser session${data.sessions.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
          Keep track of where you are signed in across mobile and desktop.
        </div>
        <button type="button" class="btn-island-ghost" style="padding-left:0;" onclick="switchTab('security')">Inspect Sessions &rarr;</button>
      </div>
    </div>
  </section>

  <!-- PROFILE TAB -->
  <section class="tab-panel ${initialTab === 'profile' ? 'active' : ''}" id="tab-profile">
    <div class="bento-grid">
      <div class="studio-card bento-col-4" style="text-align:center;">
        <div class="studio-card-header" style="justify-content:center;margin-bottom:12px;">
          <div class="studio-card-title">
            <h2>Profile Photo</h2>
          </div>
        </div>
        <div class="hero-avatar-halo" style="margin:0 auto 16px;width:112px;height:112px;" onclick="document.getElementById('avatarInput').click()" title="Click to upload a new avatar photo">
          ${renderAvatar(displayName, email, profile.avatarUrl, 112)}
          <div class="avatar-edit-lens">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Supports JPG, PNG, or GIF up to 5MB.</p>
        <button type="button" class="btn-island-secondary btn-sm" onclick="document.getElementById('avatarInput').click()">Upload New Photo</button>
        <input type="file" id="avatarInput" accept="image/*" style="display:none">
      </div>

      <div class="studio-card bento-col-8">
        <div class="studio-card-header">
          <div class="studio-card-title">
            <h2>Personal Information</h2>
            <p>Manage how your name and identity appear across Playsole One.</p>
          </div>
        </div>

        <form method="POST" action="/profile" id="profileForm">
          <div class="island-input-group">
            <label for="displayName">Display Name</label>
            <input type="text" id="displayName" name="displayName" value="${escapeHtml(displayName)}" required maxlength="128">
          </div>

          <div class="island-input-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" value="${escapeHtml(email)}" disabled>
            <div style="font-size:12px;color:var(--text-muted);margin-top:6px">
              ${profile.emailVerified ? '<span style="color:var(--success)">✓ Email is verified.</span>' : 'Email not verified &middot; <a href="/verify-email" style="color:var(--brand)">Verify now</a>'}
            </div>
          </div>

          <div class="island-input-group">
            <label for="locale">Language &amp; Region</label>
            <select id="locale" name="locale">
              <option value="en" ${profile.locale === 'en' ? 'selected' : ''}>English</option>
              <option value="de" ${profile.locale === 'de' ? 'selected' : ''}>Deutsch</option>
              <option value="fr" ${profile.locale === 'fr' ? 'selected' : ''}>Français</option>
              <option value="es" ${profile.locale === 'es' ? 'selected' : ''}>Español</option>
            </select>
          </div>

          <div style="display:flex;justify-content:flex-end;margin-top:12px;">
            <button type="submit" class="btn-island-primary" id="saveProfileBtn" disabled>Save changes</button>
          </div>
        </form>
      </div>
    </div>
  </section>

  <!-- SECURITY TAB (Settings -> Security) -->
  <section class="tab-panel ${initialTab === 'security' ? 'active' : ''}" id="tab-security">
    ${(opts.alerts ?? []).length > 0 ? `
    <div class="studio-card" style="margin-bottom:24px;">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>Recent Security Alerts</h2>
          <p>Unusual sign-in activity detected on your account.</p>
        </div>
      </div>
      ${alertRows}
    </div>` : ''}

    ${opts.totp ? `
    <div class="studio-card totp-setup-card" style="border: 2px solid var(--brand);margin-bottom:24px;">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>Set Up Authenticator App</h2>
          <p>Scan this QR code with Google Authenticator, 1Password, or Authy, then enter the 6-digit confirmation code.</p>
        </div>
      </div>

      <div class="totp-setup-body">
        <!-- Step 1: QR Code or 1-Tap Open -->
        <div class="totp-step-section">
          <div class="totp-step-header">
            <span class="totp-step-badge">Step 1</span>
            <span class="totp-step-title">Scan QR code or launch app</span>
          </div>

          <div class="totp-media-box">
            <div class="totp-qr-frame">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(opts.totp.otpauthUrl)}" alt="TOTP QR Code" class="totp-qr-img">
            </div>
            <div class="totp-mobile-launcher">
              <a href="${escapeHtml(opts.totp.otpauthUrl)}" class="btn-island-primary totp-app-launch-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <span>Open in Authenticator App</span>
              </a>
              <span class="totp-launcher-hint">Using mobile? Tap above to launch Google Authenticator, 1Password, or Authy automatically.</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Manual Secret Key -->
        <div class="totp-step-section">
          <div class="totp-step-header">
            <span class="totp-step-badge">Step 2</span>
            <span class="totp-step-title">Or enter this secret key manually</span>
          </div>

          <div class="secret-pill-box">
            <code id="totp-secret">${escapeHtml(opts.totp.secret)}</code>
            <button type="button" class="btn-island-secondary btn-sm" onclick="copySecret()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
        </div>

        <!-- Step 3: Verification Code -->
        <div class="totp-step-section">
          <div class="totp-step-header">
            <span class="totp-step-badge">Step 3</span>
            <span class="totp-step-title">Enter 6-digit confirmation code</span>
          </div>

          <form method="POST" action="/security/totp/${escapeHtml(opts.totp.id)}/verify" class="totp-verify-form">
            <input type="hidden" name="secret" value="${escapeHtml(opts.totp.secret)}">
            <input type="hidden" name="otpauthUrl" value="${escapeHtml(opts.totp.otpauthUrl)}">
            <div class="totp-input-wrap">
              <input type="text" name="code" class="totp-code-input" placeholder="000 000" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus>
            </div>
            <div class="totp-verify-actions">
              <button type="submit" class="btn-island-primary">Verify &amp; Activate</button>
              <a href="/dashboard?tab=security" class="btn-island-secondary" style="text-decoration:none">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </div>` : ''}

    ${opts.backupCodes ? `
    <div class="studio-card" style="margin-bottom:24px;">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>Emergency Backup Codes</h2>
          <p>Store these codes in a safe place. Each can be used once to access your account if your authenticator is unavailable.</p>
        </div>
      </div>
      <div class="backup-grid">
        ${opts.backupCodes.map((c) => `<div class="backup-item">${escapeHtml(c)}</div>`).join('')}
      </div>
      <p style="font-size:12px;color:var(--text-muted)">These codes will not be shown again. Keep them safe.</p>
    </div>` : ''}

    <div class="bento-grid">
      <!-- 2FA Methods Column -->
      <div class="studio-card bento-col-12">
        <div class="studio-card-header">
          <div class="studio-card-title">
            <h2>Two-Factor Authentication</h2>
            <p>Enhance sign-in protection using mobile authenticator apps, biometric passkeys, or backup recovery codes.</p>
          </div>
          <div>
            ${data.mfaEnabled
              ? '<span class="status-capsule capsule-success">Enabled</span>'
              : '<span class="status-capsule capsule-neutral">Not Configured</span>'}
          </div>
        </div>

        <div style="margin-bottom:20px;">
          ${methodRows || '<div style="padding:16px 0;font-size:14px;color:var(--text-muted)">No secondary authentication methods enrolled yet.</div>'}
        </div>

        ${data.backupCodes.total > 0 ? `
        <div style="margin-bottom:20px;font-size:13px;color:var(--text-secondary)">
          Backup codes remaining: <strong>${data.backupCodes.total - data.backupCodes.used}</strong> of <strong>${data.backupCodes.total}</strong>
        </div>` : ''}

        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${!data.methods.some((m) => m.type === 'totp') ? `
          <button type="button" class="btn-island-secondary" onclick="enrollTotp()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            Add Authenticator App
          </button>` : ''}
          <button type="button" class="btn-island-secondary" onclick="enrollPasskey()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            Add a Passkey
          </button>
          <button type="button" class="btn-island-secondary" onclick="genBackupCodes()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Generate Backup Codes
          </button>
        </div>
      </div>

      <!-- Active Sessions Column -->
      <div class="studio-card bento-col-6">
        <div class="studio-card-header">
          <div class="studio-card-title">
            <h2>Active Sessions</h2>
            <p>Devices and browsers currently authenticated.</p>
          </div>
        </div>
        ${sessionRows || '<div style="padding:16px 0;font-size:14px;color:var(--text-muted)">No active sessions found.</div>'}
      </div>

      <!-- Recognized Devices Column -->
      <div class="studio-card bento-col-6">
        <div class="studio-card-header">
          <div class="studio-card-title">
            <h2>Recognized Devices</h2>
            <p>Known hardware and security trust status.</p>
          </div>
        </div>
        ${deviceRows || '<div style="padding:16px 0;font-size:14px;color:var(--text-muted)">No recognized devices recorded yet.</div>'}
      </div>
    </div>
  </section>

  <!-- CONNECTED APPS TAB (Settings -> Connected Apps) -->
  <section class="tab-panel ${initialTab === 'grants' ? 'active' : ''}" id="tab-grants">
    <div class="studio-card">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>Authorized Applications</h2>
          <p>Third-party applications and services with delegated access to your account.</p>
        </div>
        <div>
          <span class="status-capsule capsule-neutral">${(data.grants ?? []).length} Active</span>
        </div>
      </div>

      <div>
        ${grantRows || `
        <div style="text-align:center;padding:56px 20px;">
          <div style="width:52px;height:52px;border-radius:16px;background:#f1f5f9;color:var(--text-muted);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px">No applications authorized yet</h3>
          <p style="font-size:14px;color:var(--text-muted)">You haven't authorized any third-party services yet.</p>
        </div>`}
      </div>
    </div>
  </section>

  <!-- DEVELOPER APPS TAB -->
  <section class="tab-panel ${initialTab === 'developer' ? 'active' : ''}" id="tab-developer">
    ${opts.developerSecretFlash ? `
    <div class="studio-card" style="border: 2px solid #3b82f6; background: #eff6ff; margin-bottom: 24px;">
      <div style="display:flex;align-items:flex-start;gap:16px;">
        <div style="width:40px;height:40px;border-radius:12px;background:#dbeafe;color:#1d4ed8;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div style="flex:1;">
          <h3 style="font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:4px;">Application Credentials Generated: ${escapeHtml(opts.developerSecretFlash.appName)}</h3>
          <p style="font-size:13px;color:#1e40af;margin-bottom:16px;">
            <strong>Important:</strong> Copy your Client Secret now. For your security, this secret will <strong>never be shown again</strong>.
          </p>

          <div style="display:grid;grid-template-columns:1fr;gap:12px;max-width:680px;">
            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#3b82f6;letter-spacing:0.04em;margin-bottom:4px;">Client ID</div>
              <div style="display:flex;align-items:center;background:#ffffff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 12px;gap:8px;">
                <code style="flex:1;font-family:monospace;font-size:13px;color:#1e293b;user-select:all;">${escapeHtml(opts.developerSecretFlash.clientId)}</code>
                <button type="button" class="btn-island-ghost btn-sm" onclick="copyTextToClipboard('${escapeHtml(opts.developerSecretFlash.clientId)}', 'Client ID copied!')">Copy</button>
              </div>
            </div>

            <div>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#3b82f6;letter-spacing:0.04em;margin-bottom:4px;">Client Secret</div>
              <div style="display:flex;align-items:center;background:#ffffff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 12px;gap:8px;">
                <code style="flex:1;font-family:monospace;font-size:13px;color:#0f172a;font-weight:600;word-break:break-all;user-select:all;">${escapeHtml(opts.developerSecretFlash.secret)}</code>
                <button type="button" class="btn-island-primary btn-sm" onclick="copyTextToClipboard('${escapeHtml(opts.developerSecretFlash.secret)}', 'Client Secret copied!')">Copy Secret</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>` : ''}

    <div class="studio-card">
      <div class="studio-card-header" style="flex-wrap:wrap;align-items:center;">
        <div class="studio-card-title">
          <div style="display:flex;align-items:center;gap:10px;">
            <h2>Developer Console & OAuth Applications</h2>
            ${data.isDeveloperAdmin ? '<span class="status-capsule capsule-mfa" title="Developer Administrator">Developer Admin</span>' : ''}
          </div>
          <p>Register and manage client applications, redirect URIs, and authentication credentials for your projects.</p>
        </div>
        <button type="button" class="btn-island-primary" onclick="openRegisterAppModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Register New Application</span>
        </button>
      </div>

      <div>
        ${(data.developerApps && data.developerApps.length > 0)
          ? data.developerApps.map((app) => `
            <div class="studio-card" style="margin-bottom:16px;box-shadow:none;border:1px solid var(--border-glass);">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:16px;">
                <div>
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;">
                    <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0;">${escapeHtml(app.appName)}</h3>
                    ${app.firstParty ? '<span class="status-capsule capsule-mfa" title="Internal ecosystem bypass">First-Party</span>' : '<span class="status-capsule capsule-neutral">OAuth 2.0</span>'}
                    ${app.publicClient ? '<span class="status-capsule capsule-neutral">Public PKCE</span>' : '<span class="status-capsule capsule-current">Confidential</span>'}
                  </div>
                  <div style="font-size:12px;color:var(--text-muted);">
                    ${app.createdAt ? 'Created ' + new Date(app.createdAt).toLocaleDateString() : 'Active Client'}
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:8px;">
                  ${!app.publicClient ? `
                  <form method="POST" action="/developer/apps/${escapeHtml(app.id)}/rotate-secret" data-confirm="Rotate secret for &quot;${escapeHtml(app.appName)}&quot;? Any existing integration using the old secret will fail immediately until re-configured.">
                    <button type="submit" class="btn-island-secondary btn-sm">Rotate Secret</button>
                  </form>` : ''}
                  <form method="POST" action="/developer/apps/${escapeHtml(app.id)}/delete" data-confirm="Delete application &quot;${escapeHtml(app.appName)}&quot;? All active user grants and credentials for this client ID will be permanently removed.">
                    <button type="submit" class="btn-island-danger btn-sm">Delete</button>
                  </form>
                </div>
              </div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px;display:grid;grid-template-columns:1fr;gap:10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                  <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">Client ID:</span>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <code style="font-family:monospace;font-size:13px;color:var(--text-primary);background:#fff;padding:3px 10px;border:1px solid #cbd5e1;border-radius:6px;user-select:all;">${escapeHtml(app.clientId)}</code>
                    <button type="button" class="btn-island-ghost btn-sm" style="padding:3px 10px;" onclick="copyTextToClipboard('${escapeHtml(app.clientId)}', 'Client ID copied!')">Copy</button>
                  </div>
                </div>

                <div>
                  <span style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Allowed Redirect URIs:</span>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${(app.redirectUris && app.redirectUris.length > 0)
                      ? app.redirectUris.map((u) => `<code style="font-family:monospace;font-size:12px;background:#fff;padding:2px 8px;border:1px solid #cbd5e1;border-radius:6px;color:#334155;">${escapeHtml(u)}</code>`).join('')
                      : '<span style="font-size:12px;color:var(--text-muted);font-style:italic;">No redirect URIs configured</span>'}
                  </div>
                </div>
              </div>
            </div>
          `).join('')
          : `
          <div style="text-align:center;padding:56px 20px;">
            <div style="width:52px;height:52px;border-radius:16px;background:#f1f5f9;color:var(--text-muted);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px">No applications registered yet</h3>
            <p style="font-size:14px;color:var(--text-muted);max-width:440px;margin:0 auto 18px;">Register your first application to integrate Playsole One login, tokens, and PKCE authentication into your frontend or backend services.</p>
            <button type="button" class="btn-island-primary" onclick="openRegisterAppModal()">Create Application</button>
          </div>
          `}
      </div>
    </div>

    <!-- Quick Developer Reference -->
    <div class="studio-card" style="margin-top:24px;">
      <div class="studio-card-header" style="flex-wrap:wrap;align-items:center;">
        <div class="studio-card-title">
          <h2>OIDC & OAuth 2.0 Integration Endpoints</h2>
          <p>Standard endpoints to configure your OpenID Connect libraries and SDKs.</p>
        </div>
        <a href="/developers" target="_blank" class="btn-island-secondary btn-sm">Read Full Documentation &rarr;</a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Discovery Document</div>
          <code style="font-family:monospace;font-size:12px;color:var(--brand);display:block;margin-top:4px;word-break:break-all;">https://one.playsole.xyz/.well-known/openid-configuration</code>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Authorization Endpoint</div>
          <code style="font-family:monospace;font-size:12px;color:var(--brand);display:block;margin-top:4px;word-break:break-all;">https://one.playsole.xyz/authorize</code>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">Token Endpoint</div>
          <code style="font-family:monospace;font-size:12px;color:var(--brand);display:block;margin-top:4px;word-break:break-all;">https://one.playsole.xyz/token</code>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;">UserInfo Endpoint</div>
          <code style="font-family:monospace;font-size:12px;color:var(--brand);display:block;margin-top:4px;word-break:break-all;">https://one.playsole.xyz/userinfo</code>
        </div>
      </div>
    </div>
  </section>
</main>

<!-- Island Confirmation Modal -->
<div id="modal-overlay" class="island-modal-backdrop" onclick="if(event.target===this)closeModal()">
  <div class="island-modal-card">
    <h3 id="modal-title">Confirm Action</h3>
    <p id="modal-message">Are you sure you want to proceed?</p>
    <div class="island-modal-actions">
      <button type="button" class="btn-island-secondary" onclick="closeModal()">Cancel</button>
      <button type="button" id="modal-confirm-btn" class="btn-island-primary" onclick="resolveModal(true)">Confirm</button>
    </div>
  </div>
</div>

<!-- Avatar Zoom/Crop Modal -->
<div class="island-modal-backdrop" id="cropModal">
  <div class="island-modal-card">
    <h3>Adjust Profile Photo</h3>
    <div class="crop-canvas-box" id="cropContainer">
      <img id="cropImage" alt="Crop preview">
      <div class="crop-iris-circle"></div>
    </div>
    <div class="crop-slider-bar">
      <label for="zoomRange">Zoom</label>
      <input type="range" id="zoomRange" min="1" max="3" step="0.01" value="1">
    </div>
    <div class="island-modal-actions">
      <button type="button" class="btn-island-secondary" onclick="closeCropModal()">Cancel</button>
      <button type="button" class="btn-island-primary" id="confirmCropBtn" onclick="confirmCrop()">
        <span>Save Photo</span>
        <div class="spinner-dot" style="display:none"></div>
      </button>
    </div>
  </div>
</div>

<!-- Register Application Modal -->
<div class="island-modal-backdrop" id="registerAppModal" onclick="if(event.target===this)closeRegisterAppModal()">
  <div class="island-modal-card" style="max-width:520px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h3 style="margin:0;font-size:18px;">Register OAuth Application</h3>
      <button type="button" class="banner-close-btn" onclick="closeRegisterAppModal()" aria-label="Close">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">
      Create credentials for your project to authenticate users via standard OpenID Connect & OAuth 2.0 PKCE.
    </p>
    <form method="POST" action="/developer/apps" id="registerAppForm">
      <div class="island-input-group">
        <label for="newAppName">Application Name</label>
        <input type="text" id="newAppName" name="appName" placeholder="e.g. My Awesome App" required maxlength="100">
      </div>
      <div class="island-input-group">
        <label for="newClientId">Client Identifier (Slug)</label>
        <input type="text" id="newClientId" name="clientId" placeholder="e.g. my-awesome-app (optional, auto-generated)" pattern="[a-zA-Z0-9_-]+" title="Alphanumeric, hyphens, and underscores only">
      </div>
      <div class="island-input-group">
        <label for="newRedirectUris">Authorized Redirect URIs (one per line or comma-separated)</label>
        <textarea id="newRedirectUris" name="redirectUris" rows="3" placeholder="http://localhost:3000/callback&#10;https://myapp.com/api/auth/callback" required style="width:100%;padding:10px 14px;border:1px solid var(--border-glass);border-radius:var(--radius-lg);font-family:monospace;font-size:13px;resize:vertical;"></textarea>
      </div>

      ${data.isDeveloperAdmin ? `
      <div class="island-input-group" style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:14px;margin-bottom:20px;">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:700;color:#854d0e;">
          <input type="checkbox" name="firstParty" value="true" style="width:18px;height:18px;accent-color:var(--brand);">
          <span>First-Party Trusted Application</span>
        </label>
        <p style="margin:6px 0 0 28px;font-size:12px;color:#a16207;line-height:1.4;">
          <strong>Developer Admin Privilege:</strong> Mark as internal Playsole ecosystem service. Bypasses user consent prompt during authorization.
        </p>
      </div>` : ''}
      <div class="island-modal-actions" style="margin-top:24px;">
        <button type="button" class="btn-island-secondary" onclick="closeRegisterAppModal()">Cancel</button>
        <button type="submit" class="btn-island-primary">Create Application</button>
      </div>
    </form>
  </div>
</div>

<script>
  // Tab Switching Logic
  var tabTitleMap = {
    overview: 'Overview',
    profile: 'Profile',
    security: 'Security',
    grants: 'Connected Apps',
    developer: 'Developer'
  };

  function switchTab(tabId, skipPush) {
    var validTabs = ['overview', 'profile', 'security', 'grants', 'developer'];
    if (validTabs.indexOf(tabId) === -1) tabId = 'overview';

    document.querySelectorAll('.tab-panel').forEach(function(el) {
      el.classList.remove('active');
    });
    var target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.dock-btn').forEach(function(el) {
      if (el.getAttribute('data-tab') === tabId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    document.querySelectorAll('.user-mobile-nav-item').forEach(function(el) {
      if (el.getAttribute('data-tab') === tabId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    var chip = document.getElementById('dockMobileActiveChip');
    if (chip && tabTitleMap[tabId]) {
      chip.textContent = tabTitleMap[tabId];
    }

    if (!skipPush && window.history && window.history.pushState) {
      window.history.pushState(null, '', '/dashboard?tab=' + tabId);
    } else if (skipPush && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '/dashboard?tab=' + tabId);
    }
  }

  function mobileSwitchTab(tabId) {
    switchTab(tabId);
    toggleUserMobileDrawer(false);
  }

  function toggleUserMobileDrawer(open) {
    var modal = document.getElementById('userMobileNavModal');
    var btn = document.getElementById('userDashboardHamburger');
    if (!modal) return;
    var isOpen = modal.classList.contains('active');
    var shouldOpen = typeof open === 'boolean' ? open : !isOpen;
    if (shouldOpen) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      if (btn) {
        btn.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
      document.body.style.overflow = 'hidden';
    } else {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      if (btn) {
        btn.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    }
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      toggleUserMobileDrawer(false);
    }
  });

  window.addEventListener('popstate', function() {
    var params = new URLSearchParams(window.location.search);
    var qTab = params.get('tab');
    var hash = (window.location.hash || '').replace('#', '');
    var pathTab = window.location.pathname.slice(1).split('/')[0];
    var targetTab = qTab || hash || (['overview', 'profile', 'security', 'grants', 'developer'].indexOf(pathTab) !== -1 ? pathTab : '') || 'overview';
    switchTab(targetTab, true);
  });

  function dismissBanner(banner) {
    if (!banner) return;
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-6px)';
    banner.style.maxHeight = '0';
    banner.style.marginTop = '0';
    banner.style.marginBottom = '0';
    banner.style.paddingTop = '0';
    banner.style.paddingBottom = '0';
    setTimeout(function() {
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    }, 450);
  }

  // Handle deep-link and URL normalization on load
  window.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    var qTab = params.get('tab');
    var hash = (window.location.hash || '').replace('#', '');
    var pathTab = window.location.pathname.slice(1).split('/')[0];
    var targetTab = qTab || hash || (['overview', 'profile', 'security', 'grants', 'developer'].indexOf(pathTab) !== -1 ? pathTab : '') || '${initialTab}';
    switchTab(targetTab, true);

    // Auto-dismiss notification banners after 5 seconds
    var banners = document.querySelectorAll('.banner-notify, .banner');
    if (banners.length > 0) {
      setTimeout(function() {
        banners.forEach(function(b) { dismissBanner(b); });
        if (history.replaceState) {
          var u = new URL(window.location.href);
          if (u.searchParams.has('message') || u.searchParams.has('error')) {
            u.searchParams.delete('message');
            u.searchParams.delete('error');
            history.replaceState(null, '', u.pathname + u.search + u.hash);
          }
        }
      }, 5000);
    }
  });

  // Modal Resolution Helper
  var _modalResolve = null;
  function showModal(title, message, opts) {
    opts = opts || {};
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    var btn = document.getElementById('modal-confirm-btn');
    btn.textContent = opts.confirmText || 'Confirm';
    if (opts.danger) {
      btn.style.background = 'var(--danger)';
    } else {
      btn.style.background = 'var(--brand)';
    }
    document.getElementById('modal-overlay').classList.add('open');
    return new Promise(function(resolve) { _modalResolve = resolve; });
  }

  function resolveModal(val) {
    document.getElementById('modal-overlay').classList.remove('open');
    if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
  }

  function closeModal() { resolveModal(false); }

  function showConfirm(title, message, opts) {
    return showModal(title, message, opts);
  }

  function showAlert(title, message) {
    return showModal(title, message, { confirmText: 'OK' });
  }

  // Attach confirmation to forms
  document.querySelectorAll('form[data-confirm]').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var msg = form.getAttribute('data-confirm');
      showConfirm('Confirm Action', msg, { danger: true }).then(function(ok) {
        if (ok) {
          setLoading(form.querySelector('button[type="submit"]'), 'Processing...');
          form.submit();
        }
      });
    });
  });

  function setLoading(btn, text) {
    if (!btn || btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner-dot"></span>' + text;
  }

  // Profile Form Dirty Check
  var profileForm = document.getElementById('profileForm');
  if (profileForm) {
    var saveBtn = document.getElementById('saveProfileBtn');
    var nameInput = document.getElementById('displayName');
    var localeSelect = document.getElementById('locale');
    var initialName = nameInput ? nameInput.value : '';
    var initialLocale = localeSelect ? localeSelect.value : '';

    function checkFormChanges() {
      if (!saveBtn || saveBtn.classList.contains('btn-loading')) return;
      var curName = nameInput ? nameInput.value : '';
      var curLocale = localeSelect ? localeSelect.value : '';
      var hasChanged = (curName.trim() !== initialName.trim()) || (curLocale !== initialLocale);
      saveBtn.disabled = !hasChanged;
    }

    if (nameInput) {
      nameInput.addEventListener('input', checkFormChanges);
      nameInput.addEventListener('keyup', checkFormChanges);
    }
    if (localeSelect) {
      localeSelect.addEventListener('change', checkFormChanges);
    }

    profileForm.addEventListener('submit', function() {
      setLoading(saveBtn, 'Saving...');
    });
  }

  // Security Helper Functions
  function getCsrfToken() {
    var match = document.cookie.match(/(?:^|;\\s*)playsole_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function submitForm(action) {
    var f = document.createElement('form');
    f.method = 'POST';
    f.action = action;
    var csrf = getCsrfToken();
    if (csrf) {
      var csrfInput = document.createElement('input');
      csrfInput.type = 'hidden';
      csrfInput.name = '_csrf';
      csrfInput.value = csrf;
      f.appendChild(csrfInput);
    }
    document.body.appendChild(f);
    f.submit();
  }

  document.addEventListener('submit', function(e) {
    var f = e.target;
    if (f && f.tagName === 'FORM' && f.method.toUpperCase() === 'POST' && !f.querySelector('input[name="_csrf"]')) {
      var csrf = getCsrfToken();
      if (csrf) {
        var inp = document.createElement('input');
        inp.type = 'hidden';
        inp.name = '_csrf';
        inp.value = csrf;
        f.appendChild(inp);
      }
    }
  }, true);

  function enrollTotp() {
    submitForm('/security/totp/begin');
  }

  async function genBackupCodes() {
    var ok = await showConfirm('Generate Backup Codes', 'Generating fresh backup codes will invalidate any existing codes. Continue?', { danger: true });
    if (!ok) return;
    submitForm('/security/backup-codes');
  }

  async function post(url, body) {
    var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return res.json().catch(function() { return {}; });
  }

  // Fix #1: Decode Base64URL-encoded values (challenge, user.id, credential IDs).
  // @simplewebauthn/server issues Base64URL strings, not hex. The old hex parser
  // (match(/.{2}/g).map((h) => parseInt(h, 16))) produced all-zero Uint8Arrays for
  // any Base64URL character outside [0-9a-fA-F], corrupting every passkey operation.
  function base64UrlDecode(b64url) {
    var b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function base64Url(bytes) {
    var bin = '';
    bytes.forEach(function(b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  }

  async function enrollPasskey() {
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        await showAlert('Passkey Registration', 'Passkeys/WebAuthn are not supported by this browser.');
        return;
      }
      var options = await post('/security/webauthn/register/options');
      if (options.error) {
        await showAlert('Passkey Registration', options.error_description || 'Failed to start passkey registration.');
        return;
      }
      var pk = options.publicKey || options;
      if (!pk || !pk.challenge || !pk.user) {
        await showAlert('Passkey Registration', options.error_description || 'Invalid passkey registration options returned from server.');
        return;
      }
      var createOptions = {
        challenge: base64UrlDecode(pk.challenge),
        rp: { name: (pk.rp && pk.rp.name) || 'Playsole One' },
        user: {
          id: base64UrlDecode(pk.user.id),
          name: pk.user.name,
          displayName: pk.user.displayName || pk.user.name,
        },
        pubKeyCredParams: pk.pubKeyCredParams || [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        timeout: pk.timeout || 60000,
        attestation: pk.attestation || 'none',
        authenticatorSelection: pk.authenticatorSelection || { userVerification: 'preferred' },
      };
      if (pk.rp && pk.rp.id) {
        createOptions.rp.id = pk.rp.id;
      }
      if (pk.excludeCredentials && pk.excludeCredentials.length) {
        createOptions.excludeCredentials = pk.excludeCredentials.map(function(c) {
          return {
            type: c.type || 'public-key',
            id: base64UrlDecode(c.id),
            transports: c.transports,
          };
        });
      }
      var cred = await navigator.credentials.create({
        publicKey: createOptions,
      });
      if (!cred) return;
      var result = await post('/security/webauthn/register', {
        response: {
          id: cred.id,
          rawId: base64Url(new Uint8Array(cred.rawId)),
          type: 'public-key',
          response: {
            attestationObject: base64Url(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: base64Url(new Uint8Array(cred.response.clientDataJSON)),
            transports: cred.response.getTransports ? cred.response.getTransports() : undefined,
          },
          clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
        },
      });
      if (result.error) {
        await showAlert('Passkey Registration', result.error_description || 'Passkey registration failed.');
        return;
      }
      window.location.href = '/dashboard?tab=security&message=' + encodeURIComponent('Passkey registered successfully.');
    } catch (err) {
      await showAlert('Passkey Registration', err && err.message === 'NotAllowedError' ? 'Registration cancelled.' : (err.message || 'Something went wrong.'));
    }
  }

  function copySecret() {
    var secret = document.getElementById('totp-secret');
    if (!secret) return;
    var text = secret.textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function() {
        showAlert('Secret Copied', 'The secret key has been copied to your clipboard.');
      });
    }
  }

  // Crop / Avatar Upload Handling
  var cropState = null;
  var avatarInput = document.getElementById('avatarInput');
  if (avatarInput) {
    avatarInput.addEventListener('change', function(e) {
      var file = e.target.files ? e.target.files[0] : null;
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        var img = new Image();
        img.onload = function() { openCropModal(img, file); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function openCropModal(img, file) {
    var cropImg = document.getElementById('cropImage');
    var container = document.getElementById('cropContainer');
    var zoomRange = document.getElementById('zoomRange');

    cropImg.src = img.src;
    document.getElementById('cropModal').classList.add('open');

    requestAnimationFrame(function() {
      var contW = (container && container.clientWidth) || 360;
      var contH = (container && container.clientHeight) || contW;
      var natW = img.naturalWidth || 400;
      var natH = img.naturalHeight || 400;
      var baseScale = Math.max(contW / natW, contH / natH);

      cropState = {
        img: img, file: file,
        naturalW: natW, naturalH: natH,
        baseScale: baseScale, zoom: 1, dx: 0, dy: 0,
        isDragging: false, dragStartX: 0, dragStartY: 0,
        startDx: 0, startDy: 0,
        contW: contW, contH: contH
      };

      if (zoomRange) zoomRange.value = '1';
      updateCropTransform();

      cropImg.onmousedown = startDrag;
      cropImg.ontouchstart = startDragTouch;
    });
  }

  function updateCropTransform() {
    if (!cropState) return;
    var s = cropState.baseScale * cropState.zoom;
    var cropImg = document.getElementById('cropImage');
    if (!cropImg) return;
    cropImg.style.width = (cropState.naturalW * s) + 'px';
    cropImg.style.height = (cropState.naturalH * s) + 'px';
    cropImg.style.transform = 'translate(calc(-50% + ' + cropState.dx + 'px), calc(-50% + ' + cropState.dy + 'px))';
  }

  function startDrag(e) {
    e.preventDefault();
    cropState.isDragging = true;
    cropState.dragStartX = e.clientX;
    cropState.dragStartY = e.clientY;
    cropState.startDx = cropState.dx;
    cropState.startDy = cropState.dy;
    document.getElementById('cropImage').classList.add('dragging');
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  }

  function startDragTouch(e) {
    e.preventDefault();
    var touch = e.touches[0];
    cropState.isDragging = true;
    cropState.dragStartX = touch.clientX;
    cropState.dragStartY = touch.clientY;
    cropState.startDx = cropState.dx;
    cropState.startDy = cropState.dy;
    document.getElementById('cropImage').classList.add('dragging');
    document.addEventListener('touchmove', onDragTouch);
    document.addEventListener('touchend', endDragTouch);
  }

  function onDrag(e) {
    if (!cropState || !cropState.isDragging) return;
    cropState.dx = cropState.startDx + (e.clientX - cropState.dragStartX);
    cropState.dy = cropState.startDy + (e.clientY - cropState.dragStartY);
    updateCropTransform();
  }

  function onDragTouch(e) {
    if (!cropState || !cropState.isDragging) return;
    var touch = e.touches[0];
    cropState.dx = cropState.startDx + (touch.clientX - cropState.dragStartX);
    cropState.dy = cropState.startDy + (touch.clientY - cropState.dragStartY);
    updateCropTransform();
  }

  function endDrag() {
    if (!cropState) return;
    cropState.isDragging = false;
    var ci = document.getElementById('cropImage');
    if (ci) ci.classList.remove('dragging');
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
  }

  function endDragTouch() {
    if (!cropState) return;
    cropState.isDragging = false;
    var ci = document.getElementById('cropImage');
    if (ci) ci.classList.remove('dragging');
    document.removeEventListener('touchmove', onDragTouch);
    document.removeEventListener('touchend', endDragTouch);
  }

  var zoomRangeEl = document.getElementById('zoomRange');
  if (zoomRangeEl) {
    zoomRangeEl.addEventListener('input', function() {
      if (!cropState) return;
      cropState.zoom = parseFloat(this.value);
      updateCropTransform();
    });
  }

  function closeCropModal() {
    endDrag();
    endDragTouch();
    var modal = document.getElementById('cropModal');
    if (modal) modal.classList.remove('open');
    cropState = null;
    var btn = document.getElementById('confirmCropBtn');
    if (btn) {
      btn.classList.remove('btn-loading');
      btn.innerHTML = '<span>Save Photo</span><div class="spinner-dot" style="display:none"></div>';
    }
    if (avatarInput) avatarInput.value = '';
  }

  function confirmCrop() {
    if (!cropState) return;
    var btn = document.getElementById('confirmCropBtn');
    setLoading(btn, 'Uploading...');

    var container = document.getElementById('cropContainer');
    var contW = (container && container.clientWidth) || cropState.contW || 360;
    var contH = (container && container.clientHeight) || cropState.contH || contW;
    var img = cropState.img;
    var naturalW = cropState.naturalW || img.naturalWidth || 400;
    var naturalH = cropState.naturalH || img.naturalHeight || 400;
    var scale = cropState.baseScale * cropState.zoom;
    var dx = cropState.dx;
    var dy = cropState.dy;
    var cropSize = 400;

    var canvas = document.createElement('canvas');
    canvas.width = cropSize;
    canvas.height = cropSize;
    var ctx = canvas.getContext('2d');

    var dispW = naturalW * scale;
    var dispH = naturalH * scale;
    var srcX = ((dispW - contW) / 2 - dx) / scale;
    var srcY = ((dispH - contH) / 2 - dy) / scale;
    var srcW = contW / scale;
    var srcH = contH / scale;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, cropSize, cropSize);

    canvas.toBlob(function(blob) {
      if (!blob) {
        if (btn) {
          btn.classList.remove('btn-loading');
          btn.innerHTML = '<span>Save Photo</span><div class="spinner-dot" style="display:none"></div>';
        }
        showAlert('Upload Failed', 'Could not read image data.');
        return;
      }
      var fd = new FormData();
      fd.append('avatar', blob, 'avatar.jpg');

      fetch('/profile/avatar', { method: 'POST', body: fd })
        .then(async function(r) {
          if (!r.ok) {
            var errBody = await r.json().catch(function() { return { error_description: r.status + ' ' + r.statusText }; });
            throw new Error(errBody.error_description || 'Upload failed');
          }
          return r.json();
        })
        .then(function() {
          var targetBase = window.location.pathname === '/profile' ? '/profile' : '/dashboard';
          window.location.href = targetBase + '?tab=profile&message=' + encodeURIComponent('Profile photo updated.');
        })
        ['catch'](function(err) {
          if (btn) {
            btn.classList.remove('btn-loading');
            btn.innerHTML = '<span>Save Photo</span><div class="spinner-dot" style="display:none"></div>';
          }
          showAlert('Upload Failed', err.message || 'An error occurred during upload.');
        });
    }, 'image/jpeg', 0.9);
  }

  // Developer Application Modal and Copy Helpers
  function openRegisterAppModal() {
    var m = document.getElementById('registerAppModal');
    if (m) m.classList.add('open');
  }

  function closeRegisterAppModal() {
    var m = document.getElementById('registerAppModal');
    if (m) m.classList.remove('open');
  }

  function copyTextToClipboard(text, successMsg) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showAlert('Copied', successMsg || 'Copied to clipboard.');
      })['catch'](function() {
        prompt('Copy to clipboard:', text);
      });
    } else {
      prompt('Copy to clipboard:', text);
    }
  }

  // Reset loading buttons if restored from cache
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function(btn) {
        btn.classList.remove('btn-loading');
      });
    }
  });
</script>
</body>
</html>`;
}
