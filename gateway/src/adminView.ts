import { injectTheme } from './theme';

export interface AdminUser {
  id: string;
  tenantId: string;
  primaryEmail: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  status: 'active' | 'suspended' | 'disabled';
  createdAt: string;
}

export interface AdminClient {
  id: string;
  tenantId: string;
  clientId: string;
  publicClient: boolean;
  redirectUris: string[];
  grantTypes: string[];
  scopes: string[];
  createdAt: string;
}

export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  config?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  eventType: string;
  userId?: string;
  clientId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminDashboardData {
  currentUser: {
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
  users: AdminUser[];
  clients: AdminClient[];
  tenants: AdminTenant[];
  auditLogs: AdminAuditLog[];
  metrics: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalClients: number;
    totalTenants: number;
    totalLogs: number;
  };
}

export interface AdminDashboardOptions {
  activeTab?: 'users' | 'clients' | 'tenants' | 'audit-logs';
  message?: string;
  error?: string;
  rotatedSecret?: { clientId: string; secret: string };
  searchQuery?: string;
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

function renderAvatar(displayName: string, email: string, avatarUrl?: string, size = 36): string {
  const isColor = avatarUrl?.startsWith('#');
  const isImage = Boolean(avatarUrl && !isColor);
  const name = displayName || email || 'User';
  const initial = (name.trim().charAt(0) || 'U').toUpperCase();
  const bgColor = isColor ? avatarUrl! : getAvatarColor(name);

  if (isImage) {
    return `<img src="${escapeHtml(avatarUrl!)}" alt="${escapeHtml(name)}" class="user-avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
  }
  return `<div class="user-avatar user-avatar-initials" style="width:${size}px;height:${size}px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:${Math.round(size * 0.42)}px;user-select:none;">${initial}</div>`;
}

export function adminDashboardPage(data: AdminDashboardData, opts: AdminDashboardOptions = {}): string {
  const initialTab = opts.activeTab || 'users';
  const adminTabLabelMap: Record<string, string> = {
    users: 'Users',
    clients: 'OAuth Clients',
    tenants: 'Tenants',
    'audit-logs': 'Audit Logs',
  };
  const initialAdminTabLabel = adminTabLabelMap[initialTab] || 'Users';

  // Render User rows
  const userRows = data.users.map((u) => {
    const isSuspended = u.status === 'suspended';
    const isDisabled = u.status === 'disabled';
    const statusCapsule = isSuspended
      ? `<span class="status-capsule capsule-warning">Suspended</span>`
      : isDisabled
      ? `<span class="status-capsule capsule-danger">Disabled</span>`
      : `<span class="status-capsule capsule-success">Active</span>`;

    const mfaCapsule = u.mfaEnabled
      ? `<span class="status-capsule capsule-mfa">2FA Enabled</span>`
      : `<span class="status-capsule capsule-neutral">No 2FA</span>`;

    const verifiedCapsule = u.emailVerified
      ? `<span class="status-capsule capsule-success" title="Email verified">Verified</span>`
      : `<span class="status-capsule capsule-neutral" title="Email not verified">Unverified</span>`;

    const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—';

    return `
      <tr class="admin-table-row" data-user-id="${escapeHtml(u.id)}" data-name="${escapeHtml(u.displayName.toLowerCase())}" data-email="${escapeHtml(u.primaryEmail.toLowerCase())}" data-status="${escapeHtml(u.status)}">
        <td class="col-user">
          <div class="user-cell">
            ${renderAvatar(u.displayName, u.primaryEmail, u.avatarUrl, 38)}
            <div class="user-cell-meta">
              <span class="user-cell-name">${escapeHtml(u.displayName || 'Unnamed User')}</span>
              <span class="user-cell-email">${escapeHtml(u.primaryEmail)}</span>
            </div>
          </div>
        </td>
        <td class="col-id"><span class="code-tag">${escapeHtml(u.id.substring(0, 8))}…</span></td>
        <td class="col-status">${statusCapsule}</td>
        <td class="col-verified">${verifiedCapsule}</td>
        <td class="col-security">${mfaCapsule}</td>
        <td class="col-date">${created}</td>
        <td class="col-actions">
          <div class="action-btn-group">
            ${isSuspended
              ? `<form method="POST" action="/admin/users/${escapeHtml(u.id)}/unsuspend" style="display:inline">
                   <button type="submit" class="btn-island-ghost btn-sm" title="Reactivate user account">Reactivate</button>
                 </form>`
              : `<form method="POST" action="/admin/users/${escapeHtml(u.id)}/suspend" style="display:inline" data-confirm="Suspend this user? They will not be able to sign in.">
                   <button type="submit" class="btn-island-warning btn-sm" title="Suspend user account">Suspend</button>
                 </form>`
            }
            <form method="POST" action="/admin/users/${escapeHtml(u.id)}/delete" style="display:inline" data-confirm="Permanently delete user ${escapeHtml(u.displayName || u.primaryEmail)}? This action cannot be undone.">
              <button type="submit" class="btn-island-danger btn-sm" title="Delete user">Delete</button>
            </form>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Render Client rows
  const clientRows = data.clients.map((c) => {
    const uris = (c.redirectUris ?? []).map((u) => `<span class="uri-chip" title="${escapeHtml(u)}">${escapeHtml(u.length > 32 ? u.substring(0, 30) + '…' : u)}</span>`).join(' ') || '<span class="scope-chip">None</span>';
    const scopes = (c.scopes ?? []).map((s) => `<span class="scope-chip">${escapeHtml(s)}</span>`).join(' ');
    const typeCapsule = c.publicClient
      ? `<span class="status-capsule capsule-neutral">Public (PKCE)</span>`
      : `<span class="status-capsule capsule-current">Confidential</span>`;
    const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—';

    return `
      <div class="studio-card client-card" id="client-${escapeHtml(c.id)}">
        <div class="client-card-header">
          <div class="client-header-left">
            <div class="client-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div>
              <h3 class="client-title">${escapeHtml(c.clientId)}</h3>
              <div class="client-meta">Created on ${created} &middot; ${typeCapsule}</div>
            </div>
          </div>
          <div class="client-header-right">
            ${!c.publicClient ? `
              <form method="POST" action="/admin/clients/${escapeHtml(c.id)}/rotate-secret" data-confirm="Rotate secret for ${escapeHtml(c.clientId)}? The old secret will immediately stop working.">
                <button type="submit" class="btn-island-ghost btn-sm">Rotate Secret</button>
              </form>` : ''}
            <form method="POST" action="/admin/clients/${escapeHtml(c.id)}/delete" data-confirm="Delete client ${escapeHtml(c.clientId)}? All applications using this client will lose access.">
              <button type="submit" class="btn-island-danger btn-sm">Delete</button>
            </form>
          </div>
        </div>
        <div class="client-body">
          <div class="client-field">
            <label>Redirect URIs</label>
            <div class="client-chips">${uris}</div>
          </div>
          <div class="client-field">
            <label>Authorized Scopes</label>
            <div class="client-chips">${scopes}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Render Tenant rows
  const tenantRows = data.tenants.map((t) => {
    const isDefault = t.slug === 'default';
    const created = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—';
    return `
      <div class="studio-card tenant-card">
        <div class="tenant-card-header">
          <div class="tenant-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="tenant-title-wrap">
            <h3 class="tenant-title">${escapeHtml(t.name)}</h3>
            <div class="tenant-meta">Slug: <code>${escapeHtml(t.slug)}</code> ${isDefault ? '<span class="status-capsule capsule-current">Primary System Tenant</span>' : ''}</div>
          </div>
          <div class="tenant-actions">
            ${isDefault ? '' : `
              <form method="POST" action="/admin/tenants/${escapeHtml(t.id)}/delete" data-confirm="Delete tenant ${escapeHtml(t.name)} and all tenant resources?">
                <button type="submit" class="btn-island-danger btn-sm">Delete</button>
              </form>
            `}
          </div>
        </div>
        <div class="tenant-details">
          <div class="tenant-detail-col">
            <span class="detail-label">Tenant ID</span>
            <span class="detail-val font-mono">${escapeHtml(t.id)}</span>
          </div>
          <div class="tenant-detail-col">
            <span class="detail-label">Domain</span>
            <span class="detail-val">${escapeHtml(t.domain || 'Not configured (uses system domain)')}</span>
          </div>
          <div class="tenant-detail-col">
            <span class="detail-label">Created At</span>
            <span class="detail-val">${created}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Render Audit Log rows
  const auditRows = data.auditLogs.map((log) => {
    const isError = log.eventType.includes('failed') || log.eventType.includes('error') || log.eventType.includes('lockout');
    const isSuspended = log.eventType.includes('suspend') || log.eventType.includes('delete');
    const capsuleClass = isError ? 'capsule-danger' : isSuspended ? 'capsule-warning' : 'capsule-success';
    const date = log.createdAt ? new Date(log.createdAt).toLocaleString() : '—';
    const metaStr = log.metadata && Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : '—';

    return `
      <tr class="audit-row" data-event="${escapeHtml(log.eventType)}">
        <td class="col-time font-mono">${date}</td>
        <td class="col-event"><span class="status-capsule ${capsuleClass}">${escapeHtml(log.eventType)}</span></td>
        <td class="col-actor font-mono">${escapeHtml(log.userId ? log.userId.substring(0, 8) + '…' : 'system')}</td>
        <td class="col-client font-mono">${escapeHtml(log.clientId || '—')}</td>
        <td class="col-ip font-mono">${escapeHtml(log.ipAddress || '—')}</td>
        <td class="col-meta font-mono" title="${escapeHtml(metaStr)}">${escapeHtml(metaStr.length > 40 ? metaStr.substring(0, 38) + '…' : metaStr)}</td>
      </tr>
    `;
  }).join('');

  return injectTheme(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Admin Studio — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-island: rgba(255, 255, 255, 0.88);
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
    --shadow-modal: 0 24px 48px -12px rgba(15, 23, 42, 0.16), 0 4px 12px 0 rgba(15, 23, 42, 0.04);
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

  /* Atmospheric Horizon Gradient */
  body::before {
    content: "";
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 1100px;
    height: 450px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, rgba(0, 118, 254, 0.06) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .font-mono { font-family: 'JetBrains Mono', monospace; }

  /* TOP FLOATING ISLAND OMNI-DOCK */
  .island-dock-container {
    position: sticky;
    top: 18px;
    z-index: 100;
    width: 100%;
    max-width: 1160px;
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
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: rgba(245, 158, 11, 0.12);
    color: #d97706;
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

  .dock-btn:hover { color: var(--text-primary); }

  .dock-btn.active {
    background: #ffffff;
    color: var(--brand);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
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

  .dock-user-capsule {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 6px 4px 12px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(226, 232, 240, 0.6);
  }

  .dock-back-btn {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    transition: all 0.15s ease;
  }
  .dock-back-btn:hover {
    color: var(--brand);
    background: rgba(0, 118, 254, 0.08);
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

  /* MAIN HORIZON STAGE */
  .horizon-stage {
    position: relative;
    z-index: 10;
    max-width: 1160px;
    margin: 32px auto 80px;
    padding: 0 20px;
  }

  .tab-panel {
    display: none;
    animation: stageFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .tab-panel.active { display: block; }

  @keyframes stageFade {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* TELEMETRY HORIZON CARDS */
  .telemetry-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .telemetry-tile {
    background: #ffffff;
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
    padding: 18px 20px;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .telemetry-tile:hover {
    transform: translateY(-2px);
    border-color: var(--border-hover);
  }

  .telemetry-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  .telemetry-val {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .telemetry-sub {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  /* STUDIO CARDS & TABLES */
  .studio-card {
    background: var(--surface-card);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-card);
    padding: 28px;
    position: relative;
    margin-bottom: 24px;
  }

  .studio-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .studio-card-title h2 {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  .studio-card-title p {
    font-size: 13px;
    color: var(--text-secondary);
  }

  /* ACTION CONTROLS & BUTTONS */
  .btn-island-primary {
    background: var(--brand);
    color: #ffffff;
    border: none;
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
  .btn-island-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
  }

  .btn-island-secondary {
    background: #ffffff;
    color: var(--text-primary);
    border: 1px solid var(--border-glass);
    padding: 8px 16px;
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
    border-color: var(--border-hover);
    background: #f8fafc;
  }

  .btn-island-ghost {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .btn-island-ghost:hover {
    background: #f1f5f9;
    color: var(--text-primary);
  }

  .btn-island-warning {
    background: var(--warning-surface);
    color: #b45309;
    border: 1px solid rgba(245, 158, 11, 0.3);
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .btn-island-warning:hover {
    background: #fef3c7;
  }

  .btn-island-danger {
    background: var(--danger-surface);
    color: var(--danger);
    border: 1px solid rgba(239, 68, 68, 0.2);
    padding: 6px 12px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .btn-island-danger:hover {
    background: #fee2e2;
  }

  .btn-sm {
    padding: 5px 11px;
    font-size: 11px;
  }

  /* STATUS CAPSULES */
  .status-capsule {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border-radius: var(--radius-pill);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  .capsule-success { background: var(--success-surface); color: var(--success); }
  .capsule-warning { background: var(--warning-surface); color: var(--warning); }
  .capsule-danger  { background: var(--danger-surface); color: var(--danger); }
  .capsule-neutral { background: #f1f5f9; color: var(--text-secondary); }
  .capsule-current { background: #eff6ff; color: var(--brand); }
  .capsule-mfa     { background: #ecfdf5; color: #059669; }

  /* SEARCH & FILTER BAR */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .search-input-wrap {
    position: relative;
    flex: 1;
    min-width: 260px;
  }
  .search-input-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
  }
  .search-input {
    width: 100%;
    padding: 9px 14px 9px 40px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-glass);
    background: #ffffff;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s ease;
  }
  .search-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-glow);
  }

  .filter-select {
    padding: 8px 14px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--border-glass);
    background: #ffffff;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    outline: none;
    cursor: pointer;
    font-family: inherit;
  }

  /* DATA TABLES */
  .table-responsive {
    width: 100%;
    overflow-x: auto;
  }

  .admin-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    text-align: left;
  }

  .admin-table th {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
  }

  .admin-table td {
    padding: 12px 14px;
    font-size: 13px;
    border-bottom: 1px solid #f8fafc;
    vertical-align: middle;
  }

  .admin-table-row:hover td {
    background: #f8fafc;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .user-cell-meta {
    display: flex;
    flex-direction: column;
  }
  .user-cell-name {
    font-weight: 600;
    color: var(--text-primary);
  }
  .user-cell-email {
    font-size: 12px;
    color: var(--text-muted);
  }

  .code-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    background: #f1f5f9;
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .action-btn-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* CLIENT CARDS */
  .client-card {
    margin-bottom: 18px;
    padding: 22px 26px;
  }
  .client-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }
  .client-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .client-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(0, 118, 254, 0.08);
    color: var(--brand);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .client-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }
  .client-meta {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }
  .client-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .client-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
  }
  .client-field label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  .client-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .scope-chip {
    font-size: 11px;
    font-weight: 600;
    background: #f1f5f9;
    color: var(--text-secondary);
    padding: 3px 8px;
    border-radius: 6px;
  }
  .uri-chip {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    background: #f8fafc;
    border: 1px solid var(--border-glass);
    color: var(--text-primary);
    padding: 2px 8px;
    border-radius: 6px;
  }

  /* TENANT CARDS */
  .tenant-card {
    margin-bottom: 18px;
    padding: 22px 26px;
  }
  .tenant-card-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }
  .tenant-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(16, 185, 129, 0.08);
    color: var(--success);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .tenant-title-wrap { flex: 1; }
  .tenant-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
  .tenant-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
  .tenant-details {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    padding-top: 14px;
    border-top: 1px solid #f1f5f9;
  }
  .detail-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .detail-val {
    font-size: 13px;
    color: var(--text-primary);
  }

  /* NOTIFICATION BANNERS */
  .banner-notify {
    padding: 14px 18px;
    border-radius: var(--radius-lg);
    margin-bottom: 24px;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .banner-success { background: var(--success-surface); border: 1px solid rgba(16, 185, 129, 0.2); color: #065f46; }
  .banner-danger  { background: var(--danger-surface); border: 1px solid rgba(239, 68, 68, 0.2); color: #991b1b; }
  .banner-info    { background: #eff6ff; border: 1px solid rgba(0, 118, 254, 0.2); color: #1e40af; }
  .banner-close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; opacity: 0.6; }
  .banner-close-btn:hover { opacity: 1; }

  /* GLASSMORPHIC MODAL DIALOGS */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(9, 13, 22, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .modal-overlay.open { display: flex; }

  .modal-dialog {
    background: #ffffff;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-modal);
    border: 1px solid rgba(226, 232, 240, 0.9);
    width: 100%;
    max-width: 480px;
    padding: 28px;
    animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
  }

  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
  .modal-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px; }

  .modal-form-group {
    margin-bottom: 16px;
  }
  .modal-form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
  }
  .modal-input {
    width: 100%;
    padding: 9px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-glass);
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }
  .modal-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-glow);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 24px;
  }

  .secret-reveal-box {
    background: #f8fafc;
    border: 1px dashed var(--border-hover);
    padding: 12px;
    border-radius: var(--radius-md);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    word-break: break-all;
    user-select: all;
    margin: 12px 0;
    color: var(--brand);
    font-weight: 600;
  }

  /* Admin Mobile Hamburger Button */
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

  /* Admin Mobile Drawer Modal */
  .admin-mobile-nav-modal {
    position: fixed;
    inset: 0;
    z-index: 2000;
    pointer-events: none;
    visibility: hidden;
    transition: visibility 0.25s ease;
  }
  .admin-mobile-nav-modal.active {
    pointer-events: auto;
    visibility: visible;
  }
  .admin-mobile-nav-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 0.22s ease;
  }
  .admin-mobile-nav-modal.active .admin-mobile-nav-backdrop {
    opacity: 1;
  }
  .admin-mobile-nav-drawer {
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
  .admin-mobile-nav-modal.active .admin-mobile-nav-drawer {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  .admin-mobile-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.7);
    margin-bottom: 14px;
  }
  .admin-mobile-profile-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .admin-mobile-profile-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .admin-mobile-profile-name {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .admin-mobile-profile-badge {
    font-size: 11px;
    font-weight: 700;
    color: var(--brand);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .admin-mobile-drawer-close {
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
  .admin-mobile-drawer-close:hover {
    background: #ffffff;
    color: var(--text-primary);
  }
  .admin-mobile-drawer-section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 10px;
    padding-left: 4px;
  }
  .admin-mobile-nav-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .admin-mobile-nav-item {
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
  .admin-mobile-nav-item:hover {
    background: rgba(0, 118, 254, 0.05);
    color: var(--text-primary);
  }
  .admin-mobile-nav-item.active {
    background: rgba(0, 118, 254, 0.09);
    color: var(--brand);
    font-weight: 700;
  }
  .admin-mobile-nav-item .nav-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .admin-mobile-nav-item svg {
    color: var(--text-muted);
    transition: color 0.15s ease;
    flex-shrink: 0;
  }
  .admin-mobile-nav-item.active svg {
    color: var(--brand);
  }
  .admin-mobile-quick-links {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 5px;
  }
  .admin-mobile-sublink {
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
  .admin-mobile-sublink .nav-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .admin-mobile-sublink svg {
    color: var(--text-muted);
  }
  .admin-mobile-sublink:hover {
    background: rgba(15, 23, 42, 0.04);
    color: var(--text-primary);
  }
  .admin-mobile-drawer-footer {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(226, 232, 240, 0.7);
  }
  .admin-mobile-logout-btn {
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
  .admin-mobile-logout-btn:hover {
    background: #fee2e2;
    border-color: #dc2626;
  }

  /* Responsive Rules for Admin Studio */
  @media (max-width: 1024px) {
    .telemetry-row {
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
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
    .dock-back-btn {
      display: none;
    }
    .dock-signout-btn {
      display: none;
    }
    .dock-user-capsule {
      padding: 0;
      gap: 6px;
      background: transparent;
      border: none;
    }
    .horizon-stage {
      margin: 16px auto 60px;
      padding: 0 12px;
    }
    .studio-card {
      padding: 18px 14px;
      border-radius: var(--radius-lg);
      margin-bottom: 18px;
    }
    .studio-card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .studio-card-header button,
    .studio-card-header a {
      width: 100%;
      text-align: center;
      justify-content: center;
    }
    .telemetry-row {
      grid-template-columns: 1fr;
      gap: 10px;
      margin-bottom: 18px;
    }
    .filter-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    .search-input-wrap {
      width: 100%;
      min-width: unset;
    }
    .table-responsive {
      margin: 0 -14px;
      padding: 0 14px;
      width: calc(100% + 28px);
    }
    .admin-table {
      min-width: 620px;
    }
    .client-body {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .client-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .client-header-right {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
    .tenant-details {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .tenant-card {
      padding: 16px 14px;
    }
    .island-modal-card {
      padding: 22px 18px;
      width: 95%;
      max-width: 95vw;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-actions {
      flex-direction: column-reverse;
      gap: 8px;
    }
    .modal-actions button {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .dock-brand-text {
      display: none;
    }
    .dock-brand {
      gap: 0;
    }
    .banner-notify {
      padding: 12px 14px;
      font-size: 13px;
    }
  }
</style>
</head>
<body>

<!-- TOP FLOATING ISLAND OMNI-DOCK -->
<div class="island-dock-container">
  <div class="island-dock">
    <div style="display:flex; align-items:center; gap:10px;">
      <a href="/admin" class="dock-brand">
        <img src="/logo.png" alt="Playsole One" class="dock-brand-logo">
        <span class="dock-brand-text">Playsole One <span class="dock-brand-badge">ADMIN STUDIO</span></span>
      </a>
      <span class="dock-mobile-active-chip" id="adminActiveTabChip">${initialAdminTabLabel}</span>
    </div>

    <!-- Center Segmented Switcher -->
    <div class="dock-nav-segment">
      <button type="button" class="dock-btn ${initialTab === 'users' ? 'active' : ''}" data-tab="users" onclick="switchTab('users')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        Users
        <span class="dock-badge-num">${data.metrics.totalUsers}</span>
      </button>
      <button type="button" class="dock-btn ${initialTab === 'clients' ? 'active' : ''}" data-tab="clients" onclick="switchTab('clients')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        OAuth Clients
        <span class="dock-badge-num">${data.metrics.totalClients}</span>
      </button>
      <button type="button" class="dock-btn ${initialTab === 'tenants' ? 'active' : ''}" data-tab="tenants" onclick="switchTab('tenants')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Tenants
        <span class="dock-badge-num">${data.metrics.totalTenants}</span>
      </button>
      <button type="button" class="dock-btn ${initialTab === 'audit-logs' ? 'active' : ''}" data-tab="audit-logs" onclick="switchTab('audit-logs')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Audit Logs
      </button>
    </div>

    <!-- Right Controls -->
    <div style="display:flex; align-items:center; gap:8px;">
      <div class="dock-user-capsule">
        <a href="/dashboard" class="dock-back-btn">&larr; User Dashboard</a>
        ${renderAvatar(data.currentUser?.displayName || (data as any).currentAdmin?.email || 'Admin', data.currentUser?.email || (data as any).currentAdmin?.email || '', data.currentUser?.avatarUrl, 32)}
        <a href="/logout" class="dock-signout-btn" title="Sign out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </a>
      </div>
      <button type="button" class="dock-mobile-hamburger" id="adminDashboardHamburger" onclick="toggleAdminMobileDrawer()" aria-label="Toggle admin navigation menu" aria-expanded="false">
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      </button>
    </div>
  </div>
</div>

<!-- Admin Mobile Navigation Drawer Modal -->
<div class="admin-mobile-nav-modal" id="adminMobileNavModal" aria-hidden="true">
  <div class="admin-mobile-nav-backdrop" onclick="toggleAdminMobileDrawer(false)"></div>
  <div class="admin-mobile-nav-drawer">
    <div class="admin-mobile-drawer-header">
      <div class="admin-mobile-profile-preview">
        ${renderAvatar(data.currentUser.displayName, data.currentUser.email, data.currentUser.avatarUrl, 38)}
        <div class="admin-mobile-profile-meta">
          <div class="admin-mobile-profile-name">${escapeHtml(data.currentUser.displayName)}</div>
          <div class="admin-mobile-profile-badge">Admin Studio</div>
        </div>
      </div>
      <button type="button" class="admin-mobile-drawer-close" onclick="toggleAdminMobileDrawer(false)" aria-label="Close menu">&times;</button>
    </div>

    <div class="admin-mobile-drawer-section-label">Studio Navigation</div>
    <nav class="admin-mobile-nav-list" role="tablist">
      <button type="button" class="admin-mobile-nav-item ${initialTab === 'users' ? 'active' : ''}" data-tab="users" onclick="mobileSwitchAdminTab('users')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Users</span>
        </div>
        <span class="dock-badge-num">${data.metrics.totalUsers}</span>
      </button>

      <button type="button" class="admin-mobile-nav-item ${initialTab === 'clients' ? 'active' : ''}" data-tab="clients" onclick="mobileSwitchAdminTab('clients')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>OAuth Clients</span>
        </div>
        <span class="dock-badge-num">${data.metrics.totalClients}</span>
      </button>

      <button type="button" class="admin-mobile-nav-item ${initialTab === 'tenants' ? 'active' : ''}" data-tab="tenants" onclick="mobileSwitchAdminTab('tenants')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Tenants</span>
        </div>
        <span class="dock-badge-num">${data.metrics.totalTenants}</span>
      </button>

      <button type="button" class="admin-mobile-nav-item ${initialTab === 'audit-logs' ? 'active' : ''}" data-tab="audit-logs" onclick="mobileSwitchAdminTab('audit-logs')">
        <div class="nav-item-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          <span>Audit Logs</span>
        </div>
        <span class="dock-badge-num">${data.metrics.totalLogs}</span>
      </button>
    </nav>

    <div class="admin-mobile-drawer-section-label">External Portals</div>
    <div class="admin-mobile-quick-links">
      <a href="/dashboard" class="admin-mobile-sublink">
        <div class="nav-item-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>User Dashboard</span>
        </div>
        <span class="nav-item-indicator">&rarr;</span>
      </a>
      <a href="/status" class="admin-mobile-sublink">
        <div class="nav-item-left">
          <span class="dock-pulse-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981;"></span>
          <span>System Status</span>
        </div>
        <span style="font-size:11.5px;color:#047857;font-weight:600;">Monitor</span>
      </a>
    </div>

    <div class="admin-mobile-drawer-footer">
      <a href="/logout" class="admin-mobile-logout-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Sign Out of Admin</span>
      </a>
    </div>
  </div>
</div>

<main class="horizon-stage">

  <!-- FEEDBACK BANNERS -->
  ${opts.message ? `
    <div class="banner-notify banner-success">
      <span>${escapeHtml(opts.message)}</span>
      <button type="button" class="banner-close-btn" onclick="dismissBanner(this.closest('.banner-notify'))">&times;</button>
    </div>` : ''}

  ${opts.error ? `
    <div class="banner-notify banner-danger">
      <span>${escapeHtml(opts.error)}</span>
      <button type="button" class="banner-close-btn" onclick="dismissBanner(this.closest('.banner-notify'))">&times;</button>
    </div>` : ''}

  ${opts.rotatedSecret ? `
    <div class="banner-notify banner-info">
      <div>
        <strong>Secret Rotated for ${escapeHtml(opts.rotatedSecret.clientId)}:</strong>
        <p>Make sure to copy this secret now. It will not be shown again:</p>
        <div class="secret-reveal-box">${escapeHtml(opts.rotatedSecret.secret)}</div>
      </div>
      <button type="button" class="banner-close-btn" onclick="dismissBanner(this.closest('.banner-notify'))">&times;</button>
    </div>` : ''}

  <!-- TELEMETRY COUNTERS -->
  <div class="telemetry-row">
    <div class="telemetry-tile">
      <div class="telemetry-label">Total Users</div>
      <div class="telemetry-val">${data.metrics.totalUsers}</div>
      <div class="telemetry-sub">${data.metrics.activeUsers} active &middot; ${data.metrics.suspendedUsers} suspended</div>
    </div>
    <div class="telemetry-tile">
      <div class="telemetry-label">OAuth Applications</div>
      <div class="telemetry-val">${data.metrics.totalClients}</div>
      <div class="telemetry-sub">Registered relying parties</div>
    </div>
    <div class="telemetry-tile">
      <div class="telemetry-label">Active Tenants</div>
      <div class="telemetry-val">${data.metrics.totalTenants}</div>
      <div class="telemetry-sub">Multi-tenant partitions</div>
    </div>
    <div class="telemetry-tile">
      <div class="telemetry-label">Security Audit Logs</div>
      <div class="telemetry-val">${data.metrics.totalLogs}</div>
      <div class="telemetry-sub">Append-only audit trail</div>
    </div>
  </div>

  <!-- TAB 1: USERS (Item 39) -->
  <div id="tab-users" class="tab-panel ${initialTab === 'users' ? 'active' : ''}">
    <div class="studio-card">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>User Accounts</h2>
          <p>Search, inspect profile records, and manage access suspension or deletion.</p>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="userSearchInput" class="search-input" placeholder="Search by name, email, or user ID..." oninput="filterUsers()">
        </div>
        <select id="userStatusFilter" class="filter-select" onchange="filterUsers()">
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
        </select>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>User ID</th>
              <th>Status</th>
              <th>Email</th>
              <th>2FA</th>
              <th>Registered</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="userTableBody">
            ${userRows || '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">No users found in database.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 2: OAUTH CLIENTS (Item 40) -->
  <div id="tab-clients" class="tab-panel ${initialTab === 'clients' ? 'active' : ''}">
    <div class="studio-card">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>OAuth Clients &amp; Applications</h2>
          <p>Manage registered applications, configure redirect URIs, and rotate credentials.</p>
        </div>
        <button type="button" class="btn-island-primary" onclick="openCreateClientModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Register Client
        </button>
      </div>

      <div class="clients-list">
        ${clientRows || '<p style="text-align:center;padding:40px;color:var(--text-muted)">No OAuth clients configured.</p>'}
      </div>
    </div>
  </div>

  <!-- TAB 3: TENANTS (Item 41) -->
  <div id="tab-tenants" class="tab-panel ${initialTab === 'tenants' ? 'active' : ''}">
    <div class="studio-card">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>Multi-Tenant Management</h2>
          <p>Configure isolated tenant domains, configurations, and identity scopes.</p>
        </div>
        <button type="button" class="btn-island-primary" onclick="openCreateTenantModal()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Tenant
        </button>
      </div>

      <div class="tenants-list">
        ${tenantRows}
      </div>
    </div>
  </div>

  <!-- TAB 4: AUDIT LOGS (Item 42) -->
  <div id="tab-audit-logs" class="tab-panel ${initialTab === 'audit-logs' ? 'active' : ''}">
    <div class="studio-card">
      <div class="studio-card-header">
        <div class="studio-card-title">
          <h2>Security Audit Trail</h2>
          <p>Immutable, append-only security logs of sign-ins, credentials updates, and administrative actions.</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <a href="/admin/audit-logs/export?format=json" class="btn-island-secondary" download="audit-logs.json">Export JSON</a>
          <a href="/admin/audit-logs/export?format=csv" class="btn-island-secondary" download="audit-logs.csv">Export CSV</a>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="auditSearchInput" class="search-input" placeholder="Filter by event type (e.g. login, mfa, admin)..." oninput="filterAudit()">
        </div>
      </div>

      <div class="table-responsive">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event</th>
              <th>Actor ID</th>
              <th>Client</th>
              <th>IP Address</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody id="auditTableBody">
            ${auditRows || '<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)">No audit events recorded yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  </div>

</main>

<!-- CREATE CLIENT MODAL -->
<div id="create-client-modal" class="modal-overlay">
  <div class="modal-dialog">
    <h3 class="modal-title">Register OAuth Client</h3>
    <p class="modal-desc">Create a new relying party client application in the identity system.</p>
    <form method="POST" action="/admin/clients">
      <div class="modal-form-group">
        <label for="newClientId">Client Identifier (ID)</label>
        <input type="text" id="newClientId" name="clientId" class="modal-input" placeholder="e.g. playsole-app-web" required>
      </div>

      <div class="modal-form-group">
        <label for="newRedirectUris">Redirect URIs (comma-separated)</label>
        <input type="text" id="newRedirectUris" name="redirectUris" class="modal-input" placeholder="https://app.example.com/callback, http://localhost:3000/callback" required>
      </div>
      <div class="modal-form-group">
        <label for="newScopes">Allowed Scopes (comma-separated)</label>
        <input type="text" id="newScopes" name="scopes" class="modal-input" value="openid, profile, email" required>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-island-secondary" onclick="closeModal('create-client-modal')">Cancel</button>
        <button type="submit" class="btn-island-primary">Create Client</button>
      </div>
    </form>
  </div>
</div>

<!-- CREATE TENANT MODAL -->
<div id="create-tenant-modal" class="modal-overlay">
  <div class="modal-dialog">
    <h3 class="modal-title">Create New Tenant</h3>
    <p class="modal-desc">Provision an isolated organization or ecosystem tenant.</p>
    <form method="POST" action="/admin/tenants">
      <div class="modal-form-group">
        <label for="tenantName">Tenant Display Name</label>
        <input type="text" id="tenantName" name="name" class="modal-input" placeholder="e.g. Playsole Games" required>
      </div>
      <div class="modal-form-group">
        <label for="tenantSlug">Slug (URL identifier)</label>
        <input type="text" id="tenantSlug" name="slug" class="modal-input" placeholder="e.g. games" required pattern="[a-z0-9-]+">
      </div>
      <div class="modal-form-group">
        <label for="tenantDomain">Custom Domain (Optional)</label>
        <input type="text" id="tenantDomain" name="domain" class="modal-input" placeholder="e.g. games.playsole.xyz">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-island-secondary" onclick="closeModal('create-tenant-modal')">Cancel</button>
        <button type="submit" class="btn-island-primary">Create Tenant</button>
      </div>
    </form>
  </div>
</div>

<!-- CONFIRMATION ACTION MODAL -->
<div id="confirm-modal" class="modal-overlay">
  <div class="modal-dialog">
    <h3 id="confirm-title" class="modal-title">Confirm Action</h3>
    <p id="confirm-message" class="modal-desc">Are you sure you want to proceed?</p>
    <div class="modal-actions">
      <button type="button" class="btn-island-secondary" onclick="resolveConfirm(false)">Cancel</button>
      <button type="button" id="confirm-btn" class="btn-island-danger" onclick="resolveConfirm(true)">Confirm</button>
    </div>
  </div>
</div>

<script>
  var adminTabTitleMap = {
    users: 'Users',
    clients: 'OAuth Clients',
    tenants: 'Tenants',
    'audit-logs': 'Audit Logs'
  };

  function switchTab(tabId) {
    var validTabs = ['users', 'clients', 'tenants', 'audit-logs'];
    if (validTabs.indexOf(tabId) === -1) tabId = 'users';

    document.querySelectorAll('.tab-panel').forEach(function(el) { el.classList.remove('active'); });
    var target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.dock-btn').forEach(function(el) {
      if (el.getAttribute('data-tab') === tabId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    document.querySelectorAll('.admin-mobile-nav-item').forEach(function(el) {
      if (el.getAttribute('data-tab') === tabId) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    var chip = document.getElementById('adminActiveTabChip');
    if (chip && adminTabTitleMap[tabId]) {
      chip.textContent = adminTabTitleMap[tabId];
    }

    if (history.replaceState) {
      history.replaceState(null, '', '/admin?tab=' + tabId);
    }
  }

  function mobileSwitchAdminTab(tabId) {
    switchTab(tabId);
    toggleAdminMobileDrawer(false);
  }

  function toggleAdminMobileDrawer(open) {
    var modal = document.getElementById('adminMobileNavModal');
    var btn = document.getElementById('adminDashboardHamburger');
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
      toggleAdminMobileDrawer(false);
    }
  });

  function dismissBanner(banner) {
    if (!banner) return;
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(-6px)';
    banner.style.maxHeight = '0';
    banner.style.marginTop = '0';
    banner.style.marginBottom = '0';
    banner.style.padding = '0';
    setTimeout(function() {
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    }, 450);
  }

  // Auto-dismiss notification banners after 5 seconds
  window.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    var qTab = params.get('tab');
    if (qTab) switchTab(qTab);

    var banners = document.querySelectorAll('.banner-notify');
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

  // Filter users table
  function filterUsers() {
    var q = (document.getElementById('userSearchInput').value || '').toLowerCase().trim();
    var status = document.getElementById('userStatusFilter').value;
    var rows = document.querySelectorAll('.admin-table-row');

    rows.forEach(function(row) {
      var name = row.getAttribute('data-name') || '';
      var email = row.getAttribute('data-email') || '';
      var id = row.getAttribute('data-user-id') || '';
      var rowStatus = row.getAttribute('data-status') || '';

      var matchesQuery = !q || name.indexOf(q) !== -1 || email.indexOf(q) !== -1 || id.indexOf(q) !== -1;
      var matchesStatus = status === 'all' || rowStatus === status;

      row.style.display = (matchesQuery && matchesStatus) ? '' : 'none';
    });
  }

  // Filter audit table
  function filterAudit() {
    var q = (document.getElementById('auditSearchInput').value || '').toLowerCase().trim();
    var rows = document.querySelectorAll('.audit-row');

    rows.forEach(function(row) {
      var eventType = (row.getAttribute('data-event') || '').toLowerCase();
      row.style.display = (!q || eventType.indexOf(q) !== -1) ? '' : 'none';
    });
  }

  function openCreateClientModal() {
    document.getElementById('create-client-modal').classList.add('open');
  }

  function openCreateTenantModal() {
    document.getElementById('create-tenant-modal').classList.add('open');
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  // Confirmation Modal
  var _confirmResolve = null;
  function showConfirm(msg) {
    document.getElementById('confirm-message').textContent = msg;
    document.getElementById('confirm-modal').classList.add('open');
    return new Promise(function(resolve) { _confirmResolve = resolve; });
  }

  function resolveConfirm(val) {
    document.getElementById('confirm-modal').classList.remove('open');
    if (_confirmResolve) {
      _confirmResolve(val);
      _confirmResolve = null;
    }
  }

  document.querySelectorAll('form[data-confirm]').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var msg = form.getAttribute('data-confirm');
      showConfirm(msg).then(function(ok) {
        if (ok) form.submit();
      });
    });
  });
</script>

</body>
</html>`);
}

export function adminAccessDeniedPage(title: string, message: string, userEmail?: string): string {
  return injectTheme(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} — Playsole One</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --brand: #0076FE;
      --brand-hover: #0060d0;
      --brand-glow: rgba(0, 118, 254, 0.2);
      --bg-canvas: #f8fafc;
      --surface-island: rgba(255, 255, 255, 0.88);
      --surface-glass: rgba(255, 255, 255, 0.70);
      --surface-card: #ffffff;
      --border-glass: rgba(226, 232, 240, 0.85);
      --border-hover: #cbd5e1;
      --text-primary: #090d16;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --warning: #f59e0b;
      --warning-surface: #fffbeb;
      --danger: #ef4444;
      --danger-surface: #fef2f2;
      --radius-pill: 9999px;
      --radius-xl: 20px;
      --radius-lg: 14px;
      --shadow-island: 0 12px 36px -4px rgba(9, 13, 22, 0.08), 0 4px 12px -2px rgba(9, 13, 22, 0.04);
      --shadow-card: 0 1px 3px rgba(9, 13, 22, 0.04), 0 8px 24px -4px rgba(9, 13, 22, 0.05);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg-canvas);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      position: relative;
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: -20%;
      left: 50%;
      transform: translateX(-50%);
      width: 700px;
      height: 400px;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(248, 250, 252, 0) 70%);
      z-index: 0;
      pointer-events: none;
    }
    .denied-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 480px;
    }
    .denied-card {
      background: var(--surface-island);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-island);
      padding: 40px 32px;
      text-align: center;
    }
    .denied-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--danger-surface);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: var(--danger);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    .denied-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--danger);
      background: var(--danger-surface);
      border: 1px solid rgba(239, 68, 68, 0.2);
      padding: 3px 10px;
      border-radius: var(--radius-pill);
      margin-bottom: 12px;
    }
    .denied-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin-bottom: 10px;
    }
    .denied-desc {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }
    .account-capsule {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5f9;
      border: 1px solid var(--border-glass);
      padding: 6px 14px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 24px;
    }
    .account-capsule code {
      color: var(--text-primary);
      font-weight: 600;
    }
    .denied-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn-island-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 20px;
      background: var(--brand);
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      border-radius: var(--radius-pill);
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 14px var(--brand-glow);
    }
    .btn-island-primary:hover {
      background: var(--brand-hover);
      transform: translateY(-1px);
    }
    .btn-island-ghost {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 11px 20px;
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--radius-pill);
      text-decoration: none;
      border: 1px solid transparent;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .btn-island-ghost:hover {
      color: var(--text-primary);
      background: rgba(241, 245, 249, 0.8);
      border-color: var(--border-glass);
    }

    /* ── Apple-Grade Admin Secret Login Modal (design_style.md) ── */
    .admin-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(9, 13, 22, 0.52);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      opacity: 0;
      transition: opacity 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .admin-modal-overlay.active {
      opacity: 1;
    }
    .admin-modal-box {
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-xl);
      box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.2), 0 4px 12px 0 rgba(15, 23, 42, 0.06);
      width: 100%;
      max-width: 420px;
      padding: 32px 28px 28px;
      position: relative;
      transform: scale(0.94) translateY(8px);
      opacity: 0;
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.24s ease;
    }
    .admin-modal-overlay.active .admin-modal-box {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    .admin-modal-box.shake {
      animation: adminShake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    @keyframes adminShake {
      10%, 90% { transform: translate3d(-3px, 0, 0); }
      20%, 80% { transform: translate3d(5px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
      40%, 60% { transform: translate3d(5px, 0, 0); }
    }
    .modal-close-btn {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-glass);
      background: #f8fafc;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .modal-close-btn:hover {
      background: #f1f5f9;
      color: var(--text-primary);
      transform: scale(1.05);
    }
    .modal-icon-badge {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(0, 118, 254, 0.08);
      border: 1px solid rgba(0, 118, 254, 0.22);
      color: var(--brand);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .modal-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin-bottom: 6px;
    }
    .modal-subtitle {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .modal-error-banner {
      display: none;
      align-items: center;
      gap: 8px;
      background: var(--danger-surface);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--danger);
      font-size: 12.5px;
      font-weight: 500;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      text-align: left;
      line-height: 1.4;
    }
    .modal-field {
      margin-bottom: 16px;
      text-align: left;
    }
    .modal-label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
    }
    .modal-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .modal-input-icon {
      position: absolute;
      left: 14px;
      color: var(--text-muted);
      pointer-events: none;
      display: flex;
      align-items: center;
    }
    .modal-input {
      width: 100%;
      height: 44px;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: var(--text-primary);
      font-size: 14px;
      font-family: inherit;
      padding: 0 40px 0 40px;
      outline: none;
      transition: all 0.18s ease;
    }
    .modal-input:focus {
      border-color: var(--brand);
      box-shadow: 0 0 0 3px var(--brand-glow);
    }
    .modal-pw-toggle {
      position: absolute;
      right: 12px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 6px;
    }
    .modal-pw-toggle:hover {
      color: var(--text-primary);
    }
    .modal-submit-btn {
      width: 100%;
      height: 44px;
      margin-top: 8px;
      background: var(--brand);
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      border: none;
      border-radius: var(--radius-pill);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px var(--brand-glow);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-submit-btn:hover {
      background: var(--brand-hover);
      transform: translateY(-1px);
    }
    .modal-submit-btn:disabled {
      opacity: 0.75;
      cursor: not-allowed;
      transform: none;
    }
    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: modalSpin 0.6s linear infinite;
    }
    @keyframes modalSpin {
      to { transform: rotate(360deg); }
    }
    .hotkey-hint {
      margin-top: 14px;
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .hotkey-hint kbd {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 10.5px;
      font-family: inherit;
      font-weight: 600;
      color: var(--text-secondary);
    }

    @media (max-width: 480px) {
      .denied-card {
        padding: 28px 20px;
        margin: 12px;
      }
      .denied-title {
        font-size: 22px;
      }
      .denied-actions {
        flex-direction: column;
        gap: 10px;
      }
      .denied-actions a,
      .denied-actions button {
        width: 100%;
        justify-content: center;
      }
      .admin-modal-box {
        padding: 24px 18px;
        margin: 12px;
        max-width: calc(100vw - 24px);
      }
    }
  </style>
</head>
<body>
  <div class="denied-container">
    <div class="denied-card">
      <div class="denied-icon-wrap">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div>
        <span class="denied-badge">Administrative Boundary</span>
      </div>
      <h1 class="denied-title">${escapeHtml(title)}</h1>
      <p class="denied-desc">${message}</p>
      ${userEmail ? `
        <div class="account-capsule">
          <span>Signed in as:</span>
          <code>${escapeHtml(userEmail)}</code>
        </div>
      ` : ''}
      <div class="denied-actions">
        <a href="/dashboard" class="btn-island-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span>Return to Dashboard</span>
        </a>
        <button type="button" class="btn-island-ghost" id="openAdminModalBtn">
          <span>Sign in with authorized account &rarr;</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ── Apple-Grade Admin Secret Login Modal ── -->
  <div class="admin-modal-overlay" id="adminModalOverlay" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
    <div class="admin-modal-box" id="adminModalBox">
      <button type="button" class="modal-close-btn" id="closeAdminModalBtn" aria-label="Close modal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div style="text-align: center;">
        <div class="modal-icon-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h2 class="modal-title" id="adminModalTitle">Admin Studio Authentication</h2>
        <p class="modal-subtitle">Enter credentials for an account authorized in the administrator allowlist.</p>
      </div>

      <div class="modal-error-banner" id="adminModalError" role="alert">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span id="adminModalErrorText"></span>
      </div>

      <form id="adminModalForm" method="POST" action="/admin/login">
        <div class="modal-field">
          <label class="modal-label" for="adminEmailInput">Administrator Email</label>
          <div class="modal-input-wrap">
            <span class="modal-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </span>
            <input type="email" id="adminEmailInput" name="email" class="modal-input" placeholder="admin@domain.com" required autocomplete="email">
          </div>
        </div>

        <div class="modal-field">
          <label class="modal-label" for="adminPasswordInput">Password</label>
          <div class="modal-input-wrap">
            <span class="modal-input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input type="password" id="adminPasswordInput" name="password" class="modal-input" placeholder="••••••••••••" required autocomplete="current-password">
            <button type="button" class="modal-pw-toggle" id="toggleAdminPwBtn" aria-label="Toggle password visibility">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <button type="submit" class="modal-submit-btn" id="adminSubmitBtn">
          <span>Authenticate &amp; Enter</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>

        <div style="text-align: center;">
          <p class="hotkey-hint">Press <kbd>Esc</kbd> anytime to dismiss.</p>
        </div>
      </form>
    </div>
  </div>

  <script>
    (function() {
      var overlay = document.getElementById('adminModalOverlay');
      var modalBox = document.getElementById('adminModalBox');
      var emailInput = document.getElementById('adminEmailInput');
      var passwordInput = document.getElementById('adminPasswordInput');
      var errorBanner = document.getElementById('adminModalError');
      var errorText = document.getElementById('adminModalErrorText');
      var submitBtn = document.getElementById('adminSubmitBtn');
      var form = document.getElementById('adminModalForm');
      var closeBtn = document.getElementById('closeAdminModalBtn');
      var openBtn = document.getElementById('openAdminModalBtn');
      var togglePwBtn = document.getElementById('toggleAdminPwBtn');

      var keyBuffer = '';
      var timer = null;
      var SECRET = 'admin';

      function openModal() {
        if (!overlay) return;
        overlay.style.display = 'flex';
        void overlay.offsetHeight;
        overlay.classList.add('active');
        setTimeout(function() {
          if (emailInput) {
            emailInput.focus();
            emailInput.select();
          }
        }, 60);
      }

      function closeModal() {
        if (!overlay) return;
        overlay.classList.remove('active');
        setTimeout(function() {
          overlay.style.display = 'none';
          if (errorBanner) {
            errorBanner.style.display = 'none';
            if (errorText) errorText.textContent = '';
          }
        }, 220);
      }

      // Keystroke listener: typing 'admin' in any case on the page opens the admin login
      window.addEventListener('keydown', function(e) {
        var active = document.activeElement;
        var isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

        if (e.key === 'Escape') {
          closeModal();
          return;
        }

        // Only detect keystrokes when not focused on an input element
        if (isInput) return;

        // Only track printable single characters
        if (e.key.length !== 1) return;

        keyBuffer += e.key.toLowerCase();
        if (keyBuffer.length > SECRET.length) {
          keyBuffer = keyBuffer.slice(-SECRET.length);
        }

        if (keyBuffer === SECRET) {
          keyBuffer = '';
          openModal();
        }

        clearTimeout(timer);
        timer = setTimeout(function() { keyBuffer = ''; }, 2500);
      });

      if (openBtn) openBtn.addEventListener('click', openModal);
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      if (overlay) {
        overlay.addEventListener('click', function(e) {
          if (e.target === overlay) closeModal();
        });
      }

      if (togglePwBtn && passwordInput) {
        togglePwBtn.addEventListener('click', function() {
          var isPw = passwordInput.type === 'password';
          passwordInput.type = isPw ? 'text' : 'password';
        });
      }

      if (form) {
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          var email = emailInput ? emailInput.value.trim() : '';
          var password = passwordInput ? passwordInput.value : '';

          if (!email || !password) return;

          if (errorBanner) {
            errorBanner.style.display = 'none';
            if (errorText) errorText.textContent = '';
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-sm"></span> Authenticating...';
          }

          try {
            var res = await fetch('/admin/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ email: email, password: password })
            });

            var data = await res.json().catch(function() { return {}; });

            if (res.ok && data.ok) {
              if (submitBtn) {
                submitBtn.innerHTML = '&#10003; Authorized. Entering Studio...';
                submitBtn.style.background = '#10b981';
              }
              var target = data.redirect || '/admin';
              window.location.replace(target);
              setTimeout(function() {
                window.location.reload();
              }, 100);
              return;
            }

            var message = data.message || data.error_description || 'Authentication failed. Please verify credentials.';
            if (errorBanner && errorText) {
              errorText.textContent = message;
              errorBanner.style.display = 'flex';
            }

            if (modalBox) {
              modalBox.classList.remove('shake');
              void modalBox.offsetWidth;
              modalBox.classList.add('shake');
            }

            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>Authenticate &amp; Enter</span>';
            }
            if (passwordInput) {
              passwordInput.value = '';
              passwordInput.focus();
            }
          } catch (err) {
            if (errorBanner && errorText) {
              errorText.textContent = 'Network or connection error. Please try again.';
              errorBanner.style.display = 'flex';
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>Authenticate &amp; Enter</span>';
            }
          }
        });
      }
    })();
  </script>
</body>
</html>`);
}


