/**
 * Playsole One Dark Mode & Floating Theme Toggle Widget
 */

export const themeScript = `
<script>
(function() {
  try {
    var stored = localStorage.getItem('playsole_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored ? stored : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
</script>
`;

export const themeStyles = `
<style id="playsole-theme-styles">
  /* Floating Tiny Circle Toggle Button at Bottom-Right */
  .playsole-theme-toggle {
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    width: 36px !important;
    height: 36px !important;
    border-radius: 50% !important;
    border: 1px solid rgba(226, 232, 240, 0.85) !important;
    background: rgba(255, 255, 255, 0.9) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    color: #0f172a !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    z-index: 999999 !important;
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease !important;
    padding: 0 !important;
    outline: none !important;
    user-select: none !important;
  }
  .playsole-theme-toggle:hover {
    transform: scale(1.12) rotate(15deg) !important;
    border-color: rgba(15, 23, 42, 0.3) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05) !important;
    color: #0f172a !important;
  }
  .playsole-theme-toggle:active {
    transform: scale(0.92) !important;
  }
  .playsole-theme-toggle svg {
    width: 16px !important;
    height: 16px !important;
    stroke-width: 2.4 !important;
    pointer-events: none !important;
  }
  
  /* Icon visibility based on active theme */
  html:not(.dark):not([data-theme="dark"]) .theme-icon-sun,
  html:not(.dark):not([data-theme="dark"]) .theme-icon-line,
  html:not(.dark):not([data-theme="dark"]) .theme-icon-i { display: none !important; }
  html:not(.dark):not([data-theme="dark"]) .theme-icon-moon,
  html:not(.dark):not([data-theme="dark"]) .theme-icon-o { display: block !important; }
  
  html.dark .theme-icon-sun, html.dark .theme-icon-line, html.dark .theme-icon-i,
  [data-theme="dark"] .theme-icon-sun, [data-theme="dark"] .theme-icon-line, [data-theme="dark"] .theme-icon-i { display: block !important; }
  html.dark .theme-icon-moon, html.dark .theme-icon-o,
  [data-theme="dark"] .theme-icon-moon, [data-theme="dark"] .theme-icon-o { display: none !important; }

  /* Dark mode toggle button appearance */
  html.dark .playsole-theme-toggle,
  [data-theme="dark"] .playsole-theme-toggle {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #ffffff !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75) !important;
  }
  html.dark .playsole-theme-toggle:hover,
  [data-theme="dark"] .playsole-theme-toggle:hover {
    transform: scale(1.12) rotate(15deg) !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75) !important;
    color: #ffffff !important;
  }

  /* Global Dark Mode Tokens (Matching Developer Page Pure True Black) */
  html.dark, [data-theme="dark"] {
    color-scheme: dark;
    --bg: #000000;
    --bg-base: #000000;
    --bg-canvas: #000000;
    --bg-subtle: #08080a;
    --bg-surface: #08080a;
    --bg-surface-elevated: #101014;
    --bg-dark: #08080a;
    --fg: #ffffff;
    --fg-muted: #a1a1aa;
    --fg-faint: #71717a;
    --border: rgba(255, 255, 255, 0.1);
    --border-strong: rgba(255, 255, 255, 0.2);
    --border-subtle: rgba(255, 255, 255, 0.08);
    --surface-island: rgba(8, 8, 10, 0.92);
    --surface-glass: rgba(8, 8, 10, 0.85);
    --surface-card: #08080a;
    --border-glass: rgba(255, 255, 255, 0.1);
    --border-color: rgba(255, 255, 255, 0.1);
    --border-hover: rgba(255, 255, 255, 0.2);
    --text-primary: #ffffff;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
    --code-bg: #040405;
    --success-surface: rgba(16, 185, 129, 0.15);
    --success-border: rgba(16, 185, 129, 0.3);
    --warning-surface: rgba(245, 158, 11, 0.15);
    --warning-border: rgba(245, 158, 11, 0.3);
    --danger-surface: rgba(239, 68, 68, 0.15);
    --danger-border: rgba(239, 68, 68, 0.3);
    --shadow-island: 0 10px 30px -5px rgba(0, 0, 0, 0.9), 0 4px 12px -2px rgba(0, 0, 0, 0.8);
    --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.8), 0 1px 3px 0 rgba(0, 0, 0, 0.7);
  }

  /* Global Elements in Dark Mode */
  html.dark body, [data-theme="dark"] body {
    background-color: #000000 !important;
    color: #ffffff !important;
  }

  /* High Contrast Typography in Dark Mode */
  html.dark h1, html.dark h2, html.dark h3, html.dark h4, html.dark h5, html.dark h6,
  html.dark .auth-title, html.dark .studio-card-title h2, html.dark .modal-title,
  html.dark .dock-brand-text, html.dark .dock-user-name, html.dark .identity-info h1,
  html.dark .session-card-title, html.dark .app-vault-title, html.dark .method-title,
  html.dark .totp-step-title, html.dark .card-title, html.dark .telemetry-tile-val,
  html.dark .stat-val, html.dark .metric-value, html.dark .table-row-title,
  html.dark .app-card-title, html.dark .session-device-name, html.dark .sidebar-portal-title,
  [data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3, [data-theme="dark"] h4,
  [data-theme="dark"] .auth-title, [data-theme="dark"] .studio-card-title h2, [data-theme="dark"] .modal-title,
  [data-theme="dark"] .dock-brand-text, [data-theme="dark"] .dock-user-name, [data-theme="dark"] .identity-info h1,
  [data-theme="dark"] .session-card-title, [data-theme="dark"] .app-vault-title, [data-theme="dark"] .method-title,
  [data-theme="dark"] .totp-step-title, [data-theme="dark"] .card-title, [data-theme="dark"] .telemetry-tile-val,
  [data-theme="dark"] .stat-val, [data-theme="dark"] .metric-value, [data-theme="dark"] .table-row-title,
  [data-theme="dark"] .app-card-title, [data-theme="dark"] .session-device-name, [data-theme="dark"] .sidebar-portal-title {
    color: #ffffff !important;
  }

  html.dark strong, html.dark b, html.dark .dev-token strong,
  [data-theme="dark"] strong, [data-theme="dark"] b, [data-theme="dark"] .dev-token strong {
    color: #ffffff !important;
  }

  html.dark p, html.dark .auth-subtitle, html.dark .sub, html.dark .card-desc,
  html.dark .studio-card-subtitle, html.dark .hint, html.dark .help-text, html.dark .auth-footer,
  html.dark .dock-user-email, html.dark .device-meta, html.dark .session-meta,
  html.dark .island-meta, html.dark .meta-label, html.dark .table-meta,
  html.dark .identity-info p, html.dark .telemetry-tile-sub, html.dark .session-card-meta,
  html.dark .app-vault-meta, html.dark .method-meta, html.dark .totp-launcher-hint,
  html.dark .signal-alert-sub, html.dark .card p, html.dark .desc,
  [data-theme="dark"] p, [data-theme="dark"] .auth-subtitle, [data-theme="dark"] .sub,
  [data-theme="dark"] .card-desc, [data-theme="dark"] .studio-card-subtitle,
  [data-theme="dark"] .hint, [data-theme="dark"] .help-text, [data-theme="dark"] .auth-footer,
  [data-theme="dark"] .dock-user-email, [data-theme="dark"] .device-meta,
  [data-theme="dark"] .session-meta, [data-theme="dark"] .identity-info p,
  [data-theme="dark"] .telemetry-tile-sub, [data-theme="dark"] .session-card-meta,
  [data-theme="dark"] .app-vault-meta, [data-theme="dark"] .method-meta,
  [data-theme="dark"] .totp-launcher-hint, [data-theme="dark"] .card p, [data-theme="dark"] .desc {
    color: #a1a1aa !important;
  }

  /* Form Labels & Group Titles in Dark Mode */
  html.dark label, html.dark .field-label, html.dark .input-label, html.dark .form-label,
  html.dark .env-label, html.dark .nav-group-title, html.dark .telemetry-tile-label,
  html.dark .island-input-group label, html.dark .crop-slider-bar label,
  [data-theme="dark"] label, [data-theme="dark"] .field-label, [data-theme="dark"] .input-label,
  [data-theme="dark"] .form-label, [data-theme="dark"] .env-label,
  [data-theme="dark"] .nav-group-title, [data-theme="dark"] .telemetry-tile-label,
  [data-theme="dark"] .island-input-group label {
    color: #e4e4e7 !important;
  }

  /* Overriding low contrast inline colors */
  html.dark [style*="color:#666"], html.dark [style*="color: #666"],
  html.dark [style*="color:#888"], html.dark [style*="color: #888"],
  html.dark [style*="color:#999"], html.dark [style*="color: #999"],
  html.dark [style*="color:#334155"], html.dark [style*="color: #334155"],
  html.dark [style*="color:#475569"], html.dark [style*="color: #475569"],
  html.dark [style*="color:#64748b"], html.dark [style*="color: #64748b"],
  [data-theme="dark"] [style*="color:#666"], [data-theme="dark"] [style*="color: #666"],
  [data-theme="dark"] [style*="color:#888"], [data-theme="dark"] [style*="color: #888"],
  [data-theme="dark"] [style*="color:#999"], [data-theme="dark"] [style*="color: #999"],
  [data-theme="dark"] [style*="color:#334155"], [data-theme="dark"] [style*="color: #334155"],
  [data-theme="dark"] [style*="color:#475569"], [data-theme="dark"] [style*="color: #475569"] {
    color: #a1a1aa !important;
  }

  /* Form Inputs and Select Dropdowns in Dark Mode */
  html.dark input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]),
  html.dark select,
  html.dark textarea,
  html.dark .pill-input,
  html.dark .island-input-group input,
  html.dark .island-input-group select,
  html.dark .totp-code-input,
  [data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]),
  [data-theme="dark"] select,
  [data-theme="dark"] textarea,
  [data-theme="dark"] .pill-input,
  [data-theme="dark"] .island-input-group input,
  [data-theme="dark"] .island-input-group select,
  [data-theme="dark"] .totp-code-input {
    background-color: #0c0c0f !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
  }
  html.dark input::placeholder, html.dark textarea::placeholder,
  [data-theme="dark"] input::placeholder, [data-theme="dark"] textarea::placeholder {
    color: #71717a !important;
  }
  html.dark input:disabled,
  [data-theme="dark"] input:disabled {
    background-color: rgba(255, 255, 255, 0.04) !important;
    color: #71717a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark input:focus, html.dark select:focus, html.dark textarea:focus,
  [data-theme="dark"] input:focus, [data-theme="dark"] select:focus, [data-theme="dark"] textarea:focus {
    border-color: var(--brand, #0076FE) !important;
    box-shadow: 0 0 0 3px rgba(0, 118, 254, 0.25) !important;
  }
  html.dark select option, [data-theme="dark"] select option {
    background-color: #0c0c0f !important;
    color: #ffffff !important;
  }

  /* Cards, Boxes, and Island Layouts (True Black & Elevated Surfaces) */
  html.dark .card,
  html.dark .studio-card,
  html.dark .auth-card,
  html.dark .auth-box,
  html.dark .modal,
  html.dark .island-modal-card,
  html.dark .identity-horizon-card,
  html.dark .telemetry-tile,
  html.dark .telemetry-session-card,
  html.dark .app-vault-item,
  html.dark .totp-setup-card,
  html.dark .totp-media-box,
  html.dark .secret-pill-box,
  html.dark .backup-grid,
  html.dark .qr-wrapper,
  [data-theme="dark"] .card,
  [data-theme="dark"] .studio-card,
  [data-theme="dark"] .auth-card,
  [data-theme="dark"] .auth-box,
  [data-theme="dark"] .modal,
  [data-theme="dark"] .island-modal-card,
  [data-theme="dark"] .identity-horizon-card,
  [data-theme="dark"] .telemetry-tile,
  [data-theme="dark"] .telemetry-session-card,
  [data-theme="dark"] .app-vault-item,
  [data-theme="dark"] .totp-setup-card,
  [data-theme="dark"] .totp-media-box,
  [data-theme="dark"] .secret-pill-box,
  [data-theme="dark"] .backup-grid,
  [data-theme="dark"] .qr-wrapper {
    background-color: #08080a !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }

  html.dark .telemetry-session-card.is-current,
  [data-theme="dark"] .telemetry-session-card.is-current {
    background-color: #0e111a !important;
    border-color: rgba(0, 118, 254, 0.5) !important;
  }

  html.dark .identity-telemetry-col,
  [data-theme="dark"] .identity-telemetry-col {
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .studio-card-header,
  [data-theme="dark"] .studio-card-header {
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .nav-desktop,
  html.dark .topbar-island,
  html.dark .dock-container,
  html.dark .header,
  html.dark .island-dock,
  [data-theme="dark"] .nav-desktop,
  [data-theme="dark"] .topbar-island,
  [data-theme="dark"] .dock-container,
  [data-theme="dark"] .header,
  [data-theme="dark"] .island-dock {
    background-color: rgba(8, 8, 10, 0.92) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  html.dark .dock-nav-segment,
  [data-theme="dark"] .dock-nav-segment {
    background-color: rgba(16, 16, 20, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .dock-btn,
  [data-theme="dark"] .dock-btn {
    color: #a1a1aa !important;
  }
  html.dark .dock-btn:hover,
  [data-theme="dark"] .dock-btn:hover {
    color: #ffffff !important;
  }
  html.dark .dock-btn.active,
  [data-theme="dark"] .dock-btn.active {
    background-color: #222228 !important;
    color: #38bdf8 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8) !important;
  }

  html.dark .dock-user-capsule,
  [data-theme="dark"] .dock-user-capsule {
    background-color: rgba(16, 16, 20, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  html.dark .dock-mobile-hamburger,
  [data-theme="dark"] .dock-mobile-hamburger {
    background-color: #18181d !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
  }
  html.dark .hamburger-bar,
  [data-theme="dark"] .hamburger-bar {
    background-color: #ffffff !important;
  }

  html.dark .dock-link, [data-theme="dark"] .dock-link {
    color: #a1a1aa !important;
  }
  html.dark .dock-link:hover, [data-theme="dark"] .dock-link:hover {
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.06) !important;
  }
  html.dark .dock-link.active, [data-theme="dark"] .dock-link.active {
    color: #0076FE !important;
    background: rgba(0, 118, 254, 0.12) !important;
  }

  /* Buttons in Dark Mode */
  html.dark .btn-island-secondary,
  html.dark .btn-secondary,
  html.dark .btn-pill-ghost,
  html.dark .btn-ghost,
  html.dark .admin-link-btn,
  html.dark .tab-btn,
  [data-theme="dark"] .btn-island-secondary,
  [data-theme="dark"] .btn-secondary,
  [data-theme="dark"] .btn-pill-ghost,
  [data-theme="dark"] .btn-ghost,
  [data-theme="dark"] .admin-link-btn,
  [data-theme="dark"] .tab-btn {
    background-color: rgba(255, 255, 255, 0.06) !important;
    color: #cbd5e1 !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
  }
  html.dark .btn-island-secondary:hover,
  html.dark .btn-secondary:hover,
  html.dark .admin-link-btn:hover,
  html.dark .tab-btn:hover,
  [data-theme="dark"] .btn-island-secondary:hover,
  [data-theme="dark"] .btn-secondary:hover,
  [data-theme="dark"] .admin-link-btn:hover,
  [data-theme="dark"] .tab-btn:hover {
    background-color: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.25) !important;
  }

  /* Tables in Dark Mode */
  html.dark table th, [data-theme="dark"] table th {
    background-color: rgba(255, 255, 255, 0.04) !important;
    color: #a1a1aa !important;
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark table td, [data-theme="dark"] table td {
    color: #e4e4e7 !important;
    border-bottom-color: rgba(255, 255, 255, 0.06) !important;
  }
  html.dark table tr:hover td, [data-theme="dark"] table tr:hover td {
    background-color: rgba(255, 255, 255, 0.03) !important;
  }

  html.dark .session-item,
  html.dark .device-item,
  html.dark .app-card,
  html.dark .island-row,
  html.dark .grant-item,
  html.dark .method-horizon-row,
  [data-theme="dark"] .session-item,
  [data-theme="dark"] .device-item,
  [data-theme="dark"] .app-card,
  [data-theme="dark"] .island-row,
  [data-theme="dark"] .grant-item,
  [data-theme="dark"] .method-horizon-row {
    background-color: #0c0c0f !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .method-symbol,
  html.dark .session-card-icon,
  [data-theme="dark"] .method-symbol,
  [data-theme="dark"] .session-card-icon {
    background-color: rgba(255, 255, 255, 0.06) !important;
    color: #e4e4e7 !important;
  }

  html.dark .user-mobile-nav-modal, [data-theme="dark"] .user-mobile-nav-modal {
    background: rgba(8, 8, 10, 0.98) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  html.dark .hero-badge,
  html.dark .pill,
  html.dark .capsule-neutral,
  html.dark .scope-chip,
  [data-theme="dark"] .hero-badge,
  [data-theme="dark"] .pill,
  [data-theme="dark"] .capsule-neutral,
  [data-theme="dark"] .scope-chip {
    background-color: rgba(255, 255, 255, 0.06) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }
  html.dark .capsule-current,
  [data-theme="dark"] .capsule-current {
    background-color: rgba(0, 118, 254, 0.2) !important;
    color: #38bdf8 !important;
  }

  html.dark code:not(.badge):not(.pill):not(.status-capsule),
  [data-theme="dark"] code:not(.badge):not(.pill):not(.status-capsule) {
    color: #7dd3fc !important;
    background-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .backup-item, [data-theme="dark"] .backup-item {
    color: #ffffff !important;
  }
  html.dark .totp-qr-frame, [data-theme="dark"] .totp-qr-frame {
    background-color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }

  /* Atmospheric horizon in dark mode */
  html.dark body::before, [data-theme="dark"] body::before {
    background: radial-gradient(circle, rgba(0, 118, 254, 0.12) 0%, rgba(99, 102, 241, 0.05) 45%, transparent 70%) !important;
  }

  /* Landing Page & Marketing Pages: Developer Page Pure Black Theme */
  html.dark .nav,
  html.dark .nav-inner,
  html.dark header.nav,
  [data-theme="dark"] .nav,
  [data-theme="dark"] .nav-inner,
  [data-theme="dark"] header.nav {
    background: rgba(8, 8, 10, 0.92) !important;
    border-bottom-color: rgba(255, 255, 255, 0.1) !important;
  }

  html.dark .mobile-drawer,
  [data-theme="dark"] .mobile-drawer {
    background: #000000 !important;
    border-top-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .mobile-drawer a,
  html.dark .mobile-drawer a.mobile-link,
  [data-theme="dark"] .mobile-drawer a,
  [data-theme="dark"] .mobile-drawer a.mobile-link {
    color: #ffffff !important;
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .mobile-drawer a:hover,
  html.dark .mobile-drawer a.mobile-link:hover,
  [data-theme="dark"] .mobile-drawer a:hover,
  [data-theme="dark"] .mobile-drawer a.mobile-link:hover {
    background: #0c0c0f !important;
    color: #0076fe !important;
  }

  html.dark .bento-card,
  html.dark .step-card,
  html.dark .integration-box,
  html.dark .pill-badge,
  [data-theme="dark"] .bento-card,
  [data-theme="dark"] .step-card,
  [data-theme="dark"] .integration-box,
  [data-theme="dark"] .pill-badge {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.8) !important;
  }

  html.dark .bento-card:hover,
  html.dark .step-card:hover,
  [data-theme="dark"] .bento-card:hover,
  [data-theme="dark"] .step-card:hover {
    border-color: rgba(255, 255, 255, 0.22) !important;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.9) !important;
  }

  html.dark .stats-ribbon,
  html.dark .section-hiw,
  [data-theme="dark"] .stats-ribbon,
  [data-theme="dark"] .section-hiw {
    background: #050507 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .bento-icon,
  html.dark .bento-badge,
  html.dark .step-code,
  html.dark .endpoint-item,
  html.dark .brand-badge,
  [data-theme="dark"] .bento-icon,
  [data-theme="dark"] .bento-badge,
  [data-theme="dark"] .step-code,
  [data-theme="dark"] .endpoint-item,
  [data-theme="dark"] .brand-badge {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }

  html.dark .btn-outline,
  [data-theme="dark"] .btn-outline {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #ffffff !important;
  }
  html.dark .btn-outline:hover,
  [data-theme="dark"] .btn-outline:hover {
    background: #141418 !important;
    border-color: #0076fe !important;
    color: #38bdf8 !important;
  }

  html.dark .btn-light,
  [data-theme="dark"] .btn-light {
    background: #ffffff !important;
    color: #000000 !important;
  }

  html.dark .cta-card,
  [data-theme="dark"] .cta-card {
    background: #08080a !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.8) !important;
  }
  html.dark .cta-card h2,
  [data-theme="dark"] .cta-card h2 {
    color: #ffffff !important;
  }
  html.dark .cta-card p,
  [data-theme="dark"] .cta-card p {
    color: #a1a1aa !important;
  }
  html.dark .cta-card .btn-light,
  [data-theme="dark"] .cta-card .btn-light {
    background: #ffffff !important;
    color: #000000 !important;
  }
  html.dark .cta-card .btn-ghost-dark,
  [data-theme="dark"] .cta-card .btn-ghost-dark {
    background: transparent !important;
    color: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
  html.dark .cta-card .btn-ghost-dark:hover,
  [data-theme="dark"] .cta-card .btn-ghost-dark:hover {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.35) !important;
  }

  html.dark .explorer-window,
  [data-theme="dark"] .explorer-window,
  html.dark .integration-terminal,
  [data-theme="dark"] .integration-terminal {
    background: #040405 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .window-topbar,
  [data-theme="dark"] .window-topbar {
    background: #0a0a0d !important;
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .endpoint-tag.get,
  [data-theme="dark"] .endpoint-tag.get {
    background: rgba(16, 185, 129, 0.2) !important;
    color: #34d399 !important;
  }
  html.dark .endpoint-tag.post,
  [data-theme="dark"] .endpoint-tag.post {
    background: rgba(0, 118, 254, 0.2) !important;
    color: #60a5fa !important;
  }

  html.dark footer,
  [data-theme="dark"] footer {
    background: #000000 !important;
    border-top-color: rgba(255, 255, 255, 0.1) !important;
    color: #a1a1aa !important;
  }
  html.dark .footer-grid,
  html.dark .footer-inner,
  html.dark .footer-bottom,
  [data-theme="dark"] .footer-grid,
  [data-theme="dark"] .footer-inner,
  [data-theme="dark"] .footer-bottom {
    border-top-color: rgba(255, 255, 255, 0.08) !important;
    color: #a1a1aa !important;
  }
  html.dark footer h4,
  [data-theme="dark"] footer h4 {
    color: #ffffff !important;
  }
  html.dark footer ul a,
  [data-theme="dark"] footer ul a {
    color: #a1a1aa !important;
  }
  html.dark footer ul a:hover,
  [data-theme="dark"] footer ul a:hover {
    color: #ffffff !important;
  }
  html.dark .footer-brand,
  [data-theme="dark"] .footer-brand {
    color: #ffffff !important;
  }

  html.dark .hamburger,
  [data-theme="dark"] .hamburger {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #ffffff !important;
  }

  html.dark .nav-links a,
  [data-theme="dark"] .nav-links a {
    color: #a1a1aa !important;
  }
  html.dark .nav-links a:hover,
  [data-theme="dark"] .nav-links a:hover {
    color: #ffffff !important;
  }
  html.dark .nav-links a.active,
  [data-theme="dark"] .nav-links a.active {
    color: #0076fe !important;
  }
  html.dark .brand,
  [data-theme="dark"] .brand {
    color: #ffffff !important;
  }

  html.dark .page-header,
  [data-theme="dark"] .page-header {
    border-bottom-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .page-header h1,
  [data-theme="dark"] .page-header h1 {
    color: #ffffff !important;
  }
  html.dark .page-header p,
  [data-theme="dark"] .page-header p {
    color: #a1a1aa !important;
  }
  html.dark .content,
  [data-theme="dark"] .content {
    color: #d4d4d8 !important;
  }
  html.dark .content h2,
  html.dark .content h3,
  [data-theme="dark"] .content h2,
  [data-theme="dark"] .content h3 {
    color: #ffffff !important;
    border-top-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .content p,
  html.dark .content ul,
  [data-theme="dark"] .content p,
  [data-theme="dark"] .content ul {
    color: #a1a1aa !important;
  }
  html.dark .content strong,
  [data-theme="dark"] .content strong {
    color: #ffffff !important;
  }

  /* ════════════════════════════════════════════════════════════════
     STATUS PAGE (True Developer Pure Black Palette)
     ════════════════════════════════════════════════════════════════ */
  html.dark .hero-horizon-card,
  [data-theme="dark"] .hero-horizon-card,
  html.dark .bento-studio-card,
  [data-theme="dark"] .bento-studio-card {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.8) !important;
  }
  html.dark .hero-telemetry-side,
  [data-theme="dark"] .hero-telemetry-side {
    border-left-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .hero-status-title,
  [data-theme="dark"] .hero-status-title {
    color: #ffffff !important;
  }
  html.dark .hero-status-desc,
  [data-theme="dark"] .hero-status-desc {
    color: #a1a1aa !important;
  }
  html.dark .hero-tag-badge,
  [data-theme="dark"] .hero-tag-badge {
    background: rgba(0, 118, 254, 0.18) !important;
    color: #38bdf8 !important;
  }
  html.dark .section-headline,
  [data-theme="dark"] .section-headline {
    color: #ffffff !important;
  }
  html.dark .section-subtext,
  [data-theme="dark"] .section-subtext {
    color: #71717a !important;
  }
  html.dark .btn-probe-refresh,
  [data-theme="dark"] .btn-probe-refresh {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #ffffff !important;
  }
  html.dark .btn-probe-refresh:hover,
  [data-theme="dark"] .btn-probe-refresh:hover {
    background: #141418 !important;
    border-color: #0076fe !important;
    color: #38bdf8 !important;
  }
  html.dark .auto-refresh-toggle,
  [data-theme="dark"] .auto-refresh-toggle {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: #a1a1aa !important;
  }
  html.dark .service-studio-card,
  [data-theme="dark"] .service-studio-card {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .service-studio-card:hover,
  [data-theme="dark"] .service-studio-card:hover {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.8) !important;
  }
  html.dark .service-icon-box,
  [data-theme="dark"] .service-icon-box {
    background: rgba(0, 118, 254, 0.15) !important;
    color: #38bdf8 !important;
  }
  html.dark .service-name,
  [data-theme="dark"] .service-name {
    color: #ffffff !important;
  }
  html.dark .service-role-badge,
  [data-theme="dark"] .service-role-badge {
    background: rgba(255, 255, 255, 0.06) !important;
    color: #a1a1aa !important;
  }
  html.dark .service-desc,
  [data-theme="dark"] .service-desc {
    color: #a1a1aa !important;
  }
  html.dark .latency-cell,
  [data-theme="dark"] .latency-cell {
    background: rgba(255, 255, 255, 0.04) !important;
    color: #a1a1aa !important;
  }
  html.dark .lat-normal,
  [data-theme="dark"] .lat-normal {
    color: #a1a1aa !important;
  }
  html.dark .mini-uptime-track,
  [data-theme="dark"] .mini-uptime-track {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .day-inspector-hint,
  [data-theme="dark"] .day-inspector-hint {
    background: rgba(255, 255, 255, 0.04) !important;
    color: #71717a !important;
  }
  html.dark .day-inspector-card,
  [data-theme="dark"] .day-inspector-card {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .day-inspector-date,
  [data-theme="dark"] .day-inspector-date {
    color: #ffffff !important;
  }
  html.dark .day-inspector-incident-item,
  [data-theme="dark"] .day-inspector-incident-item {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .day-inspector-item-title,
  [data-theme="dark"] .day-inspector-item-title {
    color: #ffffff !important;
  }
  html.dark .day-inspector-item-desc,
  [data-theme="dark"] .day-inspector-item-desc {
    color: #a1a1aa !important;
  }
  html.dark .pillar-tile,
  [data-theme="dark"] .pillar-tile {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .pillar-name,
  [data-theme="dark"] .pillar-name {
    color: #ffffff !important;
  }
  html.dark .pillar-desc,
  [data-theme="dark"] .pillar-desc {
    color: #a1a1aa !important;
  }
  html.dark .incidents-empty-card,
  [data-theme="dark"] .incidents-empty-card {
    background: rgba(16, 185, 129, 0.12) !important;
    border-color: rgba(16, 185, 129, 0.25) !important;
  }
  html.dark .incidents-text-title,
  [data-theme="dark"] .incidents-text-title {
    color: #34d399 !important;
  }
  html.dark .incidents-text-sub,
  [data-theme="dark"] .incidents-text-sub {
    color: #a7f3d0 !important;
  }
  html.dark .status-footer,
  [data-theme="dark"] .status-footer {
    border-top-color: rgba(255, 255, 255, 0.08) !important;
    color: #71717a !important;
  }
  html.dark .dock-hamburger-btn,
  [data-theme="dark"] .dock-hamburger-btn {
    background: #18181d !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
  }
  html.dark .status-mobile-menu,
  [data-theme="dark"] .status-mobile-menu {
    background: rgba(8, 8, 10, 0.98) !important;
  }
  html.dark .status-mobile-link,
  [data-theme="dark"] .status-mobile-link {
    color: #ffffff !important;
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }

  /* ════════════════════════════════════════════════════════════════
     USER DASHBOARD (All Pages & Tabs)
     ════════════════════════════════════════════════════════════════ */
  html.dark .identity-horizon-card,
  [data-theme="dark"] .identity-horizon-card {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.8) !important;
  }
  html.dark .identity-left-col,
  [data-theme="dark"] .identity-left-col {
    color: #ffffff !important;
  }
  html.dark .identity-info h1,
  [data-theme="dark"] .identity-info h1 {
    color: #ffffff !important;
  }
  html.dark .identity-info p,
  [data-theme="dark"] .identity-info p {
    color: #a1a1aa !important;
  }
  html.dark .identity-telemetry-col,
  [data-theme="dark"] .identity-telemetry-col {
    border-left-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .telemetry-tile,
  [data-theme="dark"] .telemetry-tile {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .telemetry-tile:hover,
  [data-theme="dark"] .telemetry-tile:hover {
    background: #18181e !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
  html.dark .telemetry-tile-label,
  [data-theme="dark"] .telemetry-tile-label {
    color: #71717a !important;
  }
  html.dark .telemetry-tile-val,
  [data-theme="dark"] .telemetry-tile-val {
    color: #ffffff !important;
  }
  html.dark .telemetry-tile-sub,
  [data-theme="dark"] .telemetry-tile-sub {
    color: #a1a1aa !important;
  }
  html.dark .method-horizon-row,
  [data-theme="dark"] .method-horizon-row {
    border-bottom-color: rgba(255, 255, 255, 0.06) !important;
  }
  html.dark .method-symbol,
  [data-theme="dark"] .method-symbol {
    background: rgba(255, 255, 255, 0.06) !important;
    color: #e4e4e7 !important;
  }
  html.dark .method-title,
  [data-theme="dark"] .method-title {
    color: #ffffff !important;
  }
  html.dark .method-meta,
  [data-theme="dark"] .method-meta {
    color: #71717a !important;
  }
  html.dark .telemetry-session-card,
  [data-theme="dark"] .telemetry-session-card {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .telemetry-session-card.is-current,
  [data-theme="dark"] .telemetry-session-card.is-current {
    background: #0c1017 !important;
    border-color: rgba(0, 118, 254, 0.5) !important;
  }
  html.dark .session-card-icon,
  [data-theme="dark"] .session-card-icon {
    background: rgba(255, 255, 255, 0.06) !important;
    color: #e4e4e7 !important;
  }
  html.dark .session-card-title,
  [data-theme="dark"] .session-card-title {
    color: #ffffff !important;
  }
  html.dark .session-card-meta,
  [data-theme="dark"] .session-card-meta {
    color: #71717a !important;
  }
  html.dark .app-vault-item,
  [data-theme="dark"] .app-vault-item {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .app-vault-symbol,
  [data-theme="dark"] .app-vault-symbol {
    background: rgba(0, 118, 254, 0.15) !important;
    color: #38bdf8 !important;
  }
  html.dark .app-vault-title,
  [data-theme="dark"] .app-vault-title {
    color: #ffffff !important;
  }
  html.dark .app-vault-meta,
  [data-theme="dark"] .app-vault-meta {
    color: #71717a !important;
  }
  html.dark .signal-alert-banner,
  [data-theme="dark"] .signal-alert-banner {
    background: rgba(245, 158, 11, 0.15) !important;
    border-color: rgba(245, 158, 11, 0.3) !important;
    color: #fcd34d !important;
  }
  html.dark .signal-alert-banner.seen,
  [data-theme="dark"] .signal-alert-banner.seen {
    background: #0c0c0f !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #71717a !important;
  }
  html.dark .signal-alert-title,
  [data-theme="dark"] .signal-alert-title {
    color: #ffffff !important;
  }
  html.dark .signal-alert-sub,
  [data-theme="dark"] .signal-alert-sub {
    color: #a1a1aa !important;
  }
  html.dark .totp-setup-card,
  [data-theme="dark"] .totp-setup-card {
    background: #08080a !important;
    border-color: #0076fe !important;
  }
  html.dark .totp-media-box,
  [data-theme="dark"] .totp-media-box {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .totp-qr-frame,
  [data-theme="dark"] .totp-qr-frame {
    background: #ffffff !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
  html.dark .secret-pill-box,
  [data-theme="dark"] .secret-pill-box {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .backup-grid,
  [data-theme="dark"] .backup-grid {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .backup-item,
  [data-theme="dark"] .backup-item {
    color: #ffffff !important;
  }
  html.dark .crop-canvas-box,
  [data-theme="dark"] .crop-canvas-box {
    background: #040405 !important;
  }
  html.dark .user-mobile-nav-drawer,
  [data-theme="dark"] .user-mobile-nav-drawer {
    background: rgba(8, 8, 10, 0.98) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .user-mobile-drawer-header,
  [data-theme="dark"] .user-mobile-drawer-header {
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .island-modal-card,
  [data-theme="dark"] .island-modal-card {
    background: #08080a !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }
  html.dark .island-modal-card h3,
  [data-theme="dark"] .island-modal-card h3 {
    color: #ffffff !important;
  }
  html.dark .island-modal-card p,
  [data-theme="dark"] .island-modal-card p {
    color: #a1a1aa !important;
  }

  /* ════════════════════════════════════════════════════════════════
     ADMIN DASHBOARD (All Pages & Views)
     ════════════════════════════════════════════════════════════════ */
  html.dark .admin-table,
  [data-theme="dark"] .admin-table {
    color: #ffffff !important;
  }
  html.dark .admin-table th,
  [data-theme="dark"] .admin-table th {
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    color: #71717a !important;
    background: rgba(255, 255, 255, 0.02) !important;
  }
  html.dark .admin-table td,
  [data-theme="dark"] .admin-table td {
    border-bottom-color: rgba(255, 255, 255, 0.06) !important;
    color: #e4e4e7 !important;
  }
  html.dark .admin-table-row:hover td,
  [data-theme="dark"] .admin-table-row:hover td {
    background: rgba(255, 255, 255, 0.03) !important;
  }
  html.dark .user-cell-name,
  [data-theme="dark"] .user-cell-name {
    color: #ffffff !important;
  }
  html.dark .user-cell-email,
  [data-theme="dark"] .user-cell-email {
    color: #71717a !important;
  }
  html.dark .code-tag,
  [data-theme="dark"] .code-tag {
    background: rgba(255, 255, 255, 0.06) !important;
    color: #7dd3fc !important;
  }
  html.dark .client-card,
  html.dark .tenant-card,
  [data-theme="dark"] .client-card,
  [data-theme="dark"] .tenant-card {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .client-icon,
  [data-theme="dark"] .client-icon {
    background: rgba(0, 118, 254, 0.15) !important;
    color: #38bdf8 !important;
  }
  html.dark .tenant-icon,
  [data-theme="dark"] .tenant-icon {
    background: rgba(16, 185, 129, 0.15) !important;
    color: #34d399 !important;
  }
  html.dark .client-title,
  html.dark .tenant-title,
  [data-theme="dark"] .client-title,
  [data-theme="dark"] .tenant-title {
    color: #ffffff !important;
  }
  html.dark .client-meta,
  html.dark .tenant-meta,
  [data-theme="dark"] .client-meta,
  [data-theme="dark"] .tenant-meta {
    color: #71717a !important;
  }
  html.dark .client-body,
  html.dark .tenant-details,
  [data-theme="dark"] .client-body,
  [data-theme="dark"] .tenant-details {
    border-top-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark .detail-label,
  html.dark .client-field label,
  [data-theme="dark"] .detail-label,
  [data-theme="dark"] .client-field label {
    color: #71717a !important;
  }
  html.dark .detail-val,
  [data-theme="dark"] .detail-val {
    color: #ffffff !important;
  }
  html.dark .uri-chip,
  [data-theme="dark"] .uri-chip {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #e4e4e7 !important;
  }
  html.dark .search-input,
  html.dark .filter-select,
  [data-theme="dark"] .search-input,
  [data-theme="dark"] .filter-select {
    background: #0c0c0f !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
  }
  html.dark .search-input::placeholder,
  [data-theme="dark"] .search-input::placeholder {
    color: #71717a !important;
  }
  html.dark .modal-dialog,
  [data-theme="dark"] .modal-dialog {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
  }
  html.dark .modal-input,
  [data-theme="dark"] .modal-input {
    background: #0c0c0f !important;
    border-color: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
  }
  html.dark .secret-reveal-box,
  [data-theme="dark"] .secret-reveal-box {
    background: #040405 !important;
    border-color: rgba(0, 118, 254, 0.4) !important;
    color: #38bdf8 !important;
  }
  html.dark .admin-mobile-nav-drawer,
  [data-theme="dark"] .admin-mobile-nav-drawer {
    background: rgba(8, 8, 10, 0.98) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .denied-card,
  [data-theme="dark"] .denied-card {
    background: #08080a !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
  html.dark .account-capsule,
  [data-theme="dark"] .account-capsule {
    background: #101014 !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
    color: #cbd5e1 !important;
  }
  html.dark .denied-title,
  [data-theme="dark"] .denied-title {
    color: #ffffff !important;
  }
  html.dark .denied-desc,
  [data-theme="dark"] .denied-desc {
    color: #a1a1aa !important;
  }
</style>
`;

export const themeToggleHtml = `
<button id="playsoleThemeToggle" class="playsole-theme-toggle" type="button" aria-label="Toggle dark/light mode" title="Toggle dark/light mode">
  <svg class="theme-icon-sun theme-icon-line" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
  </svg>
  <svg class="theme-icon-moon theme-icon-o" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="7"></circle>
  </svg>
</button>
<script>
(function() {
  var btn = document.getElementById('playsoleThemeToggle');
  if (!btn) return;
  btn.addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('playsole_theme', next); } catch(e) {}
  });
})();
</script>
`;

/**
 * Injects theme script into <head> (to run immediately before render)
 * and theme styles before </head>, with the floating toggle button before </body>.
 */
export function injectTheme(html: string): string {
  if (typeof html !== 'string') return html;
  if (html.includes('id="playsole-theme-styles"')) return html;

  let res = html;

  // Insert theme styles before </head> so it overrides previous style tags,
  // and themeScript immediately in <head> to prevent FOUC.
  if (res.includes('</head>')) {
    res = res.replace('</head>', themeStyles + '</head>');
    if (res.includes('<head>')) {
      res = res.replace('<head>', '<head>' + themeScript);
    }
  } else if (res.includes('<head>')) {
    res = res.replace('<head>', '<head>' + themeScript + themeStyles);
  } else if (res.includes('<html>')) {
    res = res.replace('<html>', '<html><head>' + themeScript + themeStyles + '</head>');
  } else if (res.includes('<html lang="en">')) {
    res = res.replace('<html lang="en">', '<html lang="en"><head>' + themeScript + themeStyles + '</head>');
  }

  // Insert toggle button before </body>
  if (res.includes('</body>')) {
    res = res.replace('</body>', themeToggleHtml + '</body>');
  } else {
    res += themeToggleHtml;
  }

  return res;
}
