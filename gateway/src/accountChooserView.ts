export interface AccountChooserUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  isActive?: boolean;
}

export interface AccountChooserOptions {
  activeUser?: AccountChooserUser | null;
  accounts?: AccountChooserUser[];
  clientName?: string;
  clientId?: string;
  returnTo?: string;
  handoffCode?: string;
  message?: string;
  error?: string;
}

export function renderAccountChooserView(options: AccountChooserOptions): string {
  const {
    activeUser,
    accounts = [],
    clientName = 'Playsole Services',
    returnTo = '/dashboard',
    handoffCode,
    message,
    error,
  } = options;

  const displayAccounts = accounts.length > 0
    ? accounts
    : (activeUser ? [activeUser] : []);

  const primaryUser = activeUser || displayAccounts[0];

  const initial = (primaryUser?.displayName || primaryUser?.email || 'U').trim().charAt(0).toUpperCase();
  const avatarBg = primaryUser?.avatarUrl?.startsWith('#') ? primaryUser.avatarUrl : '#0076FE';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Choose an account — Playsole One</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-base: #0c0d0e;
      --bg-surface: rgba(255, 255, 255, 0.035);
      --bg-surface-elevated: rgba(255, 255, 255, 0.06);
      --bg-surface-hover: rgba(255, 255, 255, 0.09);
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.16);
      --text-primary: #f5f5f7;
      --text-secondary: #a1a1a6;
      --text-muted: #6e6e73;
      --accent-blue: #0a84ff;
      --accent-emerald: #30d158;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 22px;
      --radius-full: 9999px;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-sans);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 24px 16px;
    }

    /* Floating Omni-Dock Header */
    .dock-container {
      width: 100%;
      max-width: 540px;
      display: flex;
      justify-content: center;
      margin-bottom: 24px;
    }

    .omni-dock {
      background: rgba(18, 19, 21, 0.75);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      box-shadow: 0 16px 32px rgba(0,0,0,0.4);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 14px;
    }

    .brand-logo {
      width: 24px;
      height: 24px;
      border-radius: 6px;
    }

    .status-capsule {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(48, 209, 88, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(48, 209, 88, 0.25);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 6px var(--accent-emerald);
    }

    /* Studio Card */
    .chooser-card {
      background: var(--bg-surface);
      backdrop-filter: blur(30px) saturate(190%);
      -webkit-backdrop-filter: blur(30px) saturate(190%);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 36px 32px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset;
      text-align: center;
    }

    .app-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent-blue);
      background: rgba(10, 132, 255, 0.1);
      border: 1px solid rgba(10, 132, 255, 0.2);
      padding: 5px 12px;
      border-radius: var(--radius-full);
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }

    .card-subtitle {
      font-size: 14.5px;
      color: var(--text-secondary);
      margin-bottom: 28px;
    }

    /* Account List / Bento */
    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .account-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: left;
    }

    .account-item:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }

    .account-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 17px;
      color: #ffffff;
      flex-shrink: 0;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .account-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .account-info {
      flex: 1;
      overflow: hidden;
    }

    .account-name {
      font-size: 14.5px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .account-email {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .active-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: rgba(48, 209, 88, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(48, 209, 88, 0.3);
    }

    /* Continue Button */
    .btn-continue {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 13px 20px;
      background: #ffffff;
      color: #000000;
      border: none;
      border-radius: var(--radius-full);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
      margin-bottom: 20px;
    }

    .btn-continue:hover {
      background: #e5e5ea;
      transform: translateY(-1px);
    }

    /* Secondary Options */
    .divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 20px 0;
    }

    .action-links {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .action-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.15s ease;
      background: transparent;
      border: 1px solid transparent;
    }

    .action-row:hover {
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      border-color: var(--border-subtle);
    }

    .action-icon {
      width: 18px;
      height: 18px;
      color: var(--text-muted);
    }

    .alert {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      font-size: 13.5px;
      margin-bottom: 18px;
      text-align: left;
    }
    .alert-error { background: rgba(255, 69, 58, 0.12); color: #ff453a; border: 1px solid rgba(255, 69, 58, 0.25); }
    .alert-info { background: rgba(10, 132, 255, 0.12); color: var(--accent-blue); border: 1px solid rgba(10, 132, 255, 0.25); }

    /* Cross-Device Handoff Drawer */
    .handoff-box {
      margin-top: 18px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-md);
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .footer-text {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 32px;
    }
  </style>
</head>
<body>

  <!-- Floating Omni-Dock -->
  <div class="dock-container">
    <div class="omni-dock">
      <a href="/profile" class="brand-section">
        <img src="/logo.png" alt="Playsole" class="brand-logo" onerror="this.style.display='none'">
        <span>Playsole One SSO</span>
      </a>
      <div class="status-capsule">
        <span class="status-dot"></span>
        <span>Single Identity</span>
      </div>
    </div>
  </div>

  <!-- Main Chooser Card -->
  <div class="chooser-card">
    <div class="app-badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      <span>${escapeHtml(clientName)}</span>
    </div>

    <h1 class="card-title">Choose an account</h1>
    <p class="card-subtitle">to continue to ${escapeHtml(clientName)}</p>

    ${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : ''}
    ${message ? `<div class="alert alert-info">${escapeHtml(message)}</div>` : ''}

    ${primaryUser ? `
      <!-- Primary Continue Button -->
      <a href="${escapeHtml(returnTo)}" class="btn-continue">
        <span>Continue as ${escapeHtml(primaryUser.displayName || primaryUser.email.split('@')[0])}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>

      <!-- Accounts Horizon -->
      <div class="accounts-list">
        ${displayAccounts.map((acc) => {
          const accInitial = (acc.displayName || acc.email || 'U').trim().charAt(0).toUpperCase();
          const isAct = acc.isActive !== false;
          return `
            <a href="/sso/switch?user_id=${encodeURIComponent(acc.id)}&return_to=${encodeURIComponent(returnTo)}" class="account-item">
              <div class="account-avatar" style="background-color: ${acc.avatarUrl?.startsWith('#') ? acc.avatarUrl : '#0076FE'};">
                ${acc.avatarUrl && acc.avatarUrl.startsWith('http') ? `<img src="${escapeHtml(acc.avatarUrl)}" alt="">` : `<span>${accInitial}</span>`}
              </div>
              <div class="account-info">
                <div class="account-name">${escapeHtml(acc.displayName || acc.email.split('@')[0])}</div>
                <div class="account-email">${escapeHtml(acc.email)}</div>
              </div>
              ${isAct ? `<span class="active-pill">Active</span>` : ''}
            </a>
          `;
        }).join('')}
      </div>
    ` : `
      <p style="color: var(--text-secondary); margin-bottom: 24px;">No active session found on this device.</p>
      <a href="/login?return_to=${encodeURIComponent(returnTo)}" class="btn-continue">
        <span>Sign in with Playsole One</span>
      </a>
    `}

    <div class="divider"></div>

    <div class="action-links">
      <a href="/login?prompt=login&return_to=${encodeURIComponent(returnTo)}" class="action-row">
        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        <span>Use another account</span>
      </a>

      <a href="/register?return_to=${encodeURIComponent(returnTo)}&source=chooser" class="action-row">
        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>Create a new Playsole account</span>
      </a>
    </div>

    ${handoffCode ? `
      <div class="handoff-box">
        <div><strong>Mobile Device Handoff:</strong></div>
        <div>Enter code <code style="font-family: var(--font-mono); color: var(--accent-blue);">${escapeHtml(handoffCode)}</code> on your phone to link session.</div>
      </div>
    ` : ''}

  </div>

  <p class="footer-text">Protected by Playsole One Universal Identity</p>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
