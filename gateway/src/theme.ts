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
    box-shadow: 0 6px 20px rgba(0, 118, 254, 0.35) !important;
    border-color: #0076FE !important;
    color: #0076FE !important;
  }
  .playsole-theme-toggle:active {
    transform: scale(0.92) !important;
  }
  .playsole-theme-toggle svg {
    width: 17px !important;
    height: 17px !important;
    stroke-width: 2 !important;
    pointer-events: none !important;
  }
  
  /* Icon visibility based on active theme */
  html:not(.dark):not([data-theme="dark"]) .theme-icon-sun { display: none !important; }
  html:not(.dark):not([data-theme="dark"]) .theme-icon-moon { display: block !important; }
  
  html.dark .theme-icon-sun, [data-theme="dark"] .theme-icon-sun { display: block !important; }
  html.dark .theme-icon-moon, [data-theme="dark"] .theme-icon-moon { display: none !important; }

  /* Dark mode toggle button appearance */
  html.dark .playsole-theme-toggle,
  [data-theme="dark"] .playsole-theme-toggle {
    background: rgba(15, 23, 42, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.15) !important;
    color: #f8fafc !important;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.6) !important;
  }
  html.dark .playsole-theme-toggle:hover,
  [data-theme="dark"] .playsole-theme-toggle:hover {
    border-color: #0076FE !important;
    box-shadow: 0 6px 22px rgba(0, 118, 254, 0.45) !important;
    color: #38bdf8 !important;
  }

  /* Global Dark Mode Tokens */
  html.dark, [data-theme="dark"] {
    color-scheme: dark;
    --bg: #090d16;
    --bg-subtle: #0f172a;
    --bg-surface: #111827;
    --bg-dark: #f8fafc;
    --bg-canvas: #090d16;
    --fg: #f8fafc;
    --fg-muted: #94a3b8;
    --fg-faint: #64748b;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.16);
    --border-subtle: rgba(255, 255, 255, 0.04);
    --surface-island: rgba(15, 23, 42, 0.88);
    --surface-glass: rgba(15, 23, 42, 0.75);
    --surface-card: #0f172a;
    --border-glass: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(255, 255, 255, 0.18);
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --success-surface: rgba(16, 185, 129, 0.15);
    --warning-surface: rgba(245, 158, 11, 0.15);
    --danger-surface: rgba(239, 68, 68, 0.15);
    --shadow-island: 0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 4px 12px -2px rgba(0, 0, 0, 0.4);
    --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 1px 3px 0 rgba(0, 0, 0, 0.4);
  }

  /* Global Elements in Dark Mode */
  html.dark body, [data-theme="dark"] body {
    background-color: var(--bg-canvas) !important;
    color: var(--text-primary) !important;
  }

  /* Form Inputs and Select Dropdowns in Dark Mode */
  html.dark input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]),
  html.dark select,
  html.dark textarea,
  [data-theme="dark"] input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]),
  [data-theme="dark"] select,
  [data-theme="dark"] textarea {
    background-color: #131c31 !important;
    color: #f8fafc !important;
    border-color: rgba(255, 255, 255, 0.14) !important;
  }
  html.dark input:disabled,
  [data-theme="dark"] input:disabled {
    background-color: rgba(255, 255, 255, 0.04) !important;
    color: #64748b !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  html.dark input:focus, html.dark select:focus, html.dark textarea:focus,
  [data-theme="dark"] input:focus, [data-theme="dark"] select:focus, [data-theme="dark"] textarea:focus {
    border-color: var(--brand, #0076FE) !important;
    box-shadow: 0 0 0 3px rgba(0, 118, 254, 0.25) !important;
  }
  html.dark select option, [data-theme="dark"] select option {
    background-color: #0f172a !important;
    color: #f8fafc !important;
  }

  /* Cards, Boxes, and Island Layouts */
  html.dark .card,
  html.dark .studio-card,
  html.dark .auth-card,
  html.dark .auth-box,
  html.dark .modal,
  html.dark .bento-card,
  html.dark .qr-wrapper,
  [data-theme="dark"] .card,
  [data-theme="dark"] .studio-card,
  [data-theme="dark"] .auth-card,
  [data-theme="dark"] .auth-box,
  [data-theme="dark"] .modal,
  [data-theme="dark"] .bento-card,
  [data-theme="dark"] .qr-wrapper {
    background-color: #0f172a !important;
    border-color: rgba(255, 255, 255, 0.09) !important;
    color: #f8fafc !important;
  }

  html.dark .studio-card-header,
  [data-theme="dark"] .studio-card-header {
    border-bottom-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .nav-desktop,
  html.dark .topbar-island,
  html.dark .dock-container,
  html.dark .header,
  [data-theme="dark"] .nav-desktop,
  [data-theme="dark"] .topbar-island,
  [data-theme="dark"] .dock-container,
  [data-theme="dark"] .header {
    background-color: rgba(15, 23, 42, 0.88) !important;
    border-color: rgba(255, 255, 255, 0.09) !important;
  }

  html.dark .dock-link, [data-theme="dark"] .dock-link {
    color: #94a3b8 !important;
  }
  html.dark .dock-link:hover, [data-theme="dark"] .dock-link:hover {
    color: #f8fafc !important;
    background: rgba(255, 255, 255, 0.05) !important;
  }
  html.dark .dock-link.active, [data-theme="dark"] .dock-link.active {
    color: #0076FE !important;
    background: rgba(0, 118, 254, 0.12) !important;
  }

  html.dark .session-item,
  html.dark .device-item,
  html.dark .app-card,
  html.dark .island-row,
  html.dark .grant-item,
  [data-theme="dark"] .session-item,
  [data-theme="dark"] .device-item,
  [data-theme="dark"] .app-card,
  [data-theme="dark"] .island-row,
  [data-theme="dark"] .grant-item {
    background-color: rgba(19, 28, 49, 0.5) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }

  html.dark .user-mobile-nav-modal, [data-theme="dark"] .user-mobile-nav-modal {
    background: rgba(15, 23, 42, 0.96) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }

  html.dark .hero-badge,
  html.dark .pill,
  [data-theme="dark"] .hero-badge,
  [data-theme="dark"] .pill {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
    color: #f8fafc !important;
  }

  /* Atmospheric horizon in dark mode */
  html.dark body::before, [data-theme="dark"] body::before {
    background: radial-gradient(circle, rgba(0, 118, 254, 0.15) 0%, rgba(99, 102, 241, 0.08) 45%, transparent 70%) !important;
  }
</style>
`;

export const themeToggleHtml = `
<button id="playsoleThemeToggle" class="playsole-theme-toggle" type="button" aria-label="Toggle dark/light mode" title="Toggle dark/light mode">
  <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
  <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 1 12.79 21 9 9 0 1 1 21 12.79z"></path>
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
 * Injects theme script and styles into <head> of an HTML document,
 * and the floating toggle button before </body>.
 */
export function injectTheme(html: string): string {
  if (typeof html !== 'string') return html;
  if (html.includes('id="playsole-theme-styles"')) return html;

  let res = html;

  // Insert theme script and styles in <head>
  if (res.includes('<head>')) {
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
