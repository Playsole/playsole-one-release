import { renderDevelopersView } from './developersView';
import { cleanIp, formatUserAgent, formatDeviceLabel, COUNTRIES } from '@playsole-one/shared';
import { renderSeoHead, landingSeo, privacySeo, termsSeo, SeoPageConfig } from './seo';

function navAuthActions(userId?: string): string {
  return userId
    ? `<a class="btn btn-primary" href="/grants">Manage apps</a>`
    : `<a class="btn btn-ghost" href="/login">Sign in</a>
       <a class="btn btn-primary" href="/register">Create account</a>`;
}

export function landingPage(userId?: string): string {
  const isAuthed = Boolean(userId);
  const authActions = isAuthed
    ? `<a class="btn btn-primary" href="/grants">Manage apps</a>`
    : `<a class="btn btn-ghost" href="/login">Sign in</a>
       <a class="btn btn-primary" href="/register">Create account</a>`;
  const mobileAuthActions = isAuthed
    ? `<a class="btn btn-primary" href="/grants" onclick="closeMenu()">Manage apps</a>`
    : `<a class="btn btn-ghost" href="/login" onclick="closeMenu()">Sign in</a>
       <a class="btn btn-primary" href="/register" onclick="closeMenu()">Create account</a>`;
  const heroActions = isAuthed
    ? `<a class="btn btn-primary" href="/grants">
         <span>Manage Applications</span>
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
       </a>
       <a class="btn btn-outline" href="/developers">API Documentation</a>`
    : `<a class="btn btn-primary" href="/register">
         <span>Get Started Free</span>
         <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
       </a>
       <a class="btn btn-outline" href="/developers">Read the Docs</a>`;
  const ctaActions = isAuthed
    ? `<a class="btn btn-light" href="/grants">Manage Connected Apps</a>
       <a class="btn btn-ghost-dark" href="/developers">Developer Documentation</a>`
    : `<a class="btn btn-light" href="/register">Create Free Account</a>
       <a class="btn btn-ghost-dark" href="/developers">Read Integration Guide</a>`;
  const ctaBandDesc = isAuthed
    ? 'Manage your authorized client applications, review active scopes, or consult the developer documentation.'
    : 'Integrate standard OAuth 2.0 and OpenID Connect with PKCE into your application in under ten minutes.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#ffffff">
${renderSeoHead(landingSeo)}
<script>document.documentElement.classList.add('js');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<link rel="icon" type="image/svg+xml" href="/logo.svg">
<style>
  :root {
    --bg: #ffffff;
    --bg-subtle: #f8fafc;
    --bg-surface: #ffffff;
    --bg-dark: #090d16;
    --fg: #090d16;
    --fg-muted: #475569;
    --fg-faint: #64748b;
    --border: rgba(15, 23, 42, 0.08);
    --border-strong: rgba(15, 23, 42, 0.16);
    --border-subtle: rgba(15, 23, 42, 0.04);
    --accent: #0076FE;
    --accent-hover: #0060d4;
    --accent-soft: rgba(0, 118, 254, 0.08);
    --accent-border: rgba(0, 118, 254, 0.22);
    --mono: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
    --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --radius-xs: 6px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --radius-full: 9999px;
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--fg);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
    position: relative;
  }

  a { color: inherit; text-decoration: none; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  main { position: relative; overflow: hidden; }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    border-radius: var(--radius-xs);
  }

  /* ── Canvas Animated Background ── */
  .bg-canvas-wrap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 940px;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
    mask-image: linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 75%, rgba(0,0,0,0) 100%);
    -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 75%, rgba(0,0,0,0) 100%);
  }
  #hero-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 18px;
    border-radius: var(--radius-sm);
    font-family: var(--font);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background-color 150ms var(--ease), border-color 150ms var(--ease), color 150ms var(--ease), transform 150ms var(--ease);
    white-space: nowrap;
    user-select: none;
  }
  .btn:active { transform: translateY(1px); }
  .btn-primary {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }
  .btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
  .btn-outline {
    background: var(--bg-surface);
    color: var(--fg);
    border-color: var(--border-strong);
  }
  .btn-outline:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--bg-subtle);
  }
  .btn-ghost {
    background: transparent;
    color: var(--fg-muted);
    border-color: transparent;
  }
  .btn-ghost:hover {
    color: var(--fg);
    background: rgba(15, 23, 42, 0.04);
  }
  .btn-light {
    background: #ffffff;
    color: var(--bg-dark);
    font-weight: 600;
  }
  .btn-light:hover { background: #f1f5f9; }
  .btn-ghost-dark {
    background: transparent;
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }
  .btn-ghost-dark:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.35);
  }

  /* ── Navigation ── */
  .nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }
  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 62px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: -0.015em;
    color: var(--fg);
  }
  .brand-logo {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .brand-logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .brand-badge {
    font-family: var(--mono);
    font-size: 11px;
    padding: 1px 6px;
    border-radius: var(--radius-xs);
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    color: var(--fg-faint);
  }
  .nav-links { display: flex; gap: 28px; }
  .nav-links a {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    color: var(--fg-muted);
    font-size: 13.5px;
    font-weight: 500;
    transition: color 150ms var(--ease);
  }
  .nav-links a:hover { color: var(--fg); }
  .nav-actions { display: flex; gap: 10px; align-items: center; }

  /* ── Mobile Hamburger ── */
  .hamburger {
    display: none;
    width: 40px;
    height: 40px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    color: var(--fg);
    transition: background 150ms var(--ease);
  }
  .hamburger:hover { background: var(--bg-subtle); }
  .hamburger svg { width: 20px; height: 20px; }
  .hamburger .icon-close { display: none; }
  .hamburger.open .icon-menu { display: none; }
  .hamburger.open .icon-close { display: block; }

  /* ── Mobile Drawer ── */
  .mobile-drawer {
    display: none;
    position: fixed;
    inset: 62px 0 0 0;
    background: var(--bg);
    z-index: 49;
    padding: 24px;
    flex-direction: column;
    overflow-y: auto;
    border-top: 1px solid var(--border);
  }
  .mobile-drawer.open { display: flex; }
  .mobile-nav-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mobile-drawer a.mobile-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 12px;
    font-size: 16px;
    font-weight: 500;
    color: var(--fg);
    border-radius: var(--radius-sm);
    transition: background 150ms var(--ease);
  }
  .mobile-drawer a.mobile-link:hover { background: var(--bg-subtle); color: var(--accent); }
  .mobile-actions {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .mobile-actions .btn { width: 100%; min-height: 44px; font-size: 15px; }

  /* ── Hero ── */
  .hero {
    position: relative;
    padding: 72px 0 64px;
    z-index: 1;
  }
  .hero-inner {
    max-width: 860px;
    margin: 0 auto;
    text-align: center;
  }
  .pill-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 14px;
    border-radius: var(--radius-full);
    background: var(--bg-surface);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-sm);
    font-family: var(--mono);
    font-size: 12px;
    color: var(--fg-muted);
    margin-bottom: 24px;
  }
  .pill-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    position: relative;
  }
  .pill-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid rgba(16, 185, 129, 0.4);
    animation: pulse 2.5s infinite;
  }
  @keyframes pulse {
    0% { transform: scale(0.9); opacity: 1; }
    50% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(0.9); opacity: 0; }
  }

  .hero h1 {
    font-size: clamp(2.35rem, 4.5vw + 0.5rem, 3.85rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin-bottom: 20px;
    color: var(--fg);
  }
  .hero h1 .accent-span {
    color: var(--accent);
  }
  .hero p.sub {
    font-size: clamp(1.05rem, 0.9vw + 0.85rem, 1.25rem);
    color: var(--fg-muted);
    line-height: 1.6;
    max-width: 68ch;
    margin: 0 auto 32px;
  }
  .hero-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 48px;
  }
  .hero-actions .btn { min-height: 44px; padding: 0 22px; font-size: 15px; }

  /* ── Interactive Protocol Explorer Window ── */
  .explorer-window {
    max-width: 900px;
    margin: 0 auto;
    background: #0d1117;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    text-align: left;
  }
  .window-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: #161b22;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    gap: 12px;
    flex-wrap: wrap;
  }
  .window-dots {
    display: flex;
    gap: 7px;
    align-items: center;
  }
  .window-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.18);
  }
  .window-dot:nth-child(1) { background: #ff5f56; }
  .window-dot:nth-child(2) { background: #ffbd2e; }
  .window-dot:nth-child(3) { background: #27c93f; }

  .window-tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .tab-btn {
    background: transparent;
    border: none;
    color: #8b949e;
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 12px;
    border-radius: var(--radius-xs);
    cursor: pointer;
    transition: color 150ms var(--ease), background 150ms var(--ease);
    white-space: nowrap;
  }
  .tab-btn:hover { color: #f0f6fc; background: rgba(255, 255, 255, 0.05); }
  .tab-btn.active {
    color: #f0f6fc;
    background: rgba(255, 255, 255, 0.1);
  }

  .copy-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-xs);
    color: #8b949e;
    font-family: var(--mono);
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: color 150ms, border-color 150ms, background 150ms;
  }
  .copy-btn:hover { color: #f0f6fc; border-color: rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.06); }

  .window-body {
    padding: 20px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .tab-pane {
    display: none;
  }
  .tab-pane.active {
    display: block;
  }
  .code-pre {
    margin: 0;
    font-family: var(--mono);
    font-size: 12.5px;
    line-height: 1.65;
    color: #e6edf3;
    white-space: pre;
  }
  .code-token-method { color: #7ee787; font-weight: 600; }
  .code-token-endpoint { color: #79c0ff; font-weight: 600; }
  .code-token-param { color: #d2a8ff; }
  .code-token-val { color: #a5d6ff; }
  .code-token-comment { color: #8b949e; font-style: italic; }
  .code-token-header { color: #ff7b72; }

  .window-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: #161b22;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-family: var(--mono);
    font-size: 11px;
    color: #8b949e;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* ── Stats Ribbon ── */
  .stats-ribbon {
    padding: 32px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: var(--bg-subtle);
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    text-align: center;
  }
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-val {
    font-family: var(--mono);
    font-size: clamp(1.4rem, 2vw + 0.5rem, 1.85rem);
    font-weight: 700;
    color: var(--fg);
    letter-spacing: -0.02em;
  }
  .stat-lbl {
    font-size: 13px;
    color: var(--fg-muted);
  }

  /* ── Section Header ── */
  section { padding: 88px 0; position: relative; }
  .section-head {
    max-width: 680px;
    margin: 0 auto 52px;
    text-align: center;
  }
  .section-tag {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
    margin-bottom: 10px;
    display: block;
  }
  .section-head h2 {
    font-size: clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 14px;
    color: var(--fg);
  }
  .section-head p {
    color: var(--fg-muted);
    font-size: 16px;
    line-height: 1.6;
  }

  /* ── Bento Grid ── */
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .bento-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 28px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: border-color 180ms var(--ease), box-shadow 180ms var(--ease), transform 180ms var(--ease);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }
  .bento-card:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  .bento-card.span-2 {
    grid-column: span 2;
  }
  .bento-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .bento-icon {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-sm);
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
  }
  .bento-icon svg { width: 22px; height: 22px; }
  .bento-badge {
    font-family: var(--mono);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: var(--radius-xs);
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    color: var(--fg-faint);
  }
  .bento-content h3 {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    margin-bottom: 8px;
    color: var(--fg);
  }
  .bento-content p {
    color: var(--fg-muted);
    font-size: 14.5px;
    line-height: 1.55;
  }
  .bento-spec {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--fg-faint);
  }
  .bento-spec span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .bento-spec span::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent);
  }

  /* ── How It Works Architecture Pipeline ── */
  .section-hiw {
    background: var(--bg-subtle);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .steps-pipeline {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    position: relative;
  }
  .step-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 32px 28px;
    box-shadow: var(--shadow-sm);
    position: relative;
    transition: transform 180ms var(--ease), border-color 180ms var(--ease);
  }
  .step-card:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong);
  }
  .step-index {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    margin-bottom: 16px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .step-card h3 {
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    margin-bottom: 10px;
    color: var(--fg);
  }
  .step-card p {
    color: var(--fg-muted);
    font-size: 14.5px;
    line-height: 1.55;
    margin-bottom: 18px;
  }
  .step-code {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    padding: 10px 12px;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--fg);
    overflow-x: auto;
  }

  /* ── Developer Integration Section ── */
  .integration-box {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    padding: 40px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: center;
  }
  .integration-info h3 {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
  }
  .integration-info p {
    color: var(--fg-muted);
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .endpoint-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .endpoint-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--mono);
    font-size: 12px;
    padding: 8px 12px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
  }
  .endpoint-tag {
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 10px;
  }
  .endpoint-tag.get { background: #dcfce7; color: #166534; }
  .endpoint-tag.post { background: #dbeafe; color: #1e40af; }
  .endpoint-path { color: var(--fg); font-weight: 500; }

  .integration-terminal {
    background: #0d1117;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 20px;
    overflow-x: auto;
  }
  .terminal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 11px;
    color: #8b949e;
  }

  /* ── CTA Card ── */
  .cta-section { padding: 40px 0 88px; }
  .cta-card {
    background: var(--bg-dark);
    color: #ffffff;
    border-radius: var(--radius-lg);
    padding: 64px 32px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .cta-inner { max-width: 680px; margin: 0 auto; }
  .cta-card h2 {
    font-size: clamp(1.75rem, 2.5vw + 0.5rem, 2.5rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-bottom: 14px;
    color: #ffffff;
  }
  .cta-card p {
    color: rgba(255, 255, 255, 0.75);
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 32px;
  }
  .cta-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .cta-actions .btn { min-height: 44px; padding: 0 24px; font-size: 15px; }

  /* ── Footer ── */
  footer {
    border-top: 1px solid var(--border);
    padding: 64px 0 32px;
    background: var(--bg);
  }
  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 40px;
    margin-bottom: 48px;
  }
  .footer-brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 15px;
    color: var(--fg);
    margin-bottom: 12px;
  }
  .footer-brand img { width: 24px; height: 24px; object-fit: contain; }
  .footer-tagline {
    color: var(--fg-muted);
    font-size: 13.5px;
    line-height: 1.6;
    max-width: 32ch;
    margin-bottom: 16px;
  }
  .status-indicator-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--mono);
    font-size: 12px;
    color: #10b981;
    text-decoration: none;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    transition: background 150ms var(--ease);
  }
  .status-indicator-link:hover { background: rgba(16, 185, 129, 0.14); }
  .status-indicator-link .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
  }

  footer h4 {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg);
    margin-bottom: 16px;
  }
  footer ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
  footer ul a {
    color: var(--fg-muted);
    font-size: 13.5px;
    transition: color 150ms var(--ease);
  }
  footer ul a:hover { color: var(--fg); }

  .footer-bottom {
    border-top: 1px solid var(--border);
    padding-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12.5px;
    color: var(--fg-faint);
  }

  /* ── Tablet (768px – 1024px) ── */
  @media (max-width: 1024px) {
    .container { padding: 0 20px; }
    .hero { padding: 56px 0 48px; }
    section { padding: 64px 0; }
    .bento-grid { grid-template-columns: repeat(2, 1fr); }
    .bento-card.span-2 { grid-column: span 2; }
    .integration-box { grid-template-columns: 1fr; gap: 28px; padding: 28px; }
    .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
  }

  /* ── Mobile (max-width: 768px) ── */
  @media (max-width: 768px) {
    .container { padding: 0 16px; }
    .nav-inner { height: 56px; }
    .nav-links, .nav-actions { display: none; }
    .hamburger { display: flex; }
    .mobile-drawer { inset: 56px 0 0 0; }

    .bg-canvas-wrap { height: 720px; }
    .hero { padding: 40px 0 36px; }
    .hero h1 { line-height: 1.15; margin-bottom: 16px; }
    .hero p.sub { margin-bottom: 24px; }
    .hero-actions { flex-direction: column; width: 100%; max-width: 380px; margin-left: auto; margin-right: auto; }
    .hero-actions .btn { width: 100%; }

    .window-topbar { padding: 8px 12px; }
    .window-body { padding: 14px; }
    .code-pre { font-size: 11.5px; }

    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .stats-ribbon { padding: 24px 0; }

    section { padding: 48px 0; }
    .section-head { margin-bottom: 32px; }

    .bento-grid { grid-template-columns: 1fr; gap: 16px; }
    .bento-card.span-2 { grid-column: auto; }
    .bento-card { padding: 20px; }

    .steps-pipeline { grid-template-columns: 1fr; gap: 16px; }
    .step-card { padding: 24px 20px; }

    .integration-box { padding: 20px; border-radius: var(--radius-md); }
    .cta-card { padding: 40px 20px; border-radius: var(--radius-md); }
    .cta-actions { flex-direction: column; width: 100%; max-width: 320px; margin-left: auto; margin-right: auto; }
    .cta-actions .btn { width: 100%; }

    .footer-grid { grid-template-columns: 1fr; gap: 28px; }
    .footer-bottom { flex-direction: column; align-items: flex-start; gap: 10px; }
  }

  /* ── Ultra-narrow / Smartwatch (max-width: 360px) ── */
  @media (max-width: 360px) {
    .container { padding: 0 12px; }
    .hero h1 { font-size: 1.85rem; }
    .hero p.sub { font-size: 0.95rem; }
    .stats-grid { grid-template-columns: 1fr; }
    .btn { min-height: 40px; padding: 0 14px; font-size: 13.5px; }
  }

  /* ── Reduced Motion ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
</style>
</head>
<body>

<!-- Navigation -->
<nav class="nav" aria-label="Primary Navigation">
  <div class="container nav-inner">
    <a class="brand" href="/" aria-label="Playsole One Home">
      <span class="brand-logo" aria-hidden="true"><img src="/logo.png" alt="" width="30" height="30"></span>
      <span>Playsole One</span>
    </a>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#pipeline">Architecture</a>
      <a href="#quickstart">Quickstart</a>
      <a href="/developers">Developers</a>
      <a href="/status">Status</a>
    </div>
    <div class="nav-actions">
      ${authActions}
    </div>
    <button class="hamburger" aria-label="Open mobile menu" aria-expanded="false" onclick="toggleMenu()">
      <svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  </div>
</nav>

<!-- Mobile Navigation Drawer -->
<div class="mobile-drawer" id="mobileMenu" aria-label="Mobile Navigation">
  <div class="mobile-nav-group">
    <a class="mobile-link" href="#features" onclick="closeMenu()">
      <span>Features</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </a>
    <a class="mobile-link" href="#pipeline" onclick="closeMenu()">
      <span>Architecture</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </a>
    <a class="mobile-link" href="#quickstart" onclick="closeMenu()">
      <span>Quickstart</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </a>
    <a class="mobile-link" href="/developers" onclick="closeMenu()">
      <span>Developer Docs</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </a>
    <a class="mobile-link" href="/status" onclick="closeMenu()">
      <span>Platform Status</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12L10 8L6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </a>
  </div>
  <div class="mobile-actions">
    ${mobileAuthActions}
  </div>
</div>

<main>
  <!-- Background Canvas Wrapper -->
  <div class="bg-canvas-wrap" aria-hidden="true">
    <canvas id="hero-canvas"></canvas>
  </div>

  <!-- Hero Section -->
  <section class="hero">
    <div class="container hero-inner">
      <h1>Identity infrastructure built for <span class="accent-span">modern apps</span>.</h1>
      <p class="sub">Playsole One is the unified authentication, authorization, and session layer for web applications. Standards-compliant OpenID Connect, cryptographic session cookies, and seamless single sign-on.</p>
      <div class="hero-actions">
        ${heroActions}
      </div>

      <!-- Interactive Protocol Explorer -->
      <div class="explorer-window" aria-label="Interactive Protocol Flow Visualizer">
        <div class="window-topbar">
          <div class="window-dots" aria-hidden="true">
            <span class="window-dot"></span>
            <span class="window-dot"></span>
            <span class="window-dot"></span>
          </div>
          <div class="window-tabs" role="tablist">
            <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="pane-auth" onclick="switchTab(0)">01 Authorize (PKCE)</button>
            <button class="tab-btn" role="tab" aria-selected="false" aria-controls="pane-token" onclick="switchTab(1)">02 Token Exchange</button>
            <button class="tab-btn" role="tab" aria-selected="false" aria-controls="pane-session" onclick="switchTab(2)">03 Verified Session</button>
          </div>
          <button class="copy-btn" id="copySnippetBtn" onclick="copyActiveCode()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span id="copyBtnText">Copy</span>
          </button>
        </div>
        <div class="window-body">
          <div class="tab-pane active" id="pane-auth" role="tabpanel">
            <pre class="code-pre"><span class="code-token-comment">// Step 1: Client generates S256 PKCE code_challenge and redirects</span>
<span class="code-token-method">GET</span> <span class="code-token-endpoint">https://one.playsole.xyz/authorize</span>
  ?<span class="code-token-param">response_type</span>=<span class="code-token-val">code</span>
  &amp;<span class="code-token-param">client_id</span>=<span class="code-token-val">app_prod_99f2b</span>
  &amp;<span class="code-token-param">redirect_uri</span>=<span class="code-token-val">https%3A%2F%2Fmyapp.com%2Fcallback</span>
  &amp;<span class="code-token-param">scope</span>=<span class="code-token-val">openid%20profile%20email</span>
  &amp;<span class="code-token-param">code_challenge</span>=<span class="code-token-val">E9Melhoa2OwvFrGMTJguCH5rtG6j30q_z78</span>
  &amp;<span class="code-token-param">code_challenge_method</span>=<span class="code-token-val">S256</span>
  &amp;<span class="code-token-param">state</span>=<span class="code-token-val">xyzSecureRandomState981</span></pre>
          </div>
          <div class="tab-pane" id="pane-token" role="tabpanel">
            <pre class="code-pre"><span class="code-token-comment">// Step 2: Backend exchanges code + code_verifier + client_secret for signed tokens</span>
<span class="code-token-method">POST</span> <span class="code-token-endpoint">https://one.playsole.xyz/token</span>
<span class="code-token-header">Content-Type</span>: application/x-www-form-urlencoded

<span class="code-token-param">grant_type</span>=<span class="code-token-val">authorization_code</span>&amp;
<span class="code-token-param">client_id</span>=<span class="code-token-val">app_prod_99f2b</span>&amp;
<span class="code-token-param">client_secret</span>=<span class="code-token-val">sec_prod_47e98a...</span>&amp;
<span class="code-token-param">code</span>=<span class="code-token-val">spl_ac_7f1a8c9b20e</span>&amp;
<span class="code-token-param">redirect_uri</span>=<span class="code-token-val">https://myapp.com/callback</span>&amp;
<span class="code-token-param">code_verifier</span>=<span class="code-token-val">dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk</span></pre>
          </div>
          <div class="tab-pane" id="pane-session" role="tabpanel">
            <pre class="code-pre"><span class="code-token-comment">// Step 3: Verified user claims payload &amp; HttpOnly session resolution</span>
{
  <span class="code-token-param">"sub"</span>: <span class="code-token-val">"usr_01hqz98v2"</span>,
  <span class="code-token-param">"name"</span>: <span class="code-token-val">"Alex Mercer"</span>,
  <span class="code-token-param">"email"</span>: <span class="code-token-val">"alex@playsole.xyz"</span>,
  <span class="code-token-param">"email_verified"</span>: <span class="code-token-val">true</span>,
  <span class="code-token-param">"iss"</span>: <span class="code-token-val">"https://one.playsole.xyz"</span>,
  <span class="code-token-param">"session_mode"</span>: <span class="code-token-val">"BFF_HttpOnly_SameSite_Lax"</span>,
  <span class="code-token-param">"anti_tamper_signature"</span>: <span class="code-token-val">"sha256:88d2f0...valid"</span>
}</pre>
          </div>
        </div>
        <div class="window-footer">
          <span>Standards: RFC 6749 · RFC 7636 · OpenID Connect Core 1.0</span>
          <span>Zero Token Exposure in Client JS</span>
        </div>
      </div>
    </div>
  </section>

  <!-- Metrics Ribbon -->
  <div class="stats-ribbon">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-val">RFC 7636</span>
          <span class="stat-lbl">S256 PKCE Enforcement</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">HttpOnly</span>
          <span class="stat-lbl">Zero Client Token Leaks</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">&lt; 25ms</span>
          <span class="stat-lbl">Gateway Session Resolution (P95)</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">100%</span>
          <span class="stat-lbl">OIDC Core 1.0 Compliant</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Bento Features Grid -->
  <section id="features">
    <div class="container">
      <div class="section-head">
        <span class="section-tag">Core Capabilities</span>
        <h2>Built with modern engineering standards</h2>
        <p>A unified identity suite designed from first principles: resilient, developer-first, and architecturally sound.</p>
      </div>

      <div class="bento-grid">
        <!-- Bento 1: OIDC PKCE (Span 2) -->
        <div class="bento-card span-2">
          <div>
            <div class="bento-card-head">
              <div class="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <span class="bento-badge">RFC 7636</span>
            </div>
            <div class="bento-content">
              <h3>OpenID Connect &amp; S256 PKCE</h3>
              <p>Standards-compliant OAuth 2.0 authorization code flow with SHA-256 Proof Key for Code Exchange. Protects SPAs, native mobile apps, and server-side web applications against authorization code interception attacks without client secrets.</p>
            </div>
          </div>
          <div class="bento-spec">
            <span>S256 Mandatory</span>
            <span>RS256 ID Tokens</span>
            <span>Rotating Refresh Tokens</span>
          </div>
        </div>

        <!-- Bento 2: Multi-Service SSO -->
        <div class="bento-card">
          <div>
            <div class="bento-card-head">
              <div class="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
              </div>
              <span class="bento-badge">Ecosystem SSO</span>
            </div>
            <div class="bento-content">
              <h3>Unified Single Sign-On</h3>
              <p>One verified login provides immediate, authenticated access across every service and application in the Playsole network.</p>
            </div>
          </div>
          <div class="bento-spec">
            <span>Seamless Handoff</span>
            <span>Cross-Domain Sessions</span>
          </div>
        </div>

        <!-- Bento 3: Session Security -->
        <div class="bento-card">
          <div>
            <div class="bento-card-head">
              <div class="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <span class="bento-badge">BFF Architecture</span>
            </div>
            <div class="bento-content">
              <h3>Cryptographic Session Security</h3>
              <p>Opaque, cryptographically signed HttpOnly SameSite session cookies. Sensitive access and refresh tokens stay secure on the backend gateway.</p>
            </div>
          </div>
          <div class="bento-spec">
            <span>Anti-Tamper HMAC</span>
            <span>Token Exfiltration Defense</span>
          </div>
        </div>

        <!-- Bento 4: Passwordless Magic Links -->
        <div class="bento-card">
          <div>
            <div class="bento-card-head">
              <div class="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </div>
              <span class="bento-badge">Passwordless</span>
            </div>
            <div class="bento-content">
              <h3>Magic Links &amp; OTPs</h3>
              <p>Frictionless sign-in with expiring, single-use cryptographic email magic links and time-based verification codes.</p>
            </div>
          </div>
          <div class="bento-spec">
            <span>15-Min Lifetime</span>
            <span>Single-Use Hash</span>
          </div>
        </div>

        <!-- Bento 5: User Consent & Granular Scopes -->
        <div class="bento-card">
          <div>
            <div class="bento-card-head">
              <div class="bento-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
              </div>
              <span class="bento-badge">Privacy First</span>
            </div>
            <div class="bento-content">
              <h3>Granular User Consent</h3>
              <p>Users inspect and approve specific permission scopes. Self-service management dashboard with one-click app grant revocations.</p>
            </div>
          </div>
          <div class="bento-spec">
            <span>Scope Isolation</span>
            <span>Revocable Grants</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works Pipeline -->
  <section id="pipeline" class="section-hiw">
    <div class="container">
      <div class="section-head">
        <span class="section-tag">Integration Flow</span>
        <h2>How Playsole One works</h2>
        <p>Three straightforward steps to wire your frontend or backend into unified authentication.</p>
      </div>

      <div class="steps-pipeline">
        <div class="step-card">
          <span class="step-index">01 / REDIRECT</span>
          <h3>Initiate with PKCE</h3>
          <p>Your client generates a cryptographically random code_verifier, hashes it with SHA-256, and redirects users to the authorize endpoint with scopes.</p>
          <div class="step-code" style="display:flex;align-items:center;justify-content:space-between"><span>GET /authorize?code_challenge=...</span><button type="button" class="btn-copy-mini" onclick="copySnippet(this, 'GET /authorize?code_challenge=...')" title="Copy snippet" aria-label="Copy snippet" style="background:none;border:none;cursor:pointer;color:#64748b;padding:2px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>
        </div>
        <div class="step-card">
          <span class="step-index">02 / AUTHENTICATE</span>
          <h3>Authenticate &amp; Consent</h3>
          <p>Users sign in with password or magic link, complete MFA if required, and grant application scopes on an explicit consent screen.</p>
          <div class="step-code" style="display:flex;align-items:center;justify-content:space-between"><span>POST /api/bff/login or /mfa</span><button type="button" class="btn-copy-mini" onclick="copySnippet(this, 'POST /api/bff/login')" title="Copy snippet" aria-label="Copy snippet" style="background:none;border:none;cursor:pointer;color:#64748b;padding:2px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></div>
        </div>
        <div class="step-card">
          <span class="step-index">03 / EXCHANGE</span>
          <h3>Secure Token Exchange</h3>
          <p>Playsole One redirects back with an authorization code. Your backend safely exchanges the code with the verifier for user claims and tokens.</p>
          <div class="step-code">POST /token grant_type=code</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Developer Quickstart Section -->
  <section id="quickstart">
    <div class="container">
      <div class="integration-box">
        <div class="integration-info">
          <span class="section-tag">Developer Experience</span>
          <h3>Integrate in minutes</h3>
          <p>Standard OpenID Connect discovery endpoints allow any standard OAuth 2.0 client library (Passport, NextAuth, Auth0 SDKs, or raw fetch) to integrate effortlessly.</p>
          <div class="endpoint-list">
            <div class="endpoint-item">
              <span class="endpoint-tag get">GET</span>
              <span class="endpoint-path">/.well-known/openid-configuration</span>
            </div>
            <div class="endpoint-item">
              <span class="endpoint-tag get">GET</span>
              <span class="endpoint-path">/.well-known/jwks.json</span>
            </div>
            <div class="endpoint-item">
              <span class="endpoint-tag get">GET</span>
              <span class="endpoint-path">/authorize</span>
            </div>
            <div class="endpoint-item">
              <span class="endpoint-tag post">POST</span>
              <span class="endpoint-path">/token</span>
            </div>
          </div>
        </div>
        <div class="integration-terminal">
          <div class="terminal-head">
            <span>quickstart.sh</span>
            <span>bash</span>
          </div>
          <pre class="code-pre"><span class="code-token-comment"># Discover server endpoints</span>
curl -s https://one.playsole.xyz/.well-known/openid-configuration

<span class="code-token-comment"># Fetch JWKS public keys for ID token verification</span>
curl -s https://one.playsole.xyz/.well-known/jwks.json

<span class="code-token-comment"># Check live health status</span>
curl -s https://one.playsole.xyz/health
<span class="code-token-val">{"status":"ok","service":"gateway"}</span></pre>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="cta-section">
    <div class="container">
      <div class="cta-card">
        <div class="cta-inner">
          <h2>Ready to integrate Playsole One?</h2>
          <p>${ctaBandDesc}</p>
          <div class="cta-actions">
            ${ctaActions}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<!-- Footer -->
<footer>
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><img src="/logo.png" alt="" width="24" height="24"> Playsole One</div>
        <p class="footer-tagline">Unified identity, authentication, and session infrastructure for the Playsole ecosystem.</p>
        <a href="/status" class="status-indicator-link">
          <span class="dot"></span>
          <span>All Systems Operational</span>
        </a>
      </div>
      <div>
        <h4>Product</h4>
        <ul>
          <li><a href="${isAuthed ? '/profile' : '/login?return_to=/profile'}">User Profile</a></li>
          <li><a href="${isAuthed ? '/grants' : '/login?return_to=/grants'}">Connected Apps</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pipeline">Architecture</a></li>
        </ul>
      </div>
      <div>
        <h4>Developers</h4>
        <ul>
          <li><a href="/developers">Documentation</a></li>
          <li><a href="/.well-known/openid-configuration" title="View OpenID Connect 1.0 JSON configuration metadata">OIDC Discovery</a></li>
          <li><a href="/.well-known/jwks.json">JWKS Public Keys</a></li>
          <li><a href="/status">System Status</a></li>
        </ul>
      </div>
      <div>
        <h4>Legal &amp; Trust</h4>
        <ul>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Service</a></li>
          <li><a href="/health">Health API</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; ${new Date().getFullYear()} Playsole Ltd. All rights reserved.</span>
      <span>Engineered on Playsole One BFF Infrastructure</span>
    </div>
  </div>
</footer>

<script>
/* ── Interactive Protocol Explorer Tab Switcher ── */
var currentTab = 0;
function switchTab(index) {
  currentTab = index;
  var buttons = document.querySelectorAll('.window-tabs .tab-btn');
  var panes = document.querySelectorAll('.window-body .tab-pane');
  for (var i = 0; i < buttons.length; i++) {
    var isActive = i === index;
    buttons[i].classList.toggle('active', isActive);
    buttons[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    panes[i].classList.toggle('active', isActive);
  }
}

function copyActiveCode() {
  var panes = document.querySelectorAll('.window-body .tab-pane');
  var activePane = panes[currentTab];
  if (!activePane) return;
  var text = activePane.innerText;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      var btnText = document.getElementById('copyBtnText');
      if (btnText) {
        btnText.textContent = 'Copied!';
        setTimeout(function () { btnText.textContent = 'Copy'; }, 2000);
      }
    });
  }
}

/* ── Mobile Menu Toggle ── */
function toggleMenu() {
  var btn = document.querySelector('.hamburger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  var isOpen = btn.classList.toggle('open');
  menu.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
  var btn = document.querySelector('.hamburger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.classList.remove('open');
  menu.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeMenu();
  }
});

function copySnippet(btn, text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      var oldHtml = btn.innerHTML;
      btn.innerHTML = '<span style="font-size:11px;font-weight:600;color:#059669">Copied!</span>';
      setTimeout(function() { btn.innerHTML = oldHtml; }, 1800);
    });
  }
}

/* ── Architectural Isometric Coordinate Matrix ── */
(function initAnimatedCanvas() {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var width = 0;
  var height = 0;
  var animFrameId = null;
  var isVisible = true;
  var mouse = { x: -9999, y: -9999, radius: 280, active: false };
  var startTime = Date.now();
  var pulses = [];

  function resize() {
    var rect = canvas.parentElement ? canvas.parentElement.getBoundingClientRect() : null;
    width = (rect && rect.width > 0) ? rect.width : (window.innerWidth || 1200);
    height = (rect && rect.height > 0) ? rect.height : 940;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initPulses();
  }

  function initPulses() {
    pulses = [];
    var isMobile = width < 768;
    var count = isMobile ? 8 : 22;
    for (var i = 0; i < count; i++) {
      pulses.push({
        col: Math.floor(Math.random() * (isMobile ? 16 : 30)),
        row: Math.floor(Math.random() * (isMobile ? 14 : 20)),
        progress: Math.random(),
        axis: Math.random() > 0.5 ? 'x' : 'y',
        dir: Math.random() > 0.5 ? 1 : -1,
        speed: 0.007 + Math.random() * 0.011
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    var now = Date.now();
    // Smooth tempo; gentle if reduced-motion is requested, never completely disabled
    var t = (now - startTime) * (prefersReduced ? 0.0006 : 0.0014);

    var isMobile = width < 768;
    var cols = isMobile ? 18 : 32;
    var rows = isMobile ? 16 : 22;

    var cellW = width / (cols * 0.65);
    var cellH = cellW * 0.52;

    var originX = width * 0.5;
    var originY = height * (isMobile ? 0.28 : 0.38);

    mouse.radius = isMobile ? 180 : 300;

    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        var nx = (c - cols / 2);
        var ny = (r - rows / 2);

        var px = originX + (nx - ny) * (cellW * 0.5);
        var py = originY + (nx + ny) * (cellH * 0.5);

        // Multi-frequency undulating wave
        var amp = prefersReduced ? 0.4 : 1.0;
        var elevation = (
          Math.sin(c * 0.28 + t * 1.5) * Math.cos(r * 0.32 + t * 1.1) * 20 +
          Math.sin((c + r) * 0.18 - t * 0.8) * 12 +
          Math.cos(c * 0.15 - r * 0.15 + t * 0.5) * 8
        ) * amp;

        // Interactive mouse & touch elevation
        var dx = px - mouse.x;
        var dy = py - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var mouseFactor = 0;
        if (mouse.active && dist < mouse.radius) {
          mouseFactor = (1 - dist / mouse.radius);
          elevation += Math.sin(mouseFactor * Math.PI) * (isMobile ? 24 : 36);
        }

        var screenY = py - elevation;
        // Elliptical radial fade towards outer bounds
        var distNorm = Math.sqrt((nx * nx) / (cols * cols * 0.32) + (ny * ny) / (rows * rows * 0.32));
        var alpha = Math.max(0, 1 - distNorm);

        grid[r][c] = {
          x: px,
          y: screenY,
          alpha: alpha,
          highlight: mouseFactor,
          elevation: elevation
        };
      }
    }

    // 1. Draw connecting grid lines
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var pt = grid[r][c];
        if (pt.alpha <= 0.02) continue;

        // Horizontal connecting lines
        if (c < cols - 1) {
          var right = grid[r][c + 1];
          var lineAlpha = Math.min(pt.alpha, right.alpha) * 0.22;
          var highlight = Math.max(pt.highlight, right.highlight);
          if (highlight > 0) {
            lineAlpha += highlight * 0.45;
          }
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(right.x, right.y);
          if (highlight > 0.08) {
            ctx.strokeStyle = 'rgba(0, 118, 254, ' + Math.min(0.85, lineAlpha) + ')';
            ctx.lineWidth = 1.25;
          } else {
            ctx.strokeStyle = 'rgba(15, 23, 42, ' + lineAlpha + ')';
            ctx.lineWidth = 0.85;
          }
          ctx.stroke();
        }

        // Vertical connecting lines
        if (r < rows - 1) {
          var down = grid[r + 1][c];
          var lineAlpha = Math.min(pt.alpha, down.alpha) * 0.22;
          var highlight = Math.max(pt.highlight, down.highlight);
          if (highlight > 0) {
            lineAlpha += highlight * 0.45;
          }
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(down.x, down.y);
          if (highlight > 0.08) {
            ctx.strokeStyle = 'rgba(0, 118, 254, ' + Math.min(0.85, lineAlpha) + ')';
            ctx.lineWidth = 1.25;
          } else {
            ctx.strokeStyle = 'rgba(15, 23, 42, ' + lineAlpha + ')';
            ctx.lineWidth = 0.85;
          }
          ctx.stroke();
        }
      }
    }

    // 2. Draw precision crosshairs (+) and tech nodes
    var crossSize = isMobile ? 3 : 4;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var pt = grid[r][c];
        if (pt.alpha <= 0.04) continue;

        var nodeAlpha = pt.alpha * (0.35 + pt.highlight * 0.6);
        if (pt.highlight > 0.15) {
          ctx.strokeStyle = 'rgba(0, 118, 254, ' + Math.min(0.9, nodeAlpha * 1.5) + ')';
          ctx.lineWidth = 1.4;
        } else {
          ctx.strokeStyle = 'rgba(15, 23, 42, ' + (nodeAlpha * 0.75) + ')';
          ctx.lineWidth = 0.9;
        }

        ctx.beginPath();
        ctx.moveTo(pt.x - crossSize, pt.y);
        ctx.lineTo(pt.x + crossSize, pt.y);
        ctx.moveTo(pt.x, pt.y - crossSize);
        ctx.lineTo(pt.x, pt.y + crossSize);
        ctx.stroke();

        // Glowing node dots
        if (pt.highlight > 0.2 || (c % 3 === 0 && r % 3 === 0)) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.highlight > 0.2 ? 1.8 : 1.2, 0, Math.PI * 2);
          ctx.fillStyle = pt.highlight > 0.2
            ? 'rgba(0, 118, 254, ' + Math.min(1, pt.highlight * 0.9 + 0.2) + ')'
            : 'rgba(0, 118, 254, ' + (pt.alpha * 0.5) + ')';
          ctx.fill();
        }
      }
    }

    // 3. Draw animated data packet pulses along grid lines
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      p.progress += p.speed;
      if (p.progress >= 1) {
        p.progress = 0;
        p.col = Math.floor(Math.random() * (cols - 1));
        p.row = Math.floor(Math.random() * (rows - 1));
        p.axis = Math.random() > 0.5 ? 'x' : 'y';
        p.dir = Math.random() > 0.5 ? 1 : -1;
      }

      var r1 = p.row;
      var c1 = p.col;
      var r2 = p.axis === 'y' ? Math.min(r1 + 1, rows - 1) : r1;
      var c2 = p.axis === 'x' ? Math.min(c1 + 1, cols - 1) : c1;

      var pA = grid[r1] && grid[r1][c1];
      var pB = grid[r2] && grid[r2][c2];

      if (pA && pB && pA.alpha > 0.08 && pB.alpha > 0.08) {
        var prog = p.dir === 1 ? p.progress : (1 - p.progress);
        var pulseX = pA.x + (pB.x - pA.x) * prog;
        var pulseY = pA.y + (pB.y - pA.y) * prog;
        var pulseAlpha = Math.sin(prog * Math.PI) * Math.min(pA.alpha, pB.alpha) * 0.95;

        // Outer glow halo
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 118, 254, ' + (pulseAlpha * 0.3) + ')';
        ctx.fill();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, ' + pulseAlpha + ')';
        ctx.fill();
      }
    }

    if (isVisible) {
      animFrameId = requestAnimationFrame(draw);
    }
  }

  window.addEventListener('resize', function () {
    resize();
  }, { passive: true });

  window.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', function () {
    mouse.active = false;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  window.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches[0]) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  window.addEventListener('touchend', function () {
    mouse.active = false;
  }, { passive: true });

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !animFrameId) {
        draw();
      } else if (!isVisible && animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    }, { rootMargin: '200px 0px 200px 0px' });
    observer.observe(canvas);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    } else {
      if (!animFrameId && isVisible) {
        draw();
      }
    }
  });

  resize();
  draw();
})();
</script>
</body>
</html>`;
}

export function loginPage(returnTo: string, pendingAuthId?: string, error?: string, magicLinkSent?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f8fafc">
<title>Sign in — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.9);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --danger: #ef4444;
    --danger-surface: #fef2f2;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-head: 'Plus Jakarta Sans', 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  body {
    font-family: var(--font);
    background: var(--bg-canvas);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    position: relative;
  }

  /* Atmospheric radial glow */
  body::before {
    content: '';
    position: fixed;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.09) 0%, rgba(99,102,241,0.05) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Form content — directly on page, centered & shifted up slightly ── */
  .auth-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    padding: 0 20px;
    margin-bottom: 6dvh;
    animation: authIn 0.22s var(--ease);
  }
  @keyframes authIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Brand — fixed to top left */
  .auth-brand {
    position: fixed;
    top: 28px;
    left: 32px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }
  .auth-brand img { width: 26px; height: 26px; object-fit: contain; }
  .auth-brand-name {
    font-family: var(--font-head);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  /* Heading */
  .auth-header { margin-bottom: 20px; }
  .auth-title {
    font-family: var(--font-head);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .auth-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  /* Step Progress */
  .step-progress-row {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
  }
  .step-bar {
    height: 3px;
    flex: 1;
    background: rgba(226,232,240,0.9);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }
  .step-bar-fill {
    height: 100%;
    background: var(--brand);
    border-radius: var(--radius-pill);
    transition: width 280ms var(--ease);
  }
  .step-label {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* Banners */
  .error-banner {
    background: var(--danger-surface);
    border: 1px solid rgba(239,68,68,0.22);
    color: var(--danger);
    padding: 9px 12px;
    border-radius: var(--radius-md);
    font-size: 12.5px;
    margin-bottom: 14px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
  }
  .error-banner svg { flex-shrink: 0; margin-top: 1px; }
  .success-banner {
    background: #ecfdf5;
    border: 1px solid rgba(16,185,129,0.22);
    color: #059669;
    padding: 9px 12px;
    border-radius: var(--radius-md);
    font-size: 12.5px;
    margin-bottom: 14px;
  }

  /* Step container */
  .step-container { position: relative; }
  .form-step.js-step { display: none; }
  .form-step.js-step.active { display: block; }

  /* Inputs */
  .pill-field { margin-bottom: 14px; }
  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
    letter-spacing: -0.005em;
  }
  .pill-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon-left {
    position: absolute;
    left: 12px;
    color: var(--text-muted);
    pointer-events: none;
    display: flex;
    align-items: center;
  }
  .input-icon-left svg { width: 15px; height: 15px; }
  .pill-input {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-hover);
    background: var(--surface-card);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 16px;
    padding: 0 40px 0 38px;
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .pill-input::placeholder { color: var(--text-muted); font-size: 13.5px; }
  .pill-input:hover { border-color: #94a3b8; }
  .pill-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-glow);
  }
  .input-icon-right {
    position: absolute;
    right: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    transition: color 150ms;
  }
  .input-icon-right:hover { color: var(--text-primary); }
  .input-icon-right svg { width: 16px; height: 16px; }
  .pw-toggle-btn .icon-eye-off { display: none; }
  .pw-toggle-btn.is-active .icon-eye { display: none; }
  .pw-toggle-btn.is-active .icon-eye-off { display: block; }

  /* Back Button */
  .step-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(241,245,249,0.8);
    border: 1px solid rgba(226,232,240,0.85);
    border-radius: var(--radius-pill);
    padding: 4px 11px 4px 8px;
    color: var(--text-secondary);
    font-size: 11.5px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 14px;
    transition: all 140ms var(--ease);
  }
  .step-back-btn:hover { color: var(--text-primary); border-color: var(--border-hover); background: #f1f5f9; }
  .step-back-btn svg { width: 12px; height: 12px; }

  /* Options Row */
  .options-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12.5px;
    margin-bottom: 14px;
  }
  .remember-me {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .remember-me input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--brand);
    cursor: pointer;
  }
  .forgot-link {
    color: var(--brand);
    text-decoration: none;
    font-weight: 500;
  }
  .forgot-link:hover { text-decoration: underline; }

  /* Primary Button */
  .btn-pill-primary {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--brand);
    color: #ffffff;
    border: none;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    letter-spacing: -0.01em;
    transition: background 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .btn-pill-primary:hover { background: var(--brand-hover); box-shadow: 0 4px 14px var(--brand-glow); transform: translateY(-1px); }
  .btn-pill-primary:active { transform: scale(0.985); }

  /* Magic link */
  .magic-link-row {
    text-align: center;
    margin-top: 11px;
  }
  .magic-link-btn {
    background: transparent;
    border: none;
    color: var(--brand);
    font-size: 12.5px;
    cursor: pointer;
    text-decoration: underline;
    font-family: var(--font);
    padding: 0;
  }

  /* Footer */
  .auth-footer {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(226,232,240,0.7);
  }
  .auth-footer a {
    color: var(--brand);
    text-decoration: none;
    font-weight: 600;
  }
  .auth-footer a:hover { text-decoration: underline; }

  /* Loading spinner */
  .spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 5px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }

  /* Tight mode for very small screens */
  @media (max-height: 600px) {
    .auth-wrap { margin-bottom: 0; }
    .auth-brand { top: 16px; left: 16px; }
    .auth-header { margin-bottom: 12px; }
    .auth-title { font-size: 19px; }
    .step-progress-row { margin-bottom: 12px; }
    .pill-field { margin-bottom: 10px; }
    .pill-input { height: 40px; }
    .btn-pill-primary { height: 40px; }
    .auth-footer { margin-top: 14px; padding-top: 12px; }
  }
  @media (max-width: 640px) {
    .auth-brand { top: 20px; left: 20px; }
  }
  @media (max-width: 440px) {
    .auth-wrap { padding: 0 16px; }
  }
</style>
</head>
<body>
<a class="skip-link" href="#main-content" style="position:absolute;left:-9999px;top:4px;z-index:999;padding:8px 16px;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-size:14px;text-decoration:none">Skip to main content</a>
<noscript><style>.js-step{display:block!important}#loginStep2{display:none!important}</style><p style="position:fixed;top:0;left:0;right:0;z-index:100;padding:10px 16px;background:#fffbeb;color:#92400e;font-family:sans-serif;font-size:13px;text-align:center">JavaScript is disabled. Enter your email and password to sign in.</p></noscript>

<main class="auth-wrap" id="main-content">
  <a href="/" class="auth-brand" aria-label="Playsole One Home">
    <img src="/logo.png" alt="" width="26" height="26">
    <span class="auth-brand-name">Playsole One</span>
  </a>

  <div class="auth-header">
    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-subtitle">Sign in to your Playsole identity.</p>
  </div>

  <div class="step-progress-row">
    <div class="step-bar"><div class="step-bar-fill" id="stepFill" style="width:50%"></div></div>
    <span class="step-label" id="stepText">Step 1 of 2</span>
  </div>

  ${error ? `<div class="error-banner"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${error}</div>` : ''}
  ${magicLinkSent ? `<div class="success-banner">${magicLinkSent}</div>` : ''}

  <form method="POST" action="/login" id="loginForm">
    <input type="hidden" name="return_to" value="${returnTo}">
    <input type="hidden" name="pending_auth" value="${pendingAuthId ?? ''}">

    <div class="step-container">
      <!-- Step 1: Email -->
      <div class="form-step js-step active" id="loginStep1">
        <div class="pill-field">
          <label class="field-label" for="email">Account Email</label>
          <div class="pill-input-wrapper">
            <span class="input-icon-left">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </span>
            <input type="email" id="email" name="email" class="pill-input" placeholder="you@example.com" required autofocus autocomplete="email">
          </div>
        </div>
        <button type="button" class="btn-pill-primary" id="toStep2Btn">
          <span>Continue</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>

      <!-- Step 2: Password -->
      <div class="form-step js-step" id="loginStep2">
        <button type="button" class="step-back-btn" id="backToStep1Btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span id="selectedEmailBadge">Edit identifier</span>
        </button>

        <div class="pill-field">
          <label class="field-label" for="password">Password</label>
          <div class="pill-input-wrapper">
            <span class="input-icon-left">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input type="password" id="password" name="password" class="pill-input" placeholder="\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7" required autocomplete="current-password">
            <button type="button" class="input-icon-right pw-toggle-btn" aria-label="Show password">
              <svg class="icon-eye" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              <svg class="icon-eye-off" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
            </button>
          </div>
        </div>

        <div class="options-row">
          <label class="remember-me">
            <input type="checkbox" name="remember">
            <span>Remember for 30 days</span>
          </label>
          <a href="/recovery" class="forgot-link">Forgot password?</a>
        </div>

        <button type="submit" class="btn-pill-primary" id="loginBtn">Sign in</button>
        <div class="magic-link-row">
          <button type="button" id="sendMagicLinkBtn" class="magic-link-btn">Email me a sign-in link instead</button>
        </div>
      </div>
    </div>
  </form>

  <form method="POST" action="/login/magic-link" id="magicLinkForm" style="display:none;">
    <input type="hidden" name="return_to" value="${returnTo}">
    <input type="hidden" name="pending_auth" value="${pendingAuthId ?? ''}">
    <input type="hidden" name="email" id="mlEmail">
  </form>

  <div class="auth-footer">
    Don't have an account? <a href="/register?${pendingAuthId ? `pending_auth=${pendingAuthId}&return_to=${encodeURIComponent(returnTo)}` : `return_to=${encodeURIComponent(returnTo)}`}">Create one</a>
  </div>
</main>

<script>
(function() {
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var step1 = document.getElementById('loginStep1');
  var step2 = document.getElementById('loginStep2');
  var toStep2Btn = document.getElementById('toStep2Btn');
  var backToStep1Btn = document.getElementById('backToStep1Btn');
  var selectedEmailBadge = document.getElementById('selectedEmailBadge');
  var loginForm = document.getElementById('loginForm');
  var loginBtn = document.getElementById('loginBtn');
  var stepFill = document.getElementById('stepFill');
  var stepText = document.getElementById('stepText');

  if (stepFill) stepFill.style.width = '50%';

  function goToStep2() {
    var email = emailInput.value.trim();
    if (!email || !emailInput.checkValidity()) { emailInput.reportValidity(); return; }
    selectedEmailBadge.textContent = email.length > 28 ? email.slice(0, 26) + '\u2026' : email;
    step1.classList.remove('active');
    step2.classList.add('active');
    if (stepFill) stepFill.style.width = '100%';
    if (stepText) stepText.textContent = 'Step 2 of 2: Password';
    setTimeout(function() { passwordInput.focus(); }, 150);
  }

  function goToStep1() {
    step2.classList.remove('active');
    step1.classList.add('active');
    if (stepFill) stepFill.style.width = '50%';
    if (stepText) stepText.textContent = 'Step 1 of 2: Identifier';
    setTimeout(function() { emailInput.focus(); }, 150);
  }

  if (toStep2Btn) toStep2Btn.addEventListener('click', goToStep2);
  if (backToStep1Btn) backToStep1Btn.addEventListener('click', goToStep1);
  if (emailInput) emailInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); goToStep2(); } });

  document.querySelectorAll('.pw-toggle-btn').forEach(function(toggle) {
    toggle.addEventListener('click', function() {
      var input = toggle.parentNode.querySelector('input');
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggle.classList.toggle('is-active', isHidden);
      toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  });

  function setLoading(btn, text) {
    if (btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner"></span>' + text;
  }

  var sendMagicLinkBtn = document.getElementById('sendMagicLinkBtn');
  if (sendMagicLinkBtn) {
    sendMagicLinkBtn.addEventListener('click', function() {
      var email = emailInput.value.trim();
      if (!email) { emailInput.focus(); return; }
      document.getElementById('mlEmail').value = email;
      setLoading(sendMagicLinkBtn, 'Sending link...');
      document.getElementById('magicLinkForm').submit();
    });
  }

  if (loginForm) loginForm.addEventListener('submit', function() { setLoading(loginBtn, 'Signing in...'); });

  window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function(btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
      });
    }
  });
})();
</script>
</body>
</html>`;
}

export function registerPage(returnTo: string, pendingAuthId?: string, error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f8fafc">
<title>Create account \u2014 Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.9);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --danger: #ef4444;
    --danger-surface: #fef2f2;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-head: 'Plus Jakarta Sans', 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; height: 100dvh; overflow: hidden; }
  body {
    font-family: var(--font);
    background: var(--bg-canvas);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    position: relative;
  }
  body::before {
    content: '';
    position: fixed;
    top: -220px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.09) 0%, rgba(99,102,241,0.05) 45%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .auth-wrap {
    position: relative; z-index: 1;
    width: 100%; max-width: 380px;
    padding: 0 20px;
    margin-bottom: 6dvh;
    animation: authIn 0.22s var(--ease);
  }
  @keyframes authIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .auth-brand {
    position: fixed; top: 28px; left: 32px; z-index: 10;
    display: inline-flex; align-items: center; gap: 9px; text-decoration: none;
  }
  .auth-brand img { width: 26px; height: 26px; object-fit: contain; }
  .auth-brand-name { font-family: var(--font-head); font-size: 14px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.01em; }
  .auth-header { margin-bottom: 20px; }
  .auth-title { font-family: var(--font-head); font-size: 22px; font-weight: 700; letter-spacing: -0.03em; color: var(--text-primary); margin-bottom: 4px; line-height: 1.2; }
  .auth-subtitle { font-size: 13px; color: var(--text-secondary); line-height: 1.45; }
  .step-progress-row { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
  .step-bar { height: 3px; flex: 1; background: rgba(226,232,240,0.9); border-radius: var(--radius-pill); overflow: hidden; }
  .step-bar-fill { height: 100%; background: var(--brand); border-radius: var(--radius-pill); transition: width 280ms var(--ease); }
  .step-label { font-family: var(--mono); font-size: 10px; color: var(--text-muted); white-space: nowrap; }
  .error-banner {
    background: var(--danger-surface); border: 1px solid rgba(239,68,68,0.22); color: var(--danger);
    padding: 9px 12px; border-radius: var(--radius-md); font-size: 12.5px; margin-bottom: 14px;
    display: flex; align-items: flex-start; gap: 8px; line-height: 1.4;
  }
  .error-banner svg { flex-shrink: 0; margin-top: 1px; }
  .step-container { position: relative; }
  .form-step.js-step { display: none; }
  .form-step.js-step.active { display: block; }
  .pill-field { margin-bottom: 14px; }
  .field-label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; letter-spacing: -0.005em; }
  .pill-input-wrapper { position: relative; display: flex; align-items: center; }
  .input-icon-left { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; display: flex; align-items: center; }
  .input-icon-left svg { width: 15px; height: 15px; }
  .pill-input {
    width: 100%; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--border-hover);
    background: var(--surface-card); color: var(--text-primary); font-family: var(--font); font-size: 16px;
    padding: 0 40px 0 38px; outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .pill-input::placeholder { color: var(--text-muted); font-size: 13.5px; }
  .pill-input:hover { border-color: #94a3b8; }
  .pill-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-glow); }
  .input-icon-right { position: absolute; right: 11px; color: var(--text-muted); display: flex; align-items: center; background: transparent; border: none; cursor: pointer; padding: 4px; border-radius: var(--radius-sm); transition: color 150ms; }
  .input-icon-right:hover { color: var(--text-primary); }
  .input-icon-right svg { width: 16px; height: 16px; }
  .pw-toggle-btn .icon-eye-off { display: none; }
  .pw-toggle-btn.is-active .icon-eye { display: none; }
  .pw-toggle-btn.is-active .icon-eye-off { display: block; }
  .step-back-btn { display: inline-flex; align-items: center; gap: 5px; background: rgba(241,245,249,0.8); border: 1px solid rgba(226,232,240,0.85); border-radius: var(--radius-pill); padding: 4px 11px 4px 8px; color: var(--text-secondary); font-size: 11.5px; font-weight: 500; cursor: pointer; margin-bottom: 14px; transition: all 140ms var(--ease); }
  .step-back-btn:hover { color: var(--text-primary); border-color: var(--border-hover); background: #f1f5f9; }
  .step-back-btn svg { width: 12px; height: 12px; }
  .btn-pill-primary { width: 100%; height: 44px; border-radius: var(--radius-pill); background: var(--brand); color: #fff; border: none; font-family: var(--font); font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; letter-spacing: -0.01em; transition: background 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .btn-pill-primary:hover { background: var(--brand-hover); box-shadow: 0 4px 14px var(--brand-glow); transform: translateY(-1px); }
  .btn-pill-primary:active { transform: scale(0.985); }
  .auth-footer { text-align: center; font-size: 12.5px; color: var(--text-secondary); margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(226,232,240,0.7); }
  .auth-footer a { color: var(--brand); text-decoration: none; font-weight: 600; }
  .auth-footer a:hover { text-decoration: underline; }
  .pw-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
  .pw-strength-bar { height: 3px; border-radius: var(--radius-pill); background: rgba(226,232,240,0.9); margin-top: 5px; overflow: hidden; }
  .spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 5px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }
  @media (max-height: 640px) {
    .auth-wrap { margin-bottom: 0; }
    .auth-brand { top: 16px; left: 16px; }
    .auth-header { margin-bottom: 12px; }
    .auth-title { font-size: 19px; }
    .step-progress-row { margin-bottom: 12px; }
    .pill-field { margin-bottom: 10px; }
    .pill-input { height: 40px; }
    .btn-pill-primary { height: 40px; }
    .pw-hint { display: none; }
    .auth-footer { margin-top: 12px; padding-top: 10px; }
  }
  @media (max-width: 640px) {
    .auth-brand { top: 20px; left: 20px; }
  }
  @media (max-width: 440px) {
    .auth-wrap { padding: 0 16px; }
  }
</style>
</head>
<body>
<a class="skip-link" href="#main-content" style="position:absolute;left:-9999px;top:4px;z-index:999;padding:8px 16px;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-size:14px;text-decoration:none">Skip to main content</a>

<main class="auth-wrap" id="main-content">
  <a href="/" class="auth-brand" aria-label="Playsole One Home">
    <img src="/logo.png" alt="" width="26" height="26">
    <span class="auth-brand-name">Playsole One</span>
  </a>

  <div class="auth-header">
    <h1 class="auth-title">Create account</h1>
    <p class="auth-subtitle">Join the Playsole sovereign identity ecosystem.</p>
  </div>

  <div class="step-progress-row">
    <div class="step-bar"><div class="step-bar-fill" id="regStepFill" style="width:33.33%"></div></div>
    <span class="step-label" id="regStepText">Step 1 of 3</span>
  </div>

  ${error ? `<div class="error-banner"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${error}</div>` : ''}

  <form method="POST" action="/register" id="registerForm">
    <input type="hidden" name="return_to" value="${returnTo}">
    <input type="hidden" name="pending_auth" value="${pendingAuthId ?? ''}">
    <div class="step-container">
      <!-- Step 1: Name -->
      <div class="form-step js-step active" id="regStep1">
        <div class="pill-field">
          <label class="field-label" for="name">Display Name</label>
          <div class="pill-input-wrapper">
            <span class="input-icon-left"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
            <input type="text" id="name" name="name" class="pill-input" placeholder="Alex Rivera" required autofocus autocomplete="name">
          </div>
        </div>
        <button type="button" class="btn-pill-primary" id="regToStep2Btn">
          <span>Continue</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
      <!-- Step 2: Email -->
      <div class="form-step js-step" id="regStep2">
        <button type="button" class="step-back-btn" id="regBackToStep1Btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span id="selectedNameBadge">Edit name</span>
        </button>
        <div class="pill-field">
          <label class="field-label" for="email">Email Address</label>
          <div class="pill-input-wrapper">
            <span class="input-icon-left"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></span>
            <input type="email" id="email" name="email" class="pill-input" placeholder="developer@company.com" required autocomplete="email">
          </div>
        </div>
        <button type="button" class="btn-pill-primary" id="regToStep3Btn">
          <span>Continue</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
      <!-- Step 3: Password -->
      <div class="form-step js-step" id="regStep3">
        <button type="button" class="step-back-btn" id="regBackToStep2Btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span id="selectedEmailRegBadge">Edit email</span>
        </button>
        <div class="pill-field">
          <label class="field-label" for="password">Password</label>
          <div class="pill-input-wrapper">
            <span class="input-icon-left"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <input type="password" id="password" name="password" class="pill-input" placeholder="\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7" required minlength="8" autocomplete="new-password">
            <button type="button" class="input-icon-right pw-toggle-btn" aria-label="Show password">
              <svg class="icon-eye" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              <svg class="icon-eye-off" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
            </button>
          </div>
          <p class="pw-hint">Must be at least 8 characters</p>
          <div class="pw-strength-bar"><div id="pwStrengthFill" style="height:100%;width:0%;border-radius:9999px;transition:width 200ms,background 200ms"></div></div>
          <p id="pwStrengthLabel" style="font-size:11px;color:var(--text-muted);margin-top:2px;text-align:right"></p>
        </div>
        <div class="pill-field">
          <label class="field-label" for="confirmPassword">Confirm Password</label>
          <div class="pill-input-wrapper">
            <span class="input-icon-left"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4"/><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
            <input type="password" id="confirmPassword" class="pill-input" placeholder="\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7\u00B7" required autocomplete="new-password">
          </div>
          <p id="confirmPwError" style="font-size:12px;color:var(--danger);margin-top:4px;display:none">Passwords do not match</p>
        </div>
        <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-bottom:14px;line-height:1.5">By creating an account you agree to the <a href="/terms" style="color:var(--brand);text-decoration:none;font-weight:500">Terms</a> and <a href="/privacy" style="color:var(--brand);text-decoration:none;font-weight:500">Privacy Policy</a>.</p>
        <button type="submit" class="btn-pill-primary" id="registerBtn">Create account</button>
      </div>
    </div>
  </form>

  <div class="auth-footer">
    Already have an account? <a href="/login?${pendingAuthId ? `pending_auth=${pendingAuthId}&return_to=${encodeURIComponent(returnTo)}` : `return_to=${encodeURIComponent(returnTo)}`}">Sign in</a>
  </div>
</main>

<script>
(function() {
  var nameInput = document.getElementById('name');
  var emailInput = document.getElementById('email');
  var passwordInput = document.getElementById('password');
  var regStep1 = document.getElementById('regStep1');
  var regStep2 = document.getElementById('regStep2');
  var regStep3 = document.getElementById('regStep3');
  var regToStep2Btn = document.getElementById('regToStep2Btn');
  var regToStep3Btn = document.getElementById('regToStep3Btn');
  var regBackToStep1Btn = document.getElementById('regBackToStep1Btn');
  var regBackToStep2Btn = document.getElementById('regBackToStep2Btn');
  var selectedNameBadge = document.getElementById('selectedNameBadge');
  var selectedEmailRegBadge = document.getElementById('selectedEmailRegBadge');
  var registerForm = document.getElementById('registerForm');
  var registerBtn = document.getElementById('registerBtn');
  var regStepFill = document.getElementById('regStepFill');
  var regStepText = document.getElementById('regStepText');

  function truncate(str, max) { return str && str.length > max ? str.slice(0, max - 3) + '...' : (str || ''); }

  function goToRegStep2() {
    if (!nameInput.checkValidity()) { nameInput.reportValidity(); return; }
    selectedNameBadge.textContent = truncate(nameInput.value.trim() || 'Edit name', 22);
    regStep1.classList.remove('active'); regStep2.classList.add('active');
    if (regStepFill) regStepFill.style.width = '66.66%';
    if (regStepText) regStepText.textContent = 'Step 2 of 3: Email';
    setTimeout(function() { emailInput.focus(); }, 150);
  }
  function goToRegStep3() {
    if (!emailInput.checkValidity()) { emailInput.reportValidity(); return; }
    selectedEmailRegBadge.textContent = truncate(emailInput.value.trim() || 'Edit email', 22);
    regStep2.classList.remove('active'); regStep3.classList.add('active');
    if (regStepFill) regStepFill.style.width = '100%';
    if (regStepText) regStepText.textContent = 'Step 3 of 3: Password';
    setTimeout(function() { passwordInput.focus(); }, 150);
  }
  function backToRegStep1() {
    regStep2.classList.remove('active'); regStep1.classList.add('active');
    if (regStepFill) regStepFill.style.width = '33.33%';
    if (regStepText) regStepText.textContent = 'Step 1 of 3: Name';
    setTimeout(function() { nameInput.focus(); }, 150);
  }
  function backToRegStep2() {
    regStep3.classList.remove('active'); regStep2.classList.add('active');
    if (regStepFill) regStepFill.style.width = '66.66%';
    if (regStepText) regStepText.textContent = 'Step 2 of 3: Email';
    setTimeout(function() { emailInput.focus(); }, 150);
  }

  if (regToStep2Btn) regToStep2Btn.addEventListener('click', goToRegStep2);
  if (regToStep3Btn) regToStep3Btn.addEventListener('click', goToRegStep3);
  if (regBackToStep1Btn) regBackToStep1Btn.addEventListener('click', backToRegStep1);
  if (regBackToStep2Btn) regBackToStep2Btn.addEventListener('click', backToRegStep2);
  if (nameInput) nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); goToRegStep2(); } });
  if (emailInput) emailInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); goToRegStep3(); } });

  document.querySelectorAll('.pw-toggle-btn').forEach(function(toggle) {
    toggle.addEventListener('click', function() {
      var input = toggle.parentNode.querySelector('input');
      var isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      toggle.classList.toggle('is-active', isHidden);
      toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  });

  var pwStrengthFill = document.getElementById('pwStrengthFill');
  var pwStrengthLabel = document.getElementById('pwStrengthLabel');
  var confirmPassword = document.getElementById('confirmPassword');
  var confirmPwError = document.getElementById('confirmPwError');

  function checkStrength(val) {
    var score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  }

  if (passwordInput && pwStrengthFill && pwStrengthLabel) {
    passwordInput.addEventListener('input', function() {
      var val = passwordInput.value;
      if (!val) { pwStrengthFill.style.width = '0%'; pwStrengthLabel.textContent = ''; return; }
      var score = checkStrength(val);
      if (val.length < 8) { pwStrengthFill.style.width = '25%'; pwStrengthFill.style.background = '#ef4444'; pwStrengthLabel.textContent = 'Too short'; pwStrengthLabel.style.color = '#ef4444'; }
      else if (score <= 2) { pwStrengthFill.style.width = '50%'; pwStrengthFill.style.background = '#f59e0b'; pwStrengthLabel.textContent = 'Fair'; pwStrengthLabel.style.color = '#f59e0b'; }
      else if (score === 3) { pwStrengthFill.style.width = '75%'; pwStrengthFill.style.background = '#3b82f6'; pwStrengthLabel.textContent = 'Good'; pwStrengthLabel.style.color = '#3b82f6'; }
      else { pwStrengthFill.style.width = '100%'; pwStrengthFill.style.background = '#10b981'; pwStrengthLabel.textContent = 'Strong'; pwStrengthLabel.style.color = '#10b981'; }
      if (confirmPassword && confirmPassword.value && confirmPwError) {
        confirmPwError.style.display = (confirmPassword.value === val) ? 'none' : 'block';
      }
    });
  }
  if (confirmPassword) {
    confirmPassword.addEventListener('input', function() {
      if (confirmPwError) confirmPwError.style.display = (passwordInput && confirmPassword.value === passwordInput.value) ? 'none' : 'block';
    });
  }

  function setLoading(btn, text) { if (btn.classList.contains('btn-loading')) return; btn.classList.add('btn-loading'); btn.innerHTML = '<span class="spinner"></span>' + text; }
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      if (confirmPassword && passwordInput && confirmPassword.value !== passwordInput.value) {
        e.preventDefault();
        if (confirmPwError) confirmPwError.style.display = 'block';
        confirmPassword.focus(); return;
      }
      setLoading(registerBtn, 'Creating account...');
    });
  }
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) document.querySelectorAll('.btn-loading').forEach(function(btn) { btn.disabled = false; btn.classList.remove('btn-loading'); });
  });
})();
</script>
</body>
</html>`;
}

export function magicLinkSentPage(returnTo: string, email: string, pendingAuthId?: string, devToken?: string): string {
  const safeEmail = email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>Check your email — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.18);
    --bg-canvas: #f8fafc;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border-glass: rgba(226, 232, 240, 0.85);
    --shadow-card: 0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04);
    --radius-xl: 20px;
    --radius-pill: 9999px;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-canvas);
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 16px;
    position: relative;
  }
  body::before {
    content: '';
    position: fixed;
    top: -200px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 450px;
    background: radial-gradient(circle, rgba(0,118,254,0.08) 0%, rgba(99,102,241,0.04) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .card {
    position: relative; z-index: 1;
    background: #ffffff;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-glass);
    box-shadow: var(--shadow-card);
    padding: 48px 40px;
    width: 100%;
    max-width: 440px;
    text-align: center;
    margin: auto;
    animation: cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .icon-ring {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(0, 118, 254, 0.08);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
  }
  .icon-ring svg { color: var(--brand); }
  h1 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 22px; font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    margin-bottom: 10px;
  }
  .subtitle {
    font-size: 14px; color: var(--text-secondary);
    line-height: 1.6; margin-bottom: 8px;
  }
  .email-chip {
    display: inline-block;
    background: rgba(0,118,254,0.07);
    color: var(--brand);
    font-size: 13px; font-weight: 600;
    border-radius: var(--radius-pill);
    padding: 4px 14px;
    margin-bottom: 28px;
    word-break: break-all;
  }
  .hint {
    font-size: 12px; color: var(--text-muted);
    margin-bottom: 28px;
    line-height: 1.5;
  }
  .btn-primary {
    display: block; width: 100%;
    padding: 13px 20px;
    background: var(--brand);
    color: #fff;
    border: none; border-radius: var(--radius-pill);
    font-family: 'Inter', sans-serif;
    font-size: 14px; font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
    margin-bottom: 12px;
  }
  .btn-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
  }
  .btn-primary:active { transform: scale(0.985); }
  .btn-ghost {
    display: block;
    font-size: 13px; font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    padding: 8px;
    border-radius: var(--radius-pill);
    transition: color 0.15s;
  }
  .btn-ghost:hover { color: var(--text-primary); }
  .divider {
    border: none; border-top: 1px solid var(--border-glass);
    margin: 24px 0;
  }
  ${devToken ? `.dev-token {
    background: #f8fafc; border: 1px dashed #cbd5e1;
    border-radius: 10px; padding: 12px 14px;
    font-size: 12px; color: #64748b;
    word-break: break-all; text-align: left;
    margin-bottom: 16px;
  }
  .dev-token strong { color: #475569; display: block; margin-bottom: 4px; }` : ''}
  @media (max-width: 480px) {
    body { padding: 16px 12px; }
    .card { padding: 28px 20px; border-radius: 14px; }
    h1 { font-size: 19px; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="icon-ring">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="3"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  </div>
  <h1>Check your email</h1>
  <p class="subtitle">We sent a sign-in link to</p>
  <span class="email-chip">${safeEmail}</span>
  <p class="hint">Click the link in the email to sign in. The link expires in 10 minutes.<br>Check your spam folder if you don&rsquo;t see it.</p>
  ${devToken ? `<div class="dev-token"><strong>Dev token (not shown in production)</strong>${devToken}</div>` : ''}
  <a href="/login/magic-link" id="resendLink" class="btn-primary">Resend magic link</a>
  <hr class="divider">
  <a href="/login?return_to=${encodeURIComponent(returnTo)}" class="btn-ghost">&larr; Back to sign in</a>
</div>
</body>
</html>`;
}

export function verifyEmailPage(email: string, verificationLink: string, error?: string, showOtpForm?: boolean, returnTo?: string): string {
  const hasLink = verificationLink.length > 0;
  const safeEmail = (email || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeReturnTo = (returnTo || '/profile').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeError = error ? (error.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')) : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f8fafc">
<title>Verify your email — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.9);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --danger: #ef4444;
    --danger-surface: #fef2f2;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-head: 'Plus Jakarta Sans', 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  body {
    font-family: var(--font);
    background: var(--bg-canvas);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    position: relative;
  }

  /* Atmospheric radial glow */
  body::before {
    content: '';
    position: fixed;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.09) 0%, rgba(99,102,241,0.05) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Form content — directly on page */
  .auth-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    padding: 0 20px;
    margin-bottom: 6dvh;
    animation: authIn 0.22s var(--ease);
  }
  @keyframes authIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Brand — fixed to top left */
  .auth-brand {
    position: fixed;
    top: 28px;
    left: 32px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }
  .auth-brand img { width: 26px; height: 26px; object-fit: contain; }
  .auth-brand-name {
    font-family: var(--font-head);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  /* Heading */
  .auth-header { margin-bottom: 20px; }
  .auth-title {
    font-family: var(--font-head);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .auth-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  /* Banners */
  .error-banner {
    background: var(--danger-surface);
    border: 1px solid rgba(239,68,68,0.22);
    color: var(--danger);
    padding: 9px 12px;
    border-radius: var(--radius-md);
    font-size: 12.5px;
    margin-bottom: 14px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
  }
  .error-banner svg { flex-shrink: 0; margin-top: 1px; }

  /* Inputs */
  .pill-field { margin-bottom: 14px; }
  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
    letter-spacing: -0.005em;
  }
  .pill-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .pill-input {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-hover);
    background: var(--surface-card);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 16px;
    padding: 0 14px;
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .pill-input:hover { border-color: #94a3b8; }
  .pill-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-glow);
  }
  .otp-input, .code-input.otp {
    font-family: var(--mono);
    font-size: 22px;
    letter-spacing: 6px;
    font-weight: 600;
    text-align: center;
    height: 48px;
    padding: 0 10px;
  }
  .field-hint, .otp-hint {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.4;
  }

  /* Primary Button */
  .btn-pill-primary {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--brand);
    color: #ffffff;
    border: none;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    letter-spacing: -0.01em;
    transition: background 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    text-decoration: none;
  }
  .btn-pill-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
    transform: translateY(-1px);
  }
  .btn-pill-primary:active { transform: scale(0.985); }

  /* Magic link / resend link */
  .resend-btn, .magic-link-btn {
    background: transparent;
    border: none;
    color: var(--brand);
    font-size: 12.5px;
    cursor: pointer;
    text-decoration: underline;
    font-family: var(--font);
    padding: 0;
  }

  /* Footer */
  .auth-footer {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(226,232,240,0.7);
  }
  .auth-footer a {
    color: var(--brand);
    text-decoration: none;
    font-weight: 600;
  }
  .auth-footer a:hover { text-decoration: underline; }

  /* Loading spinner */
  .spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 5px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }
  .resend-btn .spinner { border-color: rgba(0,118,254,0.2); border-top-color: var(--brand); }

  /* Small screen adjustments */
  @media (max-height: 600px) {
    .auth-wrap { margin-bottom: 0; }
    .auth-brand { top: 16px; left: 16px; }
    .auth-header { margin-bottom: 12px; }
    .auth-title { font-size: 19px; }
    .pill-field { margin-bottom: 10px; }
    .pill-input { height: 40px; }
    .btn-pill-primary { height: 40px; }
    .auth-footer { margin-top: 14px; padding-top: 12px; }
  }
  @media (max-width: 640px) {
    .auth-brand { top: 20px; left: 20px; }
  }
  @media (max-width: 440px) {
    .auth-wrap { padding: 0 16px; }
  }
</style>
</head>
<body>
<a class="skip-link" href="#main-content" style="position:absolute;left:-9999px;top:4px;z-index:999;padding:8px 16px;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-size:14px;text-decoration:none">Skip to main content</a>

<main class="auth-wrap" id="main-content">
  <a href="/" class="auth-brand" aria-label="Playsole One Home">
    <img src="/logo.png" alt="" width="26" height="26">
    <span class="auth-brand-name">Playsole One</span>
  </a>

  <div class="auth-header">
    <h1 class="auth-title">Verify your email</h1>
    <p class="auth-subtitle">${email ? `Verification code sent to <strong style="color:var(--text-primary);font-weight:600">${safeEmail}</strong>` : 'Verify your email address to access all features.'}</p>
  </div>

  ${safeError ? `<div class="error-banner"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${safeError}</div>` : ''}

  ${showOtpForm ? `
    <form method="POST" action="/verify-email/otp" id="otpForm">
      <input type="hidden" name="email" value="${safeEmail}">
      <input type="hidden" name="return_to" value="${safeReturnTo}">
      <div class="pill-field">
        <label for="otpToken" class="field-label">Verification code</label>
        <div class="pill-input-wrapper">
          <input class="pill-input otp-input code-input otp" id="otpToken" type="text" name="token" inputmode="numeric" pattern="[0-9\\s]{6,7}" maxlength="7" placeholder="000 000" autocomplete="one-time-code" required autofocus>
        </div>
        <p class="field-hint otp-hint">Enter the 6-digit code from your email</p>
      </div>
      <button type="submit" class="btn-pill-primary" id="verifyBtn">Verify</button>
    </form>
    <div style="margin-top:14px;text-align:center">
      <form method="POST" action="/verify-email/resend" id="resendForm" style="display:inline">
        <input type="hidden" name="email" value="${safeEmail}">
        <button type="submit" class="resend-btn" id="resendBtn">Resend code</button>
      </form>
    </div>
  ` : hasLink ? `
    <div style="margin: 16px 0;">
      <a class="btn-pill-primary verify-link" href="${verificationLink}">Verify email</a>
    </div>
  ` : `
    <form method="POST" action="/verify-email" id="sendVerifyForm">
      <button type="submit" class="btn-pill-primary" id="sendVerifyBtn">Send verification</button>
    </form>
  `}

  <div class="auth-footer">
    <a href="/login">&larr; Back to sign in</a>
  </div>
</main>

<script>
  function setLoading(btn, text) {
    if (!btn || btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner"></span>' + text;
  }

  var otpToken = document.getElementById('otpToken');
  if (otpToken) {
    otpToken.addEventListener('input', function() {
      var val = this.value.replace(/[^0-9]/g, '');
      if (val.length > 6) val = val.slice(0, 6);
      if (val.length > 3) {
        this.value = val.slice(0, 3) + ' ' + val.slice(3);
      } else {
        this.value = val;
      }
      if (val.length === 6) {
        var form = document.getElementById('otpForm');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        }
      }
    });
  }

  var otpForm = document.getElementById('otpForm');
  if (otpForm) {
    otpForm.addEventListener('submit', function () {
      if (otpToken) {
        otpToken.value = otpToken.value.replace(/\\s+/g, '');
      }
      setLoading(document.getElementById('verifyBtn'), 'Verifying...');
    });
  }
  var resendForm = document.getElementById('resendForm');
  if (resendForm) {
    resendForm.addEventListener('submit', function () {
      setLoading(document.getElementById('resendBtn'), 'Sending...');
    });
  }
  var sendVerifyForm = document.getElementById('sendVerifyForm');
  if (sendVerifyForm) {
    sendVerifyForm.addEventListener('submit', function () {
      setLoading(document.getElementById('sendVerifyBtn'), 'Sending...');
    });
  }
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
      });
    }
  });
</script>
</body>
</html>`;
}

export function verifyPhonePage(phone: string, error?: string, devCode?: string): string {
  const safePhone = (phone || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeError = error ? (error.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')) : undefined;
  const safeDevCode = devCode ? (devCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')) : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f8fafc">
<title>Verify your phone — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.9);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --danger: #ef4444;
    --danger-surface: #fef2f2;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-head: 'Plus Jakarta Sans', 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  body {
    font-family: var(--font);
    background: var(--bg-canvas);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    position: relative;
  }

  /* Atmospheric radial glow */
  body::before {
    content: '';
    position: fixed;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.09) 0%, rgba(99,102,241,0.05) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Form content — directly on page */
  .auth-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    padding: 0 20px;
    margin-bottom: 6dvh;
    animation: authIn 0.22s var(--ease);
  }
  @keyframes authIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Brand — fixed to top left */
  .auth-brand {
    position: fixed;
    top: 28px;
    left: 32px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }
  .auth-brand img { width: 26px; height: 26px; object-fit: contain; }
  .auth-brand-name {
    font-family: var(--font-head);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  /* Heading */
  .auth-header { margin-bottom: 20px; }
  .auth-title {
    font-family: var(--font-head);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .auth-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  /* Banners */
  .error-banner {
    background: var(--danger-surface);
    border: 1px solid rgba(239,68,68,0.22);
    color: var(--danger);
    padding: 9px 12px;
    border-radius: var(--radius-md);
    font-size: 12.5px;
    margin-bottom: 14px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
  }
  .error-banner svg { flex-shrink: 0; margin-top: 1px; }

  .dev-banner {
    background: #fffbeb;
    border: 1px solid #fef3c7;
    color: #92400e;
    padding: 9px 12px;
    border-radius: var(--radius-md);
    font-size: 12.5px;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-weight: 600;
    text-align: center;
  }

  /* Inputs */
  .pill-field { margin-bottom: 14px; }
  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
    letter-spacing: -0.005em;
  }
  .pill-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .pill-input {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-hover);
    background: var(--surface-card);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 16px;
    padding: 0 14px;
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .pill-input:hover { border-color: #94a3b8; }
  .pill-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-glow);
  }
  .code-input.otp {
    font-family: var(--mono);
    font-size: 22px;
    letter-spacing: 6px;
    font-weight: 600;
    text-align: center;
    height: 48px;
    padding: 0 10px;
  }
  .field-hint {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.4;
  }

  /* Primary Button */
  .btn-pill-primary {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--brand);
    color: #ffffff;
    border: none;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    letter-spacing: -0.01em;
    transition: background 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .btn-pill-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
    transform: translateY(-1px);
  }
  .btn-pill-primary:active { transform: scale(0.985); }

  /* Footer */
  .auth-footer {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(226,232,240,0.7);
  }
  .auth-footer a {
    color: var(--brand);
    text-decoration: none;
    font-weight: 600;
  }
  .auth-footer a:hover { text-decoration: underline; }

  /* Loading spinner */
  .spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 5px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }

  /* Small screen adjustments */
  @media (max-height: 600px) {
    .auth-wrap { margin-bottom: 0; }
    .auth-brand { top: 16px; left: 16px; }
    .auth-header { margin-bottom: 12px; }
    .auth-title { font-size: 19px; }
    .pill-field { margin-bottom: 10px; }
    .pill-input { height: 40px; }
    .btn-pill-primary { height: 40px; }
    .auth-footer { margin-top: 14px; padding-top: 12px; }
  }
  @media (max-width: 640px) {
    .auth-brand { top: 20px; left: 20px; }
  }
  @media (max-width: 440px) {
    .auth-wrap { padding: 0 16px; }
  }
</style>
</head>
<body>
<a class="skip-link" href="#main-content" style="position:absolute;left:-9999px;top:4px;z-index:999;padding:8px 16px;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-size:14px;text-decoration:none">Skip to main content</a>

<main class="auth-wrap" id="main-content">
  <a href="/" class="auth-brand" aria-label="Playsole One Home">
    <img src="/logo.png" alt="" width="26" height="26">
    <span class="auth-brand-name">Playsole One</span>
  </a>

  <div class="auth-header">
    <h1 class="auth-title">Verify your phone</h1>
    <p class="auth-subtitle">We'll text you a 6-digit verification code to confirm your number.</p>
  </div>

  ${safeError ? `<div class="error-banner"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${safeError}</div>` : ''}
  ${safeDevCode ? `<div class="dev-banner">Dev code: <strong>${safeDevCode}</strong></div>` : ''}

  <form method="POST" action="/verify-phone" id="sendPhoneForm" style="margin-bottom:14px">
    <div class="pill-field">
      <label for="phone" class="field-label">Phone number</label>
      <div class="pill-input-wrapper">
        <input class="pill-input" type="tel" id="phone" name="phone" value="${safePhone}" placeholder="+15551234567" required ${!phone ? 'autofocus' : ''}>
      </div>
    </div>
    <button type="submit" class="btn-pill-primary" id="sendPhoneBtn">Send code</button>
  </form>

  <form method="POST" action="/verify-phone/confirm" id="confirmPhoneForm">
    <div class="pill-field">
      <label for="code" class="field-label">Verification code</label>
      <div class="pill-input-wrapper">
        <input class="pill-input code-input otp" type="text" id="code" name="code" placeholder="000 000" inputmode="numeric" maxlength="7" pattern="[0-9\\s]{6,7}" required ${phone ? 'autofocus' : ''}>
      </div>
      <p class="field-hint">Enter the 6-digit code received via SMS.</p>
    </div>
    <button type="submit" class="btn-pill-primary" id="confirmPhoneBtn">Verify Code</button>
  </form>

  <div class="auth-footer">
    <a href="/profile">&larr; Back to profile</a>
  </div>
</main>

<script>
  function setLoading(btn, text) {
    if (!btn || btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner"></span>' + text;
  }

  var codeInput = document.getElementById('code');
  if (codeInput) {
    codeInput.addEventListener('input', function() {
      var val = this.value.replace(/[^0-9]/g, '');
      if (val.length > 6) val = val.slice(0, 6);
      if (val.length > 3) {
        this.value = val.slice(0, 3) + ' ' + val.slice(3);
      } else {
        this.value = val;
      }
      if (val.length === 6) {
        var form = document.getElementById('confirmPhoneForm');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        }
      }
    });
  }

  var sendForm = document.getElementById('sendPhoneForm');
  if (sendForm) {
    sendForm.addEventListener('submit', function() {
      setLoading(document.getElementById('sendPhoneBtn'), 'Sending...');
    });
  }

  var confirmForm = document.getElementById('confirmPhoneForm');
  if (confirmForm) {
    confirmForm.addEventListener('submit', function() {
      if (codeInput) codeInput.value = codeInput.value.replace(/\\s+/g, '');
      setLoading(document.getElementById('confirmPhoneBtn'), 'Verifying...');
    });
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
      });
    }
  });
</script>
</body>
</html>`;
}

export function mfaChallengePage(
  pendingMfaId: string,
  hasWebAuthn: boolean,
  hasTotp: boolean = true,
  hasBackupCodes: boolean = true,
  error?: string,
  activeMode?: 'totp' | 'webauthn' | 'backup',
): string {
  const isBackupActive = activeMode === 'backup' || Boolean(error && /backup/i.test(error)) || (!hasTotp && !hasWebAuthn && hasBackupCodes);
  const isWebAuthnActive = !isBackupActive && (activeMode === 'webauthn' || (!hasTotp && hasWebAuthn));
  const isTotpActive = !isBackupActive && !isWebAuthnActive && hasTotp;
  const safeError = error ? (error.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')) : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f8fafc">
<title>Two-Factor Authentication — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.9);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --danger: #ef4444;
    --danger-surface: #fef2f2;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-head: 'Plus Jakarta Sans', 'Inter', sans-serif;
    --mono: 'JetBrains Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  body {
    font-family: var(--font);
    background: var(--bg-canvas);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    position: relative;
  }

  /* Atmospheric radial glow */
  body::before {
    content: '';
    position: fixed;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.09) 0%, rgba(99,102,241,0.05) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* Form content — directly on page */
  .auth-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    padding: 0 20px;
    margin-bottom: 6dvh;
    animation: authIn 0.22s var(--ease);
  }
  @keyframes authIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Brand — fixed to top left */
  .auth-brand {
    position: fixed;
    top: 28px;
    left: 32px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }
  .auth-brand img { width: 26px; height: 26px; object-fit: contain; }
  .auth-brand-name {
    font-family: var(--font-head);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  /* Heading */
  .auth-header { margin-bottom: 20px; }
  .auth-title {
    font-family: var(--font-head);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 4px;
    line-height: 1.2;
  }
  .auth-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  /* Banners */
  .error-banner {
    background: var(--danger-surface);
    border: 1px solid rgba(239,68,68,0.22);
    color: var(--danger);
    padding: 9px 12px;
    border-radius: var(--radius-md);
    font-size: 12.5px;
    margin-bottom: 14px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.4;
  }
  .error-banner svg { flex-shrink: 0; margin-top: 1px; }

  /* MFA Factors Tab Switcher */
  .mfa-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    background: #f1f5f9;
    padding: 3px;
    border-radius: var(--radius-md);
  }
  .mfa-tab {
    flex: 1;
    padding: 7px 12px;
    border-radius: 7px;
    font-size: 12.5px;
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 150ms var(--ease);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: var(--font);
  }
  .mfa-tab.active {
    background: #ffffff;
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    font-weight: 600;
  }

  .mfa-panel { display: none; }
  .mfa-panel.active { display: block; }

  /* Inputs */
  .pill-field { margin-bottom: 14px; }
  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
    letter-spacing: -0.005em;
  }
  .pill-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .pill-input {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-hover);
    background: var(--surface-card);
    color: var(--text-primary);
    font-family: var(--font);
    font-size: 16px;
    padding: 0 14px;
    outline: none;
    transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
  }
  .pill-input:hover { border-color: #94a3b8; }
  .pill-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px var(--brand-glow);
  }
  .code-input.totp {
    font-family: var(--mono);
    font-size: 22px;
    letter-spacing: 6px;
    font-weight: 600;
    text-align: center;
    height: 48px;
    padding: 0 10px;
  }
  .code-input.backup {
    font-family: var(--mono);
    font-size: 15px;
    letter-spacing: 1.5px;
    font-weight: 500;
    text-align: center;
    height: 48px;
    padding: 0 14px;
  }
  .field-hint {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.4;
  }

  /* Passkey Box */
  .passkey-box {
    background: var(--surface-card);
    border: 1px dashed var(--border-hover);
    border-radius: var(--radius-lg);
    padding: 20px 16px;
    text-align: center;
    margin-bottom: 14px;
  }
  .passkey-box-icon {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-md);
    background: rgba(0, 118, 254, 0.08);
    color: var(--brand);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 10px;
  }
  .passkey-box h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--text-primary);
  }
  .passkey-box p {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
    margin-bottom: 14px;
  }

  /* Primary Button */
  .btn-pill-primary {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--brand);
    color: #ffffff;
    border: none;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    letter-spacing: -0.01em;
    transition: background 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .btn-pill-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
    transform: translateY(-1px);
  }
  .btn-pill-primary:active { transform: scale(0.985); }

  /* Secondary link buttons */
  .magic-link-btn, .link-btn {
    background: transparent;
    border: none;
    color: var(--brand);
    font-size: 12.5px;
    cursor: pointer;
    text-decoration: underline;
    font-family: var(--font);
    padding: 0;
  }

  /* Footer */
  .auth-footer {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(226,232,240,0.7);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .auth-footer a {
    color: var(--brand);
    text-decoration: none;
    font-weight: 600;
  }
  .auth-footer a:hover { text-decoration: underline; }
  .back-link {
    color: var(--text-muted) !important;
    font-size: 12px;
    font-weight: 500 !important;
  }
  .back-link:hover { color: var(--text-primary) !important; }

  /* Loading spinner */
  .spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 5px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }

  /* Small screen adjustments */
  @media (max-height: 600px) {
    .auth-wrap { margin-bottom: 0; }
    .auth-brand { top: 16px; left: 16px; }
    .auth-header { margin-bottom: 12px; }
    .auth-title { font-size: 19px; }
    .pill-field { margin-bottom: 10px; }
    .pill-input { height: 40px; }
    .btn-pill-primary { height: 40px; }
    .auth-footer { margin-top: 14px; padding-top: 12px; }
  }
  @media (max-width: 640px) {
    .auth-brand { top: 20px; left: 20px; }
  }
  @media (max-width: 440px) {
    .auth-wrap { padding: 0 16px; }
  }
</style>
</head>
<body>
<a class="skip-link" href="#main-content" style="position:absolute;left:-9999px;top:4px;z-index:999;padding:8px 16px;background:var(--brand);color:#fff;border-radius:var(--radius-sm);font-size:14px;text-decoration:none">Skip to main content</a>

<main class="auth-wrap" id="main-content">
  <a href="/" class="auth-brand" aria-label="Playsole One Home">
    <img src="/logo.png" alt="" width="26" height="26">
    <span class="auth-brand-name">Playsole One</span>
  </a>

  <div class="auth-header">
    <h1 class="auth-title">Two-factor verification</h1>
    <p class="auth-subtitle">Verify your identity with your second factor to complete sign-in.</p>
  </div>

  ${safeError ? `<div class="error-banner"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${safeError}</div>` : ''}

  ${(hasTotp && hasWebAuthn) ? `
  <div class="mfa-tabs" role="tablist" aria-label="Authentication factors" id="mfaTabs" style="${isBackupActive ? 'display:none;' : ''}">
    <button type="button" class="mfa-tab ${isTotpActive ? 'active' : ''}" id="tabTotp" role="tab" aria-selected="${isTotpActive ? 'true' : 'false'}" aria-controls="panelTotp">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      <span>Authenticator App</span>
    </button>
    <button type="button" class="mfa-tab ${isWebAuthnActive ? 'active' : ''}" id="tabWebAuthn" role="tab" aria-selected="${isWebAuthnActive ? 'true' : 'false'}" aria-controls="panelWebAuthn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
      <span>Passkey</span>
    </button>
  </div>` : ''}

  ${hasTotp ? `
  <div class="mfa-panel ${isTotpActive ? 'active' : ''}" id="panelTotp" role="tabpanel" aria-labelledby="tabTotp">
    <form method="POST" action="/mfa/challenge" id="totpForm">
      <input type="hidden" name="pending_mfa" value="${pendingMfaId}">
      <div class="pill-field">
        <label for="code" class="field-label">Authenticator Code</label>
        <div class="pill-input-wrapper">
          <input type="text" id="code" name="code" class="pill-input code-input totp" placeholder="000 000" inputmode="numeric" maxlength="7" pattern="[0-9\\s]{6,7}" autocomplete="one-time-code" required ${isTotpActive ? 'autofocus' : ''}>
        </div>
        <p class="field-hint">Enter the 6-digit code from your authenticator app.</p>
      </div>
      <button type="submit" class="btn-pill-primary" id="totpSubmitBtn">Verify Code</button>
    </form>
  </div>` : ''}

  ${hasWebAuthn ? `
  <div class="mfa-panel ${isWebAuthnActive ? 'active' : ''}" id="panelWebAuthn" role="tabpanel" aria-labelledby="tabWebAuthn">
    <div class="passkey-box">
      <div class="passkey-box-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
      </div>
      <h3>Passkey Verification</h3>
      <p>Use Touch ID, Face ID, Windows Hello, or a security key.</p>
      <button type="button" id="webauthnBtn" class="btn-pill-primary" onclick="passkey()">Verify with Passkey</button>
    </div>
  </div>` : ''}

  ${hasBackupCodes ? `
  <div class="mfa-panel ${isBackupActive ? 'active' : ''}" id="panelBackup" role="tabpanel" aria-labelledby="tabBackup">
    <form method="POST" action="/mfa/backup-code" id="backupForm">
      <input type="hidden" name="pending_mfa" value="${pendingMfaId}">
      <div class="pill-field">
        <label for="backup_code" class="field-label">Emergency Backup Code</label>
        <div class="pill-input-wrapper">
          <input type="text" id="backup_code" name="code" class="pill-input code-input backup" placeholder="12345-67890" inputmode="text" autocomplete="off" required ${isBackupActive ? 'autofocus' : ''}>
        </div>
        <p class="field-hint">Enter your 10-character emergency code.</p>
      </div>
      <button type="submit" class="btn-pill-primary" id="backupSubmitBtn">Verify Backup Code</button>
      <div style="margin-top:14px;text-align:center">
        <button type="button" class="magic-link-btn link-btn" id="backToPrimaryBtn">&larr; Return to ${hasTotp ? 'authenticator app' : 'passkey'}</button>
      </div>
    </form>
  </div>

  <div id="backupToggleWrap" style="${isBackupActive ? 'display:none;' : 'margin-top:14px;text-align:center;'}">
    <button type="button" class="magic-link-btn link-btn" id="switchToBackupBtn">
      Can't use your ${hasTotp ? 'authenticator app' : 'passkey'}? Use a backup code
    </button>
  </div>` : ''}

  <div class="auth-footer">
    <div>Lost access to your device? <a href="/recovery">Recover account</a></div>
    <div><a href="/login" class="back-link" onclick="return confirm('Cancel verification? Your current sign-in session will be reset.')">&larr; Back to sign in</a></div>
  </div>
</main>

<script>
  function setLoading(btn, text) {
    if (!btn || btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner"></span> ' + text;
  }

  function showError(msg) {
    let err = document.querySelector('.error-banner');
    if (!err) {
      err = document.createElement('div');
      err.className = 'error-banner';
      const header = document.querySelector('.auth-header');
      if (header && header.parentNode) {
        header.parentNode.insertBefore(err, header.nextSibling);
      }
    }
    err.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' + msg;
  }

  const tabTotp = document.getElementById('tabTotp');
  const tabWebAuthn = document.getElementById('tabWebAuthn');
  const panelTotp = document.getElementById('panelTotp');
  const panelWebAuthn = document.getElementById('panelWebAuthn');
  const panelBackup = document.getElementById('panelBackup');
  const switchToBackupBtn = document.getElementById('switchToBackupBtn');
  const backToPrimaryBtn = document.getElementById('backToPrimaryBtn');
  const backupToggleWrap = document.getElementById('backupToggleWrap');
  const mfaTabs = document.getElementById('mfaTabs');

  function showPanel(target) {
    [panelTotp, panelWebAuthn, panelBackup].forEach((p) => { if (p) p.classList.remove('active'); });
    if (tabTotp) { tabTotp.classList.remove('active'); tabTotp.setAttribute('aria-selected', 'false'); }
    if (tabWebAuthn) { tabWebAuthn.classList.remove('active'); tabWebAuthn.setAttribute('aria-selected', 'false'); }

    if (target === 'totp' && panelTotp) {
      panelTotp.classList.add('active');
      if (tabTotp) { tabTotp.classList.add('active'); tabTotp.setAttribute('aria-selected', 'true'); }
      if (backupToggleWrap) backupToggleWrap.style.display = 'block';
      if (mfaTabs) mfaTabs.style.display = 'flex';
      const c = document.getElementById('code');
      if (c) c.focus();
    } else if (target === 'webauthn' && panelWebAuthn) {
      panelWebAuthn.classList.add('active');
      if (tabWebAuthn) { tabWebAuthn.classList.add('active'); tabWebAuthn.setAttribute('aria-selected', 'true'); }
      if (backupToggleWrap) backupToggleWrap.style.display = 'block';
      if (mfaTabs) mfaTabs.style.display = 'flex';
    } else if (target === 'backup' && panelBackup) {
      panelBackup.classList.add('active');
      if (backupToggleWrap) backupToggleWrap.style.display = 'none';
      if (mfaTabs) mfaTabs.style.display = 'none';
      const bc = document.getElementById('backup_code');
      if (bc) bc.focus();
    }
  }

  if (tabTotp) tabTotp.addEventListener('click', () => showPanel('totp'));
  if (tabWebAuthn) tabWebAuthn.addEventListener('click', () => showPanel('webauthn'));
  if (switchToBackupBtn) switchToBackupBtn.addEventListener('click', () => showPanel('backup'));
  if (backToPrimaryBtn) backToPrimaryBtn.addEventListener('click', () => showPanel('${hasTotp ? 'totp' : 'webauthn'}'));

  // Auto-format 6-digit spaced input: "123 456"
  const codeInput = document.getElementById('code');
  if (codeInput) {
    codeInput.addEventListener('input', function(e) {
      let val = this.value.replace(/[^0-9]/g, '');
      if (val.length > 6) val = val.slice(0, 6);
      if (val.length > 3) {
        this.value = val.slice(0, 3) + ' ' + val.slice(3);
      } else {
        this.value = val;
      }
      if (val.length === 6) {
        const form = document.getElementById('totpForm');
        if (form && typeof form.requestSubmit === 'function') {
          form.requestSubmit();
        }
      }
    });
  }

  var totpForm = document.getElementById('totpForm');
  if (totpForm) {
    totpForm.addEventListener('submit', function() {
      if (codeInput) codeInput.value = codeInput.value.replace(/\\s+/g, '');
      setLoading(document.getElementById('totpSubmitBtn'), 'Verifying...');
    });
  }

  var backupForm = document.getElementById('backupForm');
  if (backupForm) {
    backupForm.addEventListener('submit', function() {
      setLoading(document.getElementById('backupSubmitBtn'), 'Verifying backup code...');
    });
  }

  const pendingMfa = ${JSON.stringify(pendingMfaId)};

  async function passkey() {
    const btn = document.getElementById('webauthnBtn');
    setLoading(btn, 'Checking passkey...');
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        throw new Error('Passkeys/WebAuthn are not supported by this browser.');
      }
      const optionsRes = await fetch('/api/mfa/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_mfa: pendingMfa }),
      });
      const options = await optionsRes.json();
      if (options.error) throw new Error(options.error_description || 'Failed to start passkey check.');
      const pk = options.publicKey || options;
      if (!pk || !pk.challenge) throw new Error('Invalid passkey challenge received.');
      const allowCredentials = (pk.allowCredentials || []).map((c) => ({
        type: c.type || 'public-key',
        id: base64UrlDecode(c.id || ''),
        transports: c.transports,
      }));
      const getOptions = {
        challenge: base64UrlDecode(pk.challenge),
        allowCredentials,
        userVerification: pk.userVerification || 'preferred',
        timeout: pk.timeout || 60000,
      };
      if (pk.rpId) {
        getOptions.rpId = pk.rpId;
      }
      const assertion = await navigator.credentials.get({
        publicKey: getOptions,
      });
      if (!assertion) throw new Error('Passkey check cancelled.');
      const authRes = await fetch('/api/mfa/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pending_mfa: pendingMfa,
          response: {
            id: assertion.id,
            rawId: base64Url(new Uint8Array(assertion.rawId)),
            type: 'public-key',
            response: {
              authenticatorData: base64Url(new Uint8Array(assertion.response.authenticatorData)),
              clientDataJSON: base64Url(new Uint8Array(assertion.response.clientDataJSON)),
              signature: base64Url(new Uint8Array(assertion.response.signature)),
              userHandle: assertion.response.userHandle ? base64Url(new Uint8Array(assertion.response.userHandle)) : undefined,
            },
            clientExtensionResults: assertion.getClientExtensionResults ? assertion.getClientExtensionResults() : {},
          },
        }),
      });
      const result = await authRes.json();
      if (!result.ok) throw new Error(result.error_description || 'Passkey verification failed.');
      window.location.href = result.redirect || '/profile';
    } catch (err) {
      const msg = err && err.message === 'NotAllowedError' ? 'Passkey cancelled.' : (err.message || 'Something went wrong.');
      showError(msg);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = 'Verify with Passkey';
      }
    }
  }

  function base64UrlDecode(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      b64url.length + (4 - b64url.length % 4) % 4, '='
    );
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function base64Url(bytes) {
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
      });
    }
  });
</script>
</body>
</html>`;
}

export function mfaSetupRequiredPage(clientId?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#f8fafc">
<title>Two-Factor Authentication Required — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.2);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-glass: rgba(226, 232, 240, 0.9);
    --border-hover: #cbd5e1;
    --text-primary: #090d16;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --radius-pill: 9999px;
    --radius-xl: 20px;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-head: 'Plus Jakarta Sans', 'Inter', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    height: 100dvh;
    overflow: hidden;
  }
  body {
    font-family: var(--font);
    background: var(--bg-canvas);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    position: relative;
  }

  body::before {
    content: '';
    position: fixed;
    top: -220px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.09) 0%, rgba(99,102,241,0.05) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .auth-wrap {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 380px;
    padding: 0 20px;
    margin-bottom: 6dvh;
    animation: authIn 0.22s var(--ease);
  }
  @keyframes authIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .auth-brand {
    position: fixed;
    top: 28px;
    left: 32px;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
  }
  .auth-brand img { width: 26px; height: 26px; object-fit: contain; }
  .auth-brand-name {
    font-family: var(--font-head);
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .auth-header { margin-bottom: 24px; }
  .auth-title {
    font-family: var(--font-head);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
    margin-bottom: 6px;
    line-height: 1.25;
  }
  .auth-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  .btn-pill-primary {
    width: 100%;
    height: 44px;
    border-radius: var(--radius-pill);
    background: var(--brand);
    color: #ffffff;
    border: none;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    letter-spacing: -0.01em;
    text-decoration: none;
    transition: background 150ms var(--ease), box-shadow 150ms var(--ease), transform 120ms var(--ease);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .btn-pill-primary:hover {
    background: var(--brand-hover);
    box-shadow: 0 4px 14px var(--brand-glow);
    transform: translateY(-1px);
  }
  .btn-pill-primary:active { transform: scale(0.985); }

  .auth-footer {
    text-align: center;
    font-size: 12.5px;
    color: var(--text-secondary);
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(226,232,240,0.7);
  }
  .auth-footer a {
    color: var(--brand);
    text-decoration: none;
    font-weight: 600;
  }
  .auth-footer a:hover { text-decoration: underline; }

  @media (max-height: 600px) {
    .auth-wrap { margin-bottom: 0; }
    .auth-brand { top: 16px; left: 16px; }
    .auth-header { margin-bottom: 14px; }
    .auth-title { font-size: 19px; }
    .btn-pill-primary { height: 40px; }
    .auth-footer { margin-top: 14px; padding-top: 12px; }
  }
  @media (max-width: 640px) {
    .auth-brand { top: 20px; left: 20px; }
  }
  @media (max-width: 440px) {
    .auth-wrap { padding: 0 16px; }
  }
</style>
</head>
<body>
<main class="auth-wrap" id="main-content">
  <a href="/" class="auth-brand" aria-label="Playsole One Home">
    <img src="/logo.png" alt="" width="26" height="26">
    <span class="auth-brand-name">Playsole One</span>
  </a>

  <div class="auth-header">
    <h1 class="auth-title">Two-factor authentication required</h1>
    <p class="auth-subtitle">This application requires multi-factor verification for your account${clientId ? ` (${clientId})` : ''}. Enable an authenticator app, passkey, or backup codes to proceed.</p>
  </div>

  <a class="btn-pill-primary" href="/dashboard?tab=security">Set up Two-Factor Authentication &rarr;</a>

  <div class="auth-footer">
    <a href="/logout">Sign out of account</a>
  </div>
</main>
</body>
</html>`;
}

export function securityPage(
  data: {
    displayName: string;
    mfaEnabled: boolean;
    mfaRequired: boolean;
    methods: Array<{ type: string; id: string; name: string; createdAt: string }>;
    backupCodes: { total: number; used: number };
    sessions: Array<{ id: string; clientId?: string; tokenType: string; deviceInfo?: Record<string, unknown>; ipAddress?: string; userAgent?: string; mfaPassed: boolean; lastSeenAt?: string; createdAt: number }>;
    devices: Array<{ id: string; label: string; userAgent?: string; ipAddress?: string; country?: string; city?: string; trusted: boolean; firstSeenAt: string; lastSeenAt: string }>;
  },
  opts: { message?: string; error?: string; totp?: { id: string; secret: string; otpauthUrl: string }; backupCodes?: string[]; alerts?: Array<{ id: string; signals: string[]; deviceLabel: string; at: number; seen: boolean }> } = {},
): string {
  const m = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleString() : '—';
  const SIGNAL_LABELS: Record<string, string> = {
    new_device: 'A new device was used to sign in',
    new_ip: 'Sign-in from a new IP address',
    new_location: 'Sign-in from a new location',
    new_city: 'Sign-in from a new city',
    impossible_travel: 'Sign-in from a location that conflicts with recent activity',
    untrusted_device: 'Sign-in from an untrusted device',
  };
  const activeAlerts = (opts.alerts ?? []).filter((a) => !a.seen);
  const alertRows = activeAlerts.map((a) => {
    const lines = a.signals.map((s) => SIGNAL_LABELS[s] ?? s).map(m).join('<br>');
    return `<li class="method"><span class="method-icon"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span><span class="method-name">${lines}<small>${m(a.deviceLabel)} &middot; ${fmtDate(new Date(a.at).toISOString())}</small></span><form method="POST" action="/security/alerts/${m(a.id)}/dismiss"><button type="submit" class="link-btn">Dismiss</button></form></li>`;
  }).join('');
  const methodRows = data.methods.map((method) => {
    const typeLabel = method.type === 'totp' ? 'Authenticator app' : method.type === 'webauthn' ? 'Passkey' : 'Backup codes';
    const icon = method.type === 'totp' ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>' : method.type === 'webauthn' ? '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    const removeAction = method.type === 'totp'
      ? `<form method="POST" action="/security/totp/${m(method.id)}/remove" style="display:inline" data-confirm="Remove this authenticator app?"><button type="submit" class="danger-link">Remove</button></form>`
      : method.type === 'webauthn'
        ? `<form method="POST" action="/security/webauthn/${m(method.id)}/remove" style="display:inline" data-confirm="Remove this passkey?"><button type="submit" class="danger-link">Remove</button></form>`
        : '';
    return `<li class="method"><span class="method-icon">${icon}</span><span class="method-name">${m(typeLabel)}<small>${m(method.name || '')}${method.createdAt ? ' — added ' + fmtDate(method.createdAt) : ''}</small></span>${removeAction}</li>`;
  }).join('');

  const sessionRows = data.sessions.map((s) => {
    const lastSeen = s.lastSeenAt ? fmtDate(s.lastSeenAt) : new Date(s.createdAt).toLocaleString();
    const rawUa = s.userAgent || (typeof s.deviceInfo?.ua === 'string' ? s.deviceInfo.ua : '');
    const ua = formatUserAgent(rawUa);
    const ip = s.ipAddress ? `${m(cleanIp(s.ipAddress))}` : '';
    const mfaBadge = s.mfaPassed ? '<span class="badge ok">MFA</span>' : '<span class="badge">no MFA</span>';
    return `<tr><td><strong title="${m(rawUa || ua)}">${m(ua)}</strong><small>${ip ? ' &middot; ' + ip : ''}</small></td><td>${m(s.clientId || 'Playsole')}</td><td>${mfaBadge}</td><td>${lastSeen}</td><td><form method="POST" action="/security/sessions/${m(s.id)}/revoke" data-confirm="Revoke this session?"><button type="submit" class="danger-link">Revoke</button></form></td></tr>`;
  }).join('');

  const deviceRows = data.devices.map((d) => {
    const where = [d.country, d.city].filter((x): x is string => Boolean(x)).map(m).join(', ');
    const label = (d.label && d.label !== 'Web browser') ? d.label : formatDeviceLabel(d.userAgent);
    const deviceIp = cleanIp(d.ipAddress);
    return `<tr><td><strong title="${m(d.userAgent || label)}">${m(label)}</strong></td><td>${m(deviceIp || '—')}<small>${where ? ' &middot; ' + where : ''}</small></td><td>${d.trusted ? '<span class="badge ok">Trusted</span>' : '<span class="badge warn">Untrusted</span>'}</td><td>${fmtDate(d.lastSeenAt)}</td><td>
      ${d.trusted
        ? `<form method="POST" action="/security/devices/${m(d.id)}/untrust" style="display:inline"><button type="submit" class="link-btn">Mark untrusted</button></form>`
        : `<form method="POST" action="/security/devices/${m(d.id)}/trust" style="display:inline"><button type="submit" class="link-btn">Trust</button></form>`}
      <form method="POST" action="/security/devices/${m(d.id)}/remove" style="display:inline" data-confirm="Forget this device?"><button type="submit" class="danger-link">Forget</button></form>
    </td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Security — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
  .topbar { background: #fff; border-bottom: 1px solid #eee; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .topbar h1 { font-size: 18px; font-weight: 600; }
  .topbar a { color: #0076FE; text-decoration: none; font-size: 14px; }
  .wrap { max-width: 860px; margin: 24px auto; padding: 0 16px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); padding: 24px; margin-bottom: 20px; }
  .card h2 { font-size: 16px; font-weight: 600; margin-bottom: 14px; }
  .card p { color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 12px; }
  .banner { padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 20px; }
  .banner.info { background: #eff6ff; color: #1d4ed8; }
  .banner.warn { background: #fffbeb; color: #92400e; }
  .banner.error { background: #fef2f2; color: #dc2626; }
  .banner.success { background: #f0fdf4; color: #15803d; }
  button { padding: 9px 14px; border-radius: 8px; font-size: 14px; cursor: pointer; }
  button.primary { background: #0076FE; color: #fff; border: none; }
  button.primary:hover { background: #0060d0; }
  button.secondary { background: #fff; color: #0076FE; border: 1px solid #0076FE; }
  button.danger-link, button.link-btn { background: none; border: none; padding: 0; font-size: 13px; cursor: pointer; }
  button.danger-link { color: #dc2626; }
  button.link-btn { color: #0076FE; }
  .methods { list-style: none; }
  .method { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f3f3f3; }
  .method:last-child { border-bottom: none; }
  .method-icon { font-size: 22px; display: inline-flex; align-items: center; }
  .method-name { flex: 1; font-size: 14px; min-width: 0; word-break: break-word; }
  .method-name small { display: block; color: #999; font-size: 12px; }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 480px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #f3f3f3; vertical-align: top; }
  th { color: #666; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  td small { display: block; color: #999; font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eee; color: #555; font-size: 11px; font-weight: 600; }
  .badge.ok { background: #dcfce7; color: #15803d; }
  .badge.warn { background: #fef3c7; color: #92400e; }
  input[type=text], input[type=number], input[type=password] { padding: 9px 11px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
  .codes { font-family: monospace; background: #f9f9f9; border: 1px dashed #ccc; border-radius: 8px; padding: 14px; margin: 10px 0; font-size: 14px; line-height: 1.9; word-break: break-all; }
  .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .secret { font-family: monospace; background: #f9f9f9; border-radius: 6px; padding: 8px 10px; font-size: 14px; word-break: break-all; }
  .hidden { display: none; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 6px; }
  .secondary .spinner { border-color: rgba(0,118,254,0.2); border-top-color: #0076FE; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }
  .modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; justify-content:center; align-items:center; padding: 16px; }
  .modal-overlay.open { display:flex; }
  .modal { background:#fff; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.15); padding:28px; max-width:400px; width:100%; text-align:center; }
  .modal h3 { font-size:16px; font-weight:600; margin-bottom:8px; color:#111; }
  .modal p { font-size:14px; color:#666; line-height:1.5; margin-bottom:20px; }
  .modal-actions { display:flex; gap:10px; justify-content:center; }
  .modal-actions button { flex:1; padding:10px 16px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; }
  .modal-cancel { background:#f3f4f6; color:#374151; }
  .modal-cancel:hover { background:#e5e7eb; }
  .modal-confirm { background:#dc2626; color:#fff; }
  .modal-confirm:hover { background:#b91c1c; }
  .modal-confirm.green { background:#16a34a; }
  .modal-confirm.green:hover { background:#15803d; }
  @media (max-width: 640px) {
    .topbar { padding: 12px 16px; }
    .wrap { padding: 0 12px; margin: 16px auto; }
    .card { padding: 18px 14px; }
    .row { flex-direction: column; align-items: stretch; }
    .row button, .row a { width: 100%; text-align: center; }
    .modal-actions { flex-direction: column-reverse; }
  }
</style>
</head>
<body>
<div class="topbar">
  <h1>Security</h1>
  <div><a href="/profile"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px"><path d="m15 18-6-6 6-6"/></svg>Profile</a> &nbsp; <a href="/logout">Sign out</a></div>
</div>
<div class="wrap">
  ${opts.message ? `<div class="banner success">${m(opts.message)}</div>` : ''}
  ${opts.error ? `<div class="banner error">${m(opts.error)}</div>` : ''}
  ${opts.totp ? `
  <div class="card">
    <h2>Add an authenticator app</h2>
    <p>Scan this QR code with your authenticator app (Google Authenticator, 1Password, etc.), then enter the 6-digit code it shows to confirm.</p>
    <div style="text-align:center;margin:16px 0">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(opts.totp.otpauthUrl)}" alt="QR Code" style="border-radius:8px;border:1px solid #eee">
    </div>
    <p style="font-size:13px;color:#666;margin-bottom:8px">Or enter this secret manually:</p>
    <div class="secret" style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <code id="totp-secret" style="flex:1;font-family:monospace;font-size:14px;user-select:all">${m(opts.totp.secret)}</code>
      <button type="button" onclick="copySecret()" style="background:none;border:1px solid #ddd;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:13px;color:#666" title="Copy secret"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Copy</button>
    </div>
    <p style="font-size:12px;color:#999;margin-bottom:16px"><a href="${m(opts.totp.otpauthUrl)}" target="_blank">Open otpauth URL</a></p>
    <p style="font-size:13px;color:#666;margin-bottom:8px">Enter the 6-digit code from your authenticator app:</p>
    <form method="POST" action="/security/totp/${m(opts.totp.id)}/verify" class="row">
      <input type="hidden" name="secret" value="${m(opts.totp.secret)}">
      <input type="hidden" name="otpauthUrl" value="${m(opts.totp.otpauthUrl)}">
      <input type="text" name="code" placeholder="6-digit code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus>
      <button type="submit" class="primary">Verify and enable</button>
      <a href="/security" class="secondary" style="text-decoration:none;padding:9px 14px;display:inline-block">Cancel</a>
    </form>
  </div>` : ''}
  ${opts.backupCodes ? `
  <div class="card">
    <h2>Backup codes</h2>
    <p>Store these somewhere safe. Each code can be used once to sign in if you lose your authenticator or passkey.</p>
    <div class="codes">${opts.backupCodes.map(m).join('<br>')}</div>
    <p style="color:#999;font-size:12px">They won't be shown again.</p>
  </div>` : ''}

  ${activeAlerts.length > 0 ? `
  <div class="card">
    <h2>Recent security activity</h2>
    <p>We noticed the following sign-ins from this account:</p>
    <ul class="methods">
      ${alertRows}
    </ul>
  </div>` : ''}

  <div class="card">
    <h2>Two-factor authentication</h2>
    <p>${data.mfaEnabled ? `Two-factor authentication is <strong>on</strong>.` : `Two-factor authentication is <strong>off</strong> — we recommend enabling it.`}
      ${data.mfaRequired ? ` <span class="badge warn">Required</span> <span style="color:#666">This account must have MFA enabled.</span>` : ''}</p>
    <ul class="methods">
      ${methodRows || '<li class="method"><span class="method-name" style="color:#999">No methods enrolled yet.</span></li>'}
    </ul>
    ${data.backupCodes.total > 0 ? `<p style="color:#999;font-size:13px;margin-top:10px">Backup codes: ${data.backupCodes.total - data.backupCodes.used} of ${data.backupCodes.total} remaining.</p>` : ''}
    <div class="row" style="margin-top:14px">
      ${data.methods.some((method) => method.type === 'totp') ? '' : '<button type="button" class="secondary" onclick="enrollTotp()">Add authenticator app</button>'}
      <button type="button" class="secondary" onclick="enrollPasskey()">Add a passkey</button>
      <button type="button" class="secondary" onclick="genBackupCodes()">Generate backup codes</button>
    </div>
  </div>

  <div class="card">
    <h2>Active sessions</h2>
    <p>Devices where you're currently signed in. Revoke any you don't recognise.</p>
    ${data.sessions.length ? `<div class="table-wrap"><table><thead><tr><th>Device</th><th>App</th><th>MFA</th><th>Last active</th><th></th></tr></thead><tbody>${sessionRows}</tbody></table></div>` : '<p style="color:#999">No active sessions.</p>'}
  </div>

  <div class="card">
    <h2>Devices</h2>
    <p>Known browsers and devices used with this account.</p>
    ${data.devices.length ? `<div class="table-wrap"><table><thead><tr><th>Device</th><th>Location</th><th>Status</th><th>Last seen</th><th></th></tr></thead><tbody>${deviceRows}</tbody></table></div>` : '<p style="color:#999">No devices recorded yet.</p>'}
  </div>
</div>
<div id="modal-overlay" class="modal-overlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h3 id="modal-title"></h3>
    <p id="modal-message"></p>
    <div class="modal-actions">
      <button class="modal-cancel" onclick="closeModal()">Cancel</button>
      <button id="modal-confirm-btn" class="modal-confirm" onclick="resolveModal(true)">Confirm</button>
    </div>
  </div>
</div>
<script>
  var _modalResolve = null;
  function showModal(title, message, opts) {
    opts = opts || {};
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    var btn = document.getElementById('modal-confirm-btn');
    btn.textContent = opts.confirmText || 'Confirm';
    btn.className = 'modal-confirm' + (opts.green ? ' green' : '');
    document.getElementById('modal-overlay').classList.add('open');
    return new Promise(function(resolve) { _modalResolve = resolve; });
  }
  function resolveModal(val) {
    document.getElementById('modal-overlay').classList.remove('open');
    if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
  }
  function closeModal() { resolveModal(false); }
  function showConfirm(title, message, opts) { return showModal(title, message, opts); }
  function showAlert(title, message) { return showModal(title, message, { confirmText: 'OK', green: true }); }

  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.getAttribute('data-confirm');
      showConfirm('Are you sure?', msg).then(function (ok) {
        if (ok) form.submit();
      });
    });
  });

  document.querySelectorAll('form:not([data-confirm])').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var btn = form.querySelector('button[type="submit"]');
      if (!btn || btn.classList.contains('btn-loading')) return;
      var text = btn.textContent;
      btn.classList.add('btn-loading');
      btn.innerHTML = '<span class="spinner"></span>' + text;
    });
  });

  async function post(url, body) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return res.json().catch(() => ({}));
  }

  function submitForm(action) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    document.body.appendChild(form);
    form.submit();
  }

  async function enrollTotp() {
    submitForm('/security/totp/begin');
  }

  async function genBackupCodes() {
    const ok = await showConfirm('Generate backup codes', 'Generate a fresh set of backup codes? This replaces any existing backup codes.');
    if (!ok) return;
    submitForm('/security/backup-codes');
  }

  async function enrollPasskey() {
    try {
      if (!window.PublicKeyCredential || !navigator.credentials) {
        await showAlert('Passkey registration', 'Passkeys/WebAuthn are not supported by this browser.');
        return;
      }
      const options = await post('/security/webauthn/register/options');
      if (options.error) { await showAlert('Passkey registration', options.error_description || 'Failed to start passkey registration.'); return; }
      const pk = options.publicKey || options;
      if (!pk || !pk.challenge || !pk.user) {
        await showAlert('Passkey registration', options.error_description || 'Failed to initialize passkey registration options.');
        return;
      }
      const createOptions = {
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
        createOptions.excludeCredentials = pk.excludeCredentials.map((c) => ({
          type: c.type || 'public-key',
          id: base64UrlDecode(c.id),
          transports: c.transports,
        }));
      }
      const cred = await navigator.credentials.create({
        publicKey: createOptions,
      });
      if (!cred) return;
      const result = await post('/security/webauthn/register', {
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
      if (result.error) { await showAlert('Passkey registration', result.error_description || 'Passkey registration failed.'); return; }
      window.location.href = '/security?message=' + encodeURIComponent('Passkey added.');
    } catch (err) {
      await showAlert('Passkey registration', err && err.message === 'NotAllowedError' ? 'Registration cancelled.' : (err.message || 'Something went wrong.'));
    }
  }

  // Fix #1: Decode Base64URL-encoded buffers correctly (see auth challenge fix above).
  function base64UrlDecode(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      b64url.length + (4 - b64url.length % 4) % 4, '='
    );
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function base64Url(bytes) {
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function copySecret() {
    const secret = document.getElementById('totp-secret');
    if (!secret) return;
    const text = secret.textContent;
    const btn = secret.nextElementSibling;
    function showCopied() {
      if (!btn) return;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Copy'; }, 1500);
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(showCopied);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showCopied();
    }
  }

  // Auto-dismiss alert banners after 5 seconds
  setTimeout(function() {
    document.querySelectorAll('.banner').forEach(function(b) {
      b.style.transition = 'opacity 0.4s ease, max-height 0.4s ease, margin 0.4s ease, padding 0.4s ease';
      b.style.opacity = '0';
      setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 450);
    });
  }, 5000);
</script>
</body>
</html>`;
}

export function recoveryRequestPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Account recovery — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 32px 16px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; width: 100%; max-width: 420px; text-align: center; margin: auto; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
  .icon { display:flex; justify-content:center; margin-bottom:16px; }
  p { color: #666; font-size: 14px; margin-bottom: 16px; line-height: 1.5; }
  label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #333; text-align: left; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; margin-bottom: 16px; }
  input:focus { outline: none; border-color: #0076FE; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
  button { width: 100%; padding: 12px; background: #0076FE; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; }
  button:hover { background: #0060d0; }
  .error { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .dev-code { background: #fffbeb; color: #92400e; padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; word-break: break-all; }
  .footer { margin-top: 24px; font-size: 13px; }
  .footer a { color: #0076FE; text-decoration: none; }
  .codes { font-family: monospace; background: #f9f9f9; border: 1px dashed #ccc; border-radius: 8px; padding: 14px; margin: 10px 0; font-size: 14px; line-height: 1.9; word-break: break-all; }
  @media (max-width: 480px) {
    body { padding: 16px 12px; }
    .card { padding: 24px 18px; border-radius: 10px; }
    h1 { font-size: 20px; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
  <h1>Account recovery</h1>
  <p>Enter the email address linked to your account and we'll send you a recovery link.</p>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/recovery" style="text-align:left">
    <label for="email">Email address</label>
    <input type="email" id="email" name="email" placeholder="you@example.com" required autofocus>
    <button type="submit">Send recovery link</button>
  </form>
  <div class="footer">
    <a href="/login">Back to sign in</a>
  </div>
</div>
</body>
</html>`;
}

export function recoveryEmailSentPage(email: string, token?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Check your email — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 32px 16px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; width: 100%; max-width: 420px; text-align: center; margin: auto; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
  .icon { display:flex; justify-content:center; margin-bottom:16px; }
  p { color: #666; font-size: 14px; margin-bottom: 16px; line-height: 1.5; }
  .dev-code { background: #fffbeb; color: #92400e; padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; word-break: break-all; }
  .footer { margin-top: 24px; font-size: 13px; }
  .footer a { color: #0076FE; text-decoration: none; }
  @media (max-width: 480px) {
    body { padding: 16px 12px; }
    .card { padding: 24px 18px; border-radius: 10px; }
    h1 { font-size: 20px; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z"/><polyline points="22,8 12,13 2,8"/></svg></div>
  <h1>Check your email</h1>
  <p>We've sent a recovery link to <strong>${email}</strong>. The link expires in 30 minutes.</p>
  ${token ? `<div class="dev-code">Dev-only recovery link: <a href="/recovery/verify?token=${encodeURIComponent(token)}">open</a></div>` : ''}
  <div class="footer">
    <a href="/recovery">Didn't get an email? Try again</a>
  </div>
</div>
</body>
</html>`;
}

export function recoveryConfirmPage(token: string, error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Reset two-factor authentication — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 32px 16px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; width: 100%; max-width: 420px; text-align: center; margin: auto; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .icon { display:flex; justify-content:center; margin-bottom:16px; }
  p { color: #666; font-size: 14px; margin-bottom: 12px; line-height: 1.5; }
  button { width: 100%; padding: 12px; background: #0076FE; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; }
  button:hover { background: #0060d0; }
  .error { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .footer { margin-top: 24px; font-size: 13px; }
  .footer a { color: #0076FE; text-decoration: none; }
  @media (max-width: 480px) {
    body { padding: 16px 12px; }
    .card { padding: 24px 18px; border-radius: 10px; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
  <h1>Reset two-factor authentication</h1>
  <p>This recovery link proves you own this account. Click below to remove your authenticator apps and passkeys. You'll get a fresh set of backup codes that you can use to sign in.</p>
  ${error ? `<div class="error">${error}</div>` : ''}
  <form method="POST" action="/recovery/reset">
    <input type="hidden" name="token" value="${token}">
    <button type="submit" onclick="this.textContent='Resetting...'">Reset two-factor authentication</button>
  </form>
  <div class="footer">
    <a href="/login">Cancel</a>
  </div>
</div>
</body>
</html>`;
}

export function recoveryResetDonePage(codes: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Recovery complete — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 32px 16px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; width: 100%; max-width: 420px; text-align: center; margin: auto; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .icon { display:flex; justify-content:center; margin-bottom:16px; }
  p { color: #666; font-size: 14px; margin-bottom: 12px; line-height: 1.5; }
  .codes { font-family: monospace; background: #f9f9f9; border: 1px dashed #ccc; border-radius: 8px; padding: 14px; margin: 10px 0; font-size: 14px; line-height: 1.9; word-break: break-all; }
  a.button { display: inline-block; width: 100%; padding: 12px; background: #0076FE; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 500; }
  a.button:hover { background: #0060d0; }
  @media (max-width: 480px) {
    body { padding: 16px 12px; }
    .card { padding: 24px 18px; border-radius: 10px; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></div>
  <h1>Recovery complete</h1>
  <p>Your two-factor methods were reset. Store these backup codes somewhere safe — each can be used once to sign in.</p>
  <div class="codes">${codes.map((c) => c.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>')}</div>
  <a class="button" href="/login">Sign in</a>
</div>
</body>
</html>`;
}

function scopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    openid: 'Sign in with your Playsole One account',
    profile: 'View your display name and avatar',
    email: 'View your email address',
    offline_access: 'Access your data when you are offline',
  };
  return descriptions[scope] ?? `Access to "${scope}" data`;
}

export function profilePage(
  profile: { displayName: string; email: string; avatarUrl?: string; locale: string; emailVerified: boolean; createdAt: string; updatedAt: string },
  error?: string,
  detectedCountry?: string,
): string {
  const userCountry = ((profile.locale && profile.locale.length === 2 && profile.locale !== 'en')
    ? profile.locale
    : (detectedCountry || 'US')).toUpperCase();
  const countryOptions = COUNTRIES.map((c) =>
    `<option value="${c.code}" ${userCountry === c.code ? 'selected' : ''}>${c.name}</option>`
  ).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Profile — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 32px 16px; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; width: 100%; max-width: 480px; margin: auto; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 24px; text-align: center; }
  label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #333; }
  input, .select-wrap { width: 100%; margin-bottom: 16px; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; font-family: inherit; }
  input:focus { outline: none; border-color: #0076FE; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
  input:disabled { background: #f9f9f9; color: #888; }
  button { width: 100%; padding: 12px; background: #0076FE; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; font-family: inherit; }
  button:hover { background: #0060d0; }
  .error { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .footer { text-align: center; margin-top: 16px; font-size: 13px; }
  .footer a { color: #0076FE; text-decoration: none; }

  .avatar-wrap { position: relative; width: 100px; height: 100px; margin: 0 auto 24px; cursor: pointer; }
  .avatar-wrap img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  .avatar-placeholder { background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #888; }
  .avatar-edit { position: absolute; inset: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity .2s; }
  .avatar-wrap:hover .avatar-edit { opacity: 1; }
  .avatar-edit svg { width: 28px; height: 28px; color: #fff; }
  #avatarInput { display: none; }

  .select-wrap { position: relative; }
  .select-wrap select { width: 100%; padding: 10px 36px 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; background: #fff; appearance: none; -webkit-appearance: none; cursor: pointer; font-family: inherit; }
  .select-wrap select:focus { outline: none; border-color: #0076FE; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
  .select-wrap .chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; width: 16px; height: 16px; color: #888; }

  .alert { padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .alert-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .alert-warning a { color: #92400e; font-weight: 600; text-decoration: underline; cursor: pointer; white-space: nowrap; }
  .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

  .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; align-items: center; justify-content: center; }
  .modal-overlay.open { display: flex; }
  .modal { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 420px; }
  .modal h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; text-align: center; }
  .crop-container { position: relative; width: 100%; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: #111; margin-bottom: 16px; }
  .crop-container img { position: absolute; top: 50%; left: 50%; max-width: none; max-height: none; cursor: grab; }
  .crop-container img.dragging { cursor: grabbing; }
  .crop-overlay { position: absolute; inset: 0; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5); pointer-events: none; }
  .crop-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .crop-controls input[type=range] { flex: 1; height: 4px; }
  .crop-controls label { font-size: 13px; color: #666; margin: 0; white-space: nowrap; }
  .modal-buttons { display: flex; gap: 12px; }
  .modal-buttons .btn-cancel { flex: 1; padding: 12px; background: #fff; color: #666; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; cursor: pointer; text-align: center; }
  .modal-buttons .btn-cancel:hover { background: #f5f5f5; }
  .modal-buttons .btn-confirm { flex: 1; padding: 12px; background: #0076FE; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center; }
  .modal-buttons .btn-confirm:hover { background: #0060d0; }
  .modal-buttons .btn-confirm:disabled { background: #a5b4fc; cursor: not-allowed; }
  .spinner { display: none; width: 20px; height: 20px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin .6s linear infinite; }
  .modal-buttons .btn-confirm.loading .spinner { display: block; }
  .modal-buttons .btn-confirm.loading span { display: none; }
  .spinner-loading { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 6px; }
  .btn-loading { pointer-events: none; opacity: 0.85; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .alert-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:200; justify-content:center; align-items:center; padding: 16px; }
  .alert-overlay.open { display:flex; }
  .alert-modal { background:#fff; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.15); padding:28px; max-width:400px; width:100%; text-align:center; }
  .alert-modal h3 { font-size:16px; font-weight:600; margin-bottom:8px; color:#111; }
  .alert-modal p { font-size:14px; color:#666; line-height:1.5; margin-bottom:20px; }
  .alert-modal button { padding:10px 32px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; background:#16a34a; color:#fff; }
  .alert-modal button:hover { background:#15803d; }
  .select-wrap select { font-size: 16px; }
  @media (max-width: 480px) {
    body { padding: 16px 12px; align-items: flex-start; }
    .card { padding: 24px 18px; border-radius: 10px; }
    h1 { font-size: 20px; margin-bottom: 18px; }
    .avatar-wrap { width: 80px; height: 80px; }
    .modal { padding: 20px 16px; }
    .modal-buttons { flex-direction: column-reverse; gap: 8px; }
    .modal-buttons .btn-cancel, .modal-buttons .btn-confirm { flex: none; width: 100%; }
  }
</style>
</head>
<body>
<div class="card">
  <h1>Profile</h1>
  ${error ? `<div class="error">${error}</div>` : ''}
  ${profile.emailVerified ? `<div class="alert alert-success">Email verified</div>` : `<div class="alert alert-warning">Email not verified — <a href="/verify-email">verify now</a></div>`}

  <div class="avatar-wrap" onclick="document.getElementById('avatarInput').click()">
    ${profile.avatarUrl ? `<img src="${profile.avatarUrl}" alt="Avatar">` : `<div class="avatar-placeholder">${profile.displayName.charAt(0).toUpperCase()}</div>`}
    <div class="avatar-edit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
    </div>
  </div>
  <input type="file" id="avatarInput" accept="image/*">

  <form method="POST" action="/profile">
    <label for="displayName">Display name</label>
    <input type="text" id="displayName" name="displayName" value="${profile.displayName}" required maxlength="128">
    <label for="email">Email</label>
    <input type="email" id="email" value="${profile.email}" disabled>
    <label for="locale">Region</label>
    <div class="select-wrap">
      <select id="locale" name="locale">
        ${countryOptions}
      </select>
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <button type="submit" id="saveProfileBtn" disabled>Save changes</button>
  </form>
  <div class="footer"><a href="/security">Security</a> · <a href="/verify-phone">Verify phone</a> · <a href="/logout">Sign out</a></div>
</div>

<div class="modal-overlay" id="cropModal">
  <div class="modal">
    <h2>Edit photo</h2>
    <div class="crop-container" id="cropContainer">
      <img id="cropImage" alt="Crop preview">
      <div class="crop-overlay"></div>
    </div>
    <div class="crop-controls">
      <label>Zoom</label>
      <input type="range" id="zoomRange" min="1" max="3" step="0.01" value="1">
    </div>
    <div class="modal-buttons">
      <button class="btn-cancel" onclick="closeCropModal()">Cancel</button>
      <button class="btn-confirm" id="confirmCropBtn" onclick="confirmCrop()"><span>Save</span><div class="spinner"></div></button>
    </div>
  </div>
</div>
<div id="alert-overlay" class="alert-overlay" onclick="if(event.target===this)this.classList.remove('open')">
  <div class="alert-modal">
    <h3 id="alert-title"></h3>
    <p id="alert-message"></p>
    <button onclick="document.getElementById('alert-overlay').classList.remove('open')">OK</button>
  </div>
</div>

<script>
function showAlert(title, message) {
  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-message').textContent = message;
  document.getElementById('alert-overlay').classList.add('open');
}
var cropState = null;

document.getElementById('avatarInput').addEventListener('change', function(e) {
  var file = e.target.files ? e.target.files[0] : null;
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      openCropModal(img, file);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function openCropModal(img, file) {
  var cropImg = document.getElementById('cropImage');
  var container = document.getElementById('cropContainer');
  var zoomRange = document.getElementById('zoomRange');

  cropImg.src = img.src;
  document.getElementById('cropModal').classList.add('open');

  requestAnimationFrame(function() {
    var contW = container.clientWidth;
    var contH = container.clientHeight;
    var baseScale = Math.max(contW / img.naturalWidth, contH / img.naturalHeight);

    cropState = {
      img: img, file: file,
      naturalW: img.naturalWidth, naturalH: img.naturalHeight,
      baseScale: baseScale, zoom: 1, dx: 0, dy: 0,
      isDragging: false, dragStartX: 0, dragStartY: 0,
      startDx: 0, startDy: 0,
      contW: contW, contH: contH
    };

    zoomRange.value = '1';
    updateCropTransform();

    cropImg.onmousedown = startDrag;
    cropImg.ontouchstart = startDragTouch;
  });
}

function updateCropTransform() {
  if (!cropState) return;
  var s = cropState.baseScale * cropState.zoom;
  var cropImg = document.getElementById('cropImage');
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
  document.getElementById('cropImage').classList.remove('dragging');
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', endDrag);
}

function endDragTouch() {
  if (!cropState) return;
  cropState.isDragging = false;
  document.getElementById('cropImage').classList.remove('dragging');
  document.removeEventListener('touchmove', onDragTouch);
  document.removeEventListener('touchend', endDragTouch);
}

document.getElementById('zoomRange').addEventListener('input', function() {
  if (!cropState) return;
  cropState.zoom = parseFloat(this.value);
  updateCropTransform();
});

function closeCropModal() {
  endDrag();
  endDragTouch();
  document.getElementById('cropModal').classList.remove('open');
  cropState = null;
  document.getElementById('avatarInput').value = '';
}

function confirmCrop() {
  if (!cropState) return;
  var btn = document.getElementById('confirmCropBtn');
  btn.classList.add('loading');

  var img = cropState.img;
  var naturalW = cropState.naturalW;
  var naturalH = cropState.naturalH;
  var baseScale = cropState.baseScale;
  var zoom = cropState.zoom;
  var dx = cropState.dx;
  var dy = cropState.dy;
  var contW = cropState.contW;
  var contH = cropState.contH;

  var scale = baseScale * zoom;
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
      btn.classList.remove('loading');
      btn.disabled = false;
      showAlert('Upload failed', 'Could not read image data.');
      return;
    }
    var fd = new FormData();
    fd.append('avatar', blob, 'avatar.jpg');

    fetch('/profile/avatar', { method: 'POST', body: fd })
      .then(async function(r) {
        if (!r.ok) {
          var errBody = await r.json().catch(function(){ return { error_description: r.status + ' ' + r.statusText }; });
          throw new Error(errBody.error_description || 'Upload failed');
        }
        return r.json();
      })
      .then(function() { window.location.reload(); })
      ['catch'](function(err) {
        console.error('Avatar upload error:', err);
        btn.classList.remove('loading');
        btn.disabled = false;
        showAlert('Upload failed', err.message);
      });
  }, 'image/jpeg', 0.9);
}

function setLoading(btn, text) {
  if (btn.classList.contains('btn-loading')) return;
  btn.classList.add('btn-loading');
  btn.innerHTML = '<span class="spinner-loading"></span>' + text;
}
// Attach change listener and submit handler to profile form
var profileForm = document.querySelector('form[action="/profile"]');
if (profileForm) {
  var saveBtn = document.getElementById('saveProfileBtn');
  var nameInput = document.getElementById('displayName');
  var localeSelect = document.getElementById('locale');

  var initialName = nameInput ? nameInput.value : '';
  var initialLocale = localeSelect ? localeSelect.value : '';

  function checkFormChanges() {
    if (!saveBtn || saveBtn.classList.contains('btn-loading')) return;
    var currentName = nameInput ? nameInput.value : '';
    var currentLocale = localeSelect ? localeSelect.value : '';
    var hasChanged = (currentName.trim() !== initialName.trim()) || (currentLocale !== initialLocale);
    saveBtn.disabled = !hasChanged;
  }

  if (nameInput) {
    nameInput.addEventListener('input', checkFormChanges);
    nameInput.addEventListener('keyup', checkFormChanges);
  }
  if (localeSelect) {
    localeSelect.addEventListener('change', checkFormChanges);
  }

  // Run initial check
  checkFormChanges();

  profileForm.addEventListener('submit', function () {
    setLoading(saveBtn, 'Saving...');
  });
}
// Reset button state when the browser navigates back (bfcache restore)
window.addEventListener('pageshow', function (e) {
  if (e.persisted) {
    document.querySelectorAll('.btn-loading').forEach(function (btn) {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
    });
    if (typeof checkFormChanges === 'function') checkFormChanges();
  }
});
</script>
</body>
</html>`;
}

export function consentManagementPage(grants: Array<{ id: string; clientId: string; scopes: string[]; grantedAt: string }>): string {
  const grantRows = grants.length === 0
    ? '<p style="color:#888;font-size:14px">No applications have been authorized yet.</p>'
    : grants.map((g, i) => `
    <div class="grant">
      <div class="grant-header">
        <span class="grant-client">${g.clientId}</span>
        <form method="POST" action="/grants/revoke/${g.id}" style="margin:0" id="revokeForm${i}">
          <button type="submit" class="btn-revoke" id="revokeBtn${i}">Revoke</button>
        </form>
      </div>
      <div class="grant-scopes">${g.scopes.filter((s) => s !== 'openid').map((s) => `<span class="scope-tag">${scopeDescriptionShort(s)}</span>`).join(' ')}</div>
      <div class="grant-date">Granted ${new Date(g.grantedAt).toLocaleDateString()}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Authorized Applications — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 40px; width: 100%; max-width: 560px; }
  h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
  .grant { border: 1px solid #eee; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .grant-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .grant-client { font-weight: 600; font-size: 15px; color: #333; }
  .grant-scopes { margin-bottom: 6px; }
  .scope-tag { display: inline-block; background: #eef2ff; color: #0076FE; font-size: 12px; padding: 2px 8px; border-radius: 4px; margin-right: 4px; }
  .grant-date { font-size: 12px; color: #999; }
  .btn-revoke { padding: 6px 14px; background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; font-size: 13px; cursor: pointer; }
  .btn-revoke:hover { background: #fecaca; }
  .btn-revoke .spinner { display: none; width: 12px; height: 12px; border: 2px solid rgba(220,38,38,0.25); border-top-color: #dc2626; border-radius: 50%; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 4px; }
  .btn-revoke.btn-loading .spinner { display: inline-block; }
  .btn-revoke.btn-loading { pointer-events: none; opacity: 0.7; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .footer { text-align: center; margin-top: 20px; font-size: 13px; }
  .footer a { color: #0076FE; text-decoration: none; margin: 0 8px; }
</style>
</head>
<body>
<div class="card">
  <h1>Authorized Applications</h1>
  <p class="subtitle">Applications with access to your account</p>
  ${grantRows}
  <div class="footer"><a href="/profile">Profile</a> · <a href="/logout">Sign out</a></div>
</div>
<script>
  function setLoading(btn, text) {
    if (btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner"></span>' + text;
  }
  // Attach loading state on each revoke form's submit event
  document.querySelectorAll('form[id^="revokeForm"]').forEach(function (form, i) {
    form.addEventListener('submit', function () {
      setLoading(document.getElementById('revokeBtn' + i), 'Revoking...');
    });
  });
  // Reset button state when the browser navigates back (bfcache restore)
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
      });
    }
  });
</script>
</body>
</html>`;
}

function scopeDescriptionShort(scope: string): string {
  const descriptions: Record<string, string> = {
    profile: 'Profile',
    email: 'Email',
    offline_access: 'Offline access',
  };
  return descriptions[scope] ?? scope;
}

export interface ConsentUserAccount {
  userId?: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

export function consentPage(
  clientId: string,
  scopes: string[],
  authorizeParams: string,
  error?: string,
  userAccount?: ConsentUserAccount,
  appName?: string,
): string {
  const safeClientId = clientId.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeAppName = (appName || clientId).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeError = error ? error.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

  const userName = userAccount?.displayName || userAccount?.email?.split('@')[0] || 'Playsole User';
  const userEmail = userAccount?.email || 'Authenticated Account';
  const userInitials = (userAccount?.displayName || userAccount?.email || 'P')
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = userAccount?.avatarUrl;

  const scopeIcons: Record<string, string> = {
    profile: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    email: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    offline_access: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>',
  };

  const scopeItems = scopes
    .filter((s) => s !== 'openid')
    .map((s) => `
      <div class="scope-row">
        <div class="scope-icon-box">
          ${scopeIcons[s] || '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'}
        </div>
        <div class="scope-text-wrap">
          <span class="scope-title">${scopeDescriptionShort(s)}</span>
          <span class="scope-detail">${scopeDescription(s)}</span>
        </div>
      </div>`)
    .join('');

  const switchAccountUrl = `/sso/chooser?client_id=${encodeURIComponent(clientId)}&return_to=${encodeURIComponent('/authorize?' + authorizeParams)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>Authorize ${safeAppName} (Third-Party App) &mdash; Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="/logo.svg">
<link rel="alternate icon" type="image/png" href="/logo.png">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --brand: #0076FE;
    --brand-hover: #0060d0;
    --brand-glow: rgba(0, 118, 254, 0.25);
    --bg-canvas: #f8fafc;
    --surface-card: #ffffff;
    --border-subtle: #e2e8f0;
    --border-focus: #93c5fd;
    --shadow-modal: 0 20px 48px -12px rgba(15, 23, 42, 0.12), 0 4px 12px 0 rgba(15, 23, 42, 0.04);
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #64748b;
    --success: #10b981;
    --radius-xl: 20px;
    --radius-pill: 9999px;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--bg-canvas);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    color: var(--text-primary);
  }
  body::before {
    content: '';
    position: fixed;
    top: -240px; left: 50%;
    transform: translateX(-50%);
    width: 1000px; height: 500px;
    background: radial-gradient(circle, rgba(0,118,254,0.08) 0%, rgba(99,102,241,0.04) 45%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .consent-card {
    position: relative;
    z-index: 1;
    background: var(--surface-card);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-subtle);
    box-shadow: var(--shadow-modal);
    padding: 36px 32px;
    width: 100%;
    max-width: 470px;
    animation: cardAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes cardAppear {
    from { opacity: 0; transform: translateY(12px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Header Branding */
  .brand-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .brand-logo-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }
  .brand-logo-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    border-radius: 8px;
  }
  .brand-name {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
    font-weight: 800;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }
  .brand-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--brand);
    background: rgba(0, 118, 254, 0.08);
    border: 1px solid rgba(0, 118, 254, 0.2);
    padding: 3px 8px;
    border-radius: var(--radius-pill);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  /* App Target Header */
  .app-banner {
    text-align: center;
    margin-bottom: 22px;
  }
  .app-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid rgba(0, 118, 254, 0.16);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 24px;
    font-weight: 800;
    color: var(--brand);
    box-shadow: 0 4px 12px rgba(0, 118, 254, 0.1);
  }
  .app-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 19px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }
  .app-subtitle {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.45;
  }
  .client-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-family: monospace;
    color: var(--text-muted);
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .third-party-pill {
    font-size: 10.5px;
    font-weight: 700;
    color: #b45309;
    background: #fef3c7;
    border: 1px solid #fde68a;
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: inline-flex;
    align-items: center;
  }
  .third-party-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 600;
    color: #b45309;
    background: #fffbeb;
    border: 1px solid #fde68a;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .app-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  /* Active Account Indicator Card */
  .account-pill {
    background: #f8fafc;
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }
  .account-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .account-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0076FE, #6366f1);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
    overflow: hidden;
  }
  .account-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .account-info {
    min-width: 0;
  }
  .account-name {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .account-email {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .switch-link {
    font-size: 12px;
    font-weight: 600;
    color: var(--brand);
    text-decoration: none;
    white-space: nowrap;
    padding-left: 8px;
  }
  .switch-link:hover {
    text-decoration: underline;
  }

  /* Permissions List */
  .section-label {
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .scopes-card {
    background: #ffffff;
    border: 1px solid var(--border-subtle);
    border-radius: 14px;
    margin-bottom: 24px;
    overflow: hidden;
  }
  .scope-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
  }
  .scope-row:last-child {
    border-bottom: none;
  }
  .scope-icon-box {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #eff6ff;
    color: var(--brand);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .scope-text-wrap {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .scope-title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .scope-detail {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* Error Alert */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    margin-bottom: 18px;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
  }
  .btn-deny {
    flex: 1;
    padding: 13px 18px;
    background: #f8fafc;
    color: var(--text-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-pill);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-deny:hover {
    background: #f1f5f9;
    color: var(--text-primary);
  }
  .btn-allow {
    flex: 1.4;
    padding: 13px 20px;
    background: var(--brand);
    color: #ffffff;
    border: none;
    border-radius: var(--radius-pill);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px var(--brand-glow);
    transition: all 0.15s ease;
  }
  .btn-allow:hover {
    background: var(--brand-hover);
    box-shadow: 0 6px 18px rgba(0, 118, 254, 0.35);
    transform: translateY(-1px);
  }
  .btn-allow:active, .btn-deny:active {
    transform: scale(0.985);
  }
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-loading { pointer-events: none; opacity: 0.85; }

  /* Footer Terms */
  .footer-note {
    text-align: center;
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 20px;
    line-height: 1.5;
  }
  .footer-note a {
    color: var(--brand);
    text-decoration: none;
    font-weight: 500;
  }
  .footer-note a:hover {
    text-decoration: underline;
  }
</style>
</head>
<body>
<div class="consent-card">
  <!-- Brand Header with Official Playsole One Logo -->
  <div class="brand-header">
    <div class="brand-logo-wrap">
      <img src="/logo.svg" alt="Playsole One Logo" class="brand-logo-img">
      <span class="brand-name">Playsole One</span>
    </div>
    <span class="brand-badge">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Secure Auth
    </span>
  </div>

  <!-- App Header -->
  <div class="app-banner">
    <div class="app-icon">${safeAppName.charAt(0).toUpperCase()}</div>
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px">
      <h1 class="app-title" style="margin-bottom:0">${safeAppName}</h1>
      <span class="third-party-pill">Third Party</span>
    </div>
    <p class="app-subtitle">A third-party application requests permission to connect to your Playsole One account</p>
    <div class="app-tags">
      <span class="third-party-badge">🌐 Third-Party Application</span>
      <span class="client-chip">client_id: ${safeClientId}</span>
    </div>
  </div>

  <!-- Active Playsole One Account Indicator -->
  <div class="account-pill">
    <div class="account-left">
      <div class="account-avatar">
        ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar">` : userInitials}
      </div>
      <div class="account-info">
        <div class="account-name">${userName}</div>
        <div class="account-email">${userEmail} &bull; Playsole One</div>
      </div>
    </div>
    <a href="${switchAccountUrl}" class="switch-link" title="Use a different Playsole account">Switch</a>
  </div>

  ${safeError ? `<div class="error-banner"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${safeError}</div>` : ''}

  <!-- Permissions Requested -->
  ${scopeItems ? `
    <div class="section-label">Permissions Requested</div>
    <div class="scopes-card">${scopeItems}</div>
  ` : ''}

  <form method="POST" action="/consent">
    <input type="hidden" name="authorize_params" value="${authorizeParams.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
    <div class="action-buttons">
      <button type="submit" name="decision" value="deny" class="btn-deny" id="denyBtn">Deny</button>
      <button type="submit" name="decision" value="allow" class="btn-allow" id="allowBtn">Allow Access</button>
    </div>
  </form>

  <p class="footer-note">
    By continuing, you authorize Playsole One to share these details with this <strong>third-party application (${safeAppName})</strong>.<br>
    You can revoke this connection anytime in <a href="/dashboard?tab=grants" target="_blank">Connected Apps</a>.
  </p>
</div>

<script>
  function setLoading(btn, text) {
    if (btn.classList.contains('btn-loading')) return;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="spinner"></span>' + text;
  }
  document.getElementById('denyBtn')?.addEventListener('click', function () {
    setLoading(this, 'Denying...');
  });
  document.getElementById('allowBtn')?.addEventListener('click', function () {
    setLoading(this, 'Authorizing...');
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.querySelectorAll('.btn-loading').forEach(function (btn) {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
      });
    }
  });
</script>
</body>
</html>`;
}

export function developersPage(_userId?: string): string {
  return renderDevelopersView();
}

function _legacyDevelopersPage(userId?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Developers — Playsole One</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #000; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  a { color: #0076FE; text-decoration: none; }
  a:hover { opacity: 0.8; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

  .nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.9); border-bottom: 1px solid rgba(0,0,0,0.08); }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 56px; }
  .brand { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 700; font-size: 15px; color: #000; }
  .brand img { height: 32px; width: auto; }
  .nav-links { display: flex; gap: 24px; }
  .nav-links a { color: #525252; font-size: 13px; font-weight: 500; }
  .nav-links a:hover { color: #000; opacity: 1; }
  .nav-links a.active { color: #0076FE; }
  .nav-actions { display: flex; gap: 10px; }
  .btn { display: inline-flex; align-items: center; min-height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: background-color 150ms, border-color 150ms, color 150ms; }
  .btn-primary { background: #0076FE; color: #fff; }
  .btn-primary:hover { background: #0060d0; opacity: 1; }
  .btn-ghost { border-color: rgba(0,0,0,0.14); color: #000; background: transparent; }
  .btn-ghost:hover { border-color: #0076FE; color: #0076FE; opacity: 1; }

  .page-header { padding: 32px 0 24px; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .page-header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .page-header p { color: #525252; font-size: 14px; max-width: 60ch; }

  .content { padding: 24px 0 48px; }
  .content h2 { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; margin: 28px 0 8px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06); }
  .content h2:first-child { margin-top: 0; border-top: none; padding-top: 0; }
  .content h3 { font-size: 0.875rem; font-weight: 600; margin: 20px 0 6px; }
  .content p { color: #525252; font-size: 13px; margin-bottom: 10px; max-width: 70ch; }
  .content ul { color: #525252; font-size: 13px; margin: 0 0 10px 20px; }
  .content li { margin-bottom: 3px; }
  .content strong { color: #000; font-weight: 600; }

  code { font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace; font-size: 11px; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
  pre { background: #0a0a0b; color: #e4e4e7; padding: 12px; border-radius: 8px; overflow-x: auto; margin: 0 0 10px; font-size: 11px; line-height: 1.5; }
  pre code { background: none; padding: 0; color: inherit; }
  .code-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; margin-bottom: 4px; display: block; }

  .endpoint { border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 12px; margin-bottom: 8px; }
  .endpoint-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .method { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; letter-spacing: 0.03em; }
  .method-get { background: #dcfce7; color: #166534; }
  .method-post { background: #dbeafe; color: #1e40af; }
  .endpoint-path { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 12px; font-weight: 600; }
  .endpoint p { font-size: 12px; margin-bottom: 0; }
  .endpoint-auth { font-size: 10px; color: #737373; margin-top: 3px; }

  table { width: 100%; border-collapse: collapse; margin: 0 0 10px; font-size: 12px; }
  th { text-align: left; font-weight: 600; padding: 6px 8px; border-bottom: 2px solid rgba(0,0,0,0.1); }
  td { padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,0.06); color: #525252; }
  tr:last-child td { border-bottom: none; }

  .docs-layout { display: grid; grid-template-columns: 150px 1fr; gap: 16px; }
  .sidebar { position: sticky; top: 72px; align-self: start; }
  .sidebar h4 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #737373; margin-bottom: 8px; }
  .sidebar a { display: block; font-size: 12px; color: #525252; padding: 2px 0; }
  .sidebar a:hover { color: #000; opacity: 1; }
  .sidebar a.active { color: #0076FE; font-weight: 700; }

  footer { padding: 24px 0 16px; border-top: 1px solid rgba(0,0,0,0.08); }
  .footer-inner { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #737373; }

  @media (max-width: 768px) {
    .nav-links { display: none; }
    .docs-layout { grid-template-columns: 1fr; gap: 24px; }
    .sidebar { position: static; display: flex; gap: 12px; flex-wrap: wrap; }
    .sidebar h4 { display: none; }
  }
</style>
</head>
<body>
<nav class="nav">
  <div class="container nav-inner">
    <a class="brand" href="/"><img src="/logo.png" alt=""> Playsole One</a>
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/developers" class="active">Developers</a>
      <a href="/status">Status</a>
    </div>
    <div class="nav-actions">
      ${navAuthActions(userId)}
    </div>
  </div>
</nav>

<div class="container">
  <div class="page-header">
    <h1>Developer Documentation</h1>
    <p>Integrate Playsole One into your application using OpenID Connect and OAuth 2.0 with PKCE.</p>
  </div>

  <div class="docs-layout">
    <aside class="sidebar">
      <h4>On this page</h4>
      <a href="#quickstart">Quick start</a>
      <a href="#endpoints">API endpoints</a>
      <a href="#oidc-flow">OIDC flow</a>
      <a href="#pkce">PKCE setup</a>
      <a href="#tokens">Tokens</a>
      <a href="#claims">Claims</a>
      <a href="#scopes">Scopes</a>
      <a href="#logout">Logout</a>
      <a href="#discovery">Discovery</a>
    </aside>

    <div class="content">
      <h2 id="quickstart">Quick start</h2>
      <p>Playsole One implements OpenID Connect (OIDC) on top of OAuth 2.0. To integrate, register your application and follow the authorization code flow with PKCE.</p>

      <span class="code-label">1. Register your application</span>
      <p>Contact the Playsole team to register your app and receive a <code>client_id</code>. Public clients use PKCE — no client secret required.</p>

      <span class="code-label">2. Redirect to authorize</span>
      <pre><code>https://one.playsole.xyz/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile email&
  state=random_state_value&
  code_challenge=YOUR_CODE_CHALLENGE&
  code_challenge_method=S256</code></pre>

      <span class="code-label">3. Handle the callback</span>
      <p>After approval, Playsole One redirects back with an authorization code:</p>
      <pre><code>https://yourapp.com/callback?code=AUTH_CODE&state=random_state_value</code></pre>

      <span class="code-label">4. Exchange code for tokens</span>
      <pre><code>POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
code_verifier=YOUR_CODE_VERIFIER</code></pre>

      <h2 id="endpoints">API endpoints</h2>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-get">GET</span>
          <span class="endpoint-path">/.well-known/openid-configuration</span>
        </div>
        <p>Returns the OIDC discovery document with all endpoint URLs and supported features.</p>
        <div class="endpoint-auth">No authentication required</div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-get">GET</span>
          <span class="endpoint-path">/.well-known/jwks.json</span>
        </div>
        <p>Returns public keys used to verify ID token signatures.</p>
        <div class="endpoint-auth">No authentication required</div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-get">GET</span>
          <span class="endpoint-path">/authorize</span>
        </div>
        <p>Starts the OAuth 2.0 authorization code flow. Redirects user to login and consent.</p>
        <div class="endpoint-auth">No authentication required (user redirected)</div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-post">POST</span>
          <span class="endpoint-path">/token</span>
        </div>
        <p>Exchange authorization code for access and ID tokens. Also supports refresh token rotation.</p>
        <div class="endpoint-auth">Client authentication (PKCE or client_secret_basic)</div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-get">GET</span>
          <span class="endpoint-path">/userinfo</span>
        </div>
        <p>Returns claims about the authenticated user.</p>
        <div class="endpoint-auth">Requires: Authorization: Bearer &lt;access_token&gt;</div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-post">POST</span>
          <span class="endpoint-path">/revoke</span>
        </div>
        <p>Revokes an access or refresh token. Use during logout.</p>
        <div class="endpoint-auth">Requires: client_id and token</div>
      </div>

      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-get">GET</span>
          <span class="endpoint-path">/health</span>
        </div>
        <p>Returns service health status.</p>
        <div class="endpoint-auth">No authentication required</div>
      </div>

      <h2 id="oidc-flow">OIDC authorization code flow</h2>
      <table>
        <thead><tr><th>Step</th><th>Action</th><th>Who</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Redirect to <code>/authorize</code> with PKCE challenge</td><td>Backend</td></tr>
          <tr><td>2</td><td>User signs in</td><td>User</td></tr>
          <tr><td>3</td><td>User approves consent</td><td>User</td></tr>
          <tr><td>4</td><td>Redirect back with authorization code</td><td>Browser</td></tr>
          <tr><td>5</td><td>Exchange code + verifier for tokens</td><td>Backend</td></tr>
          <tr><td>6</td><td>Verify ID token and create session</td><td>Backend</td></tr>
        </tbody>
      </table>

      <h2 id="pkce">PKCE setup</h2>
      <p>Playsole One requires PKCE for all public clients. This prevents authorization code interception attacks.</p>

      <span class="code-label">Node.js</span>
      <pre><code>const crypto = require('crypto');
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256')
  .update(codeVerifier).digest('base64url');</code></pre>

      <span class="code-label">Python</span>
      <pre><code>import secrets, hashlib, base64
code_verifier = secrets.token_urlsafe(32)
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode()).digest()
).rstrip(b'=').decode()</code></pre>

      <h2 id="tokens">Tokens</h2>
      <table>
        <thead><tr><th>Token</th><th>Purpose</th><th>Lifetime</th></tr></thead>
        <tbody>
          <tr><td><strong>Access token</strong></td><td>Authorize API requests</td><td>1 hour</td></tr>
          <tr><td><strong>Refresh token</strong></td><td>Obtain new access tokens</td><td>30 days</td></tr>
        </tbody>
      </table>
      <p>ID tokens are JWTs signed with RS256. Verify using keys from <code>/.well-known/jwks.json</code>.</p>

      <span class="code-label">Refresh token</span>
      <pre><code>POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=YOUR_REFRESH_TOKEN&
client_id=YOUR_CLIENT_ID</code></pre>

      <h2 id="claims">Claims</h2>
      <table>
        <thead><tr><th>Claim</th><th>Description</th><th>Requires</th></tr></thead>
        <tbody>
          <tr><td><code>sub</code></td><td>Unique user identifier</td><td>Always present</td></tr>
          <tr><td><code>name</code></td><td>Display name</td><td><code>profile</code> scope</td></tr>
          <tr><td><code>email</code></td><td>Email address</td><td><code>email</code> scope</td></tr>
          <tr><td><code>locale</code></td><td>Language preference</td><td><code>profile</code> scope</td></tr>
        </tbody>
      </table>

      <h2 id="scopes">Scopes</h2>
      <table>
        <thead><tr><th>Scope</th><th>Access granted</th></tr></thead>
        <tbody>
          <tr><td><code>openid</code></td><td>Required. Returns an ID token.</td></tr>
          <tr><td><code>profile</code></td><td>Display name and avatar.</td></tr>
          <tr><td><code>email</code></td><td>Email address.</td></tr>
          <tr><td><code>offline_access</code></td><td>Refresh token for long-lived access.</td></tr>
        </tbody>
      </table>

      <h2 id="logout">Logout</h2>
      <pre><code>// 1. Revoke the refresh token
POST /revoke
Content-Type: application/x-www-form-urlencoded
token=REFRESH_TOKEN&client_id=YOUR_CLIENT_ID

// 2. Clear your local session</code></pre>

      <h2 id="discovery">Discovery document</h2>
      <p>Full OIDC discovery document at <code>/.well-known/openid-configuration</code>:</p>
      <pre><code>{
  "issuer": "https://one.playsole.xyz",
  "authorization_endpoint": "https://one.playsole.xyz/authorize",
  "token_endpoint": "https://one.playsole.xyz/token",
  "revocation_endpoint": "https://one.playsole.xyz/revoke",
  "userinfo_endpoint": "https://one.playsole.xyz/userinfo",
  "jwks_uri": "https://one.playsole.xyz/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "claims_supported": ["sub", "name", "email", "locale"],
  "id_token_signing_alg_values_supported": ["RS256"]
}</code></pre>

      <h3>Need help?</h3>
      <p>Contact us at <a href="mailto:developers@playsole.xyz">developers@playsole.xyz</a>.</p>
    </div>
  </div>
</div>

<footer>
  <div class="container footer-inner">
    <span>&copy; 2026 Playsole</span>
    <span><a href="/">Home</a> &middot; <a href="/developers">Developers</a> &middot; <a href="/status">Status</a></span>
  </div>
</footer>
<script defer>
(function () {
  var links = document.querySelectorAll('.sidebar a');
  var sections = [];
  for (var i = 0; i < links.length; i++) {
    var id = links[i].getAttribute('href');
    if (id && id.charAt(0) === '#') sections.push({ link: links[i], el: document.getElementById(id.slice(1)) });
  }
  var current = '';
  function onScroll() {
    var pos = window.scrollY + 90;
    var found = '';
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el && sections[i].el.offsetTop <= pos) found = sections[i].el.id;
    }
    if (found !== current) {
      current = found;
      for (var j = 0; j < sections.length; j++) sections[j].link.classList.toggle('active', sections[j].el.id === found);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
</script>
</body>
</html>`;
}


function pageShell(title: string, activeNav: string, body: string, userId?: string, seoConfig?: SeoPageConfig): string {
  const isDev = activeNav === 'developers';
  const isStatus = activeNav === 'status';
  const headSeo = seoConfig ? renderSeoHead(seoConfig) : `<title>${title}</title><meta name="robots" content="index, follow">`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#ffffff">
${headSeo}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/logo.png">
<link rel="icon" type="image/svg+xml" href="/logo.svg">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg, #fff); color: var(--fg, #090d16); line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  a { color: #0076FE; text-decoration: none; }
  a:hover { opacity: 0.85; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

  .nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(15,23,42,0.08); }
  .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 60px; }
  .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 600; font-size: 15px; color: var(--fg, #090d16); }
  .brand img { height: 28px; width: auto; }
  .nav-links { display: flex; gap: 24px; }
  .nav-links a { color: #475569; font-size: 13.5px; font-weight: 500; transition: color 150ms; }
  .nav-links a:hover { color: var(--fg, #090d16); opacity: 1; }
  .nav-links a.active { color: #0076FE; font-weight: 600; }
  .nav-actions { display: flex; gap: 10px; align-items: center; }

  .hamburger {
    display: none;
    width: 38px;
    height: 38px;
    background: transparent;
    border: 1px solid rgba(15,23,42,0.12);
    border-radius: 8px;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    color: var(--fg, #090d16);
  }
  .hamburger svg { width: 20px; height: 20px; }
  .hamburger .icon-close { display: none; }
  .hamburger.open .icon-menu { display: none; }
  .hamburger.open .icon-close { display: block; }

  .mobile-drawer {
    display: none;
    position: fixed;
    inset: 60px 0 0 0;
    background: var(--bg, #ffffff);
    z-index: 49;
    padding: 20px;
    flex-direction: column;
    overflow-y: auto;
    border-top: 1px solid rgba(15,23,42,0.08);
  }
  .mobile-drawer.open { display: flex; }
  .mobile-drawer a {
    display: block;
    padding: 12px 8px;
    font-size: 16px;
    font-weight: 500;
    color: #090d16;
    border-bottom: 1px solid rgba(15,23,42,0.06);
  }
  .mobile-drawer a:hover { color: #0076FE; }
  .mobile-drawer .mobile-actions { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
  .mobile-drawer .mobile-actions .btn { width: 100%; min-height: 44px; }

  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 16px; border-radius: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: background-color 150ms, border-color 150ms, color 150ms; }
  .btn-primary { background: #0076FE; color: #fff; }
  .btn-primary:hover { background: #0060d0; opacity: 1; }
  .btn-ghost { border-color: rgba(15,23,42,0.14); color: #090d16; background: transparent; }
  .btn-ghost:hover { border-color: #0076FE; color: #0076FE; opacity: 1; }

  .page-header { padding: 36px 0 24px; border-bottom: 1px solid rgba(15,23,42,0.08); }
  .page-header h1 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .page-header p { color: #475569; font-size: 14.5px; max-width: 65ch; }

  .content { padding: 24px 0 48px; max-width: 760px; min-width: 0; }
  .content h2 { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.015em; margin: 32px 0 10px; padding-top: 20px; border-top: 1px solid rgba(15,23,42,0.08); }
  .content h2:first-child { margin-top: 0; border-top: none; padding-top: 0; }
  .content h3 { font-size: 0.95rem; font-weight: 600; margin: 20px 0 8px; }
  .content p { color: #475569; font-size: 14px; margin-bottom: 12px; max-width: 72ch; }
  .content ul { color: #475569; font-size: 14px; margin: 0 0 12px 20px; }
  .content li { margin-bottom: 4px; }
  .content strong { color: #090d16; font-weight: 600; }

  footer { padding: 32px 0 20px; border-top: 1px solid rgba(15,23,42,0.08); }
  .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #64748b; }

  @media (max-width: 768px) {
    .container { padding: 0 16px; }
    .nav-inner { height: 56px; }
    .nav-links, .nav-actions { display: none; }
    .hamburger { display: flex; }
    .mobile-drawer { inset: 56px 0 0 0; }
    .footer-inner { flex-direction: column; align-items: flex-start; gap: 8px; }
  }

  @media (max-width: 480px) {
    .btn { min-height: 44px; }
    .page-header { padding: 24px 0 16px; }
  }
</style>
</head>
<body style="display:flex;flex-direction:column;min-height:100vh">
<div class="page-body" style="flex:1">
<nav class="nav" aria-label="Primary">
  <div class="container nav-inner">
    <a class="brand" href="/"><img src="/logo.png" alt="" width="28" height="28"> Playsole One</a>
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/developers" class="${isDev ? 'active' : ''}">Developers</a>
      <a href="/status" class="${isStatus ? 'active' : ''}">Status</a>
    </div>
    <div class="nav-actions">
      ${navAuthActions(userId)}
    </div>
    <button class="hamburger" aria-label="Toggle navigation menu" aria-expanded="false" onclick="toggleMenu()">
      <svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  </div>
</nav>

<div class="mobile-drawer" id="mobileMenu" aria-label="Mobile Navigation">
  <a href="/" onclick="closeMenu()">Home</a>
  <a href="/developers" onclick="closeMenu()">Developers</a>
  <a href="/status" onclick="closeMenu()">Status</a>
  <a href="/privacy" onclick="closeMenu()">Privacy Policy</a>
  <a href="/terms" onclick="closeMenu()">Terms of Service</a>
  <div class="mobile-actions">
    ${navAuthActions(userId)}
  </div>
</div>

${body}
</div>

<footer>
  <div class="container footer-inner">
    <span>&copy; 2026 Playsole One</span>
    <span><a href="/">Home</a> &middot; <a href="/developers">Developers</a> &middot; <a href="/status">Status</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></span>
  </div>
</footer>

<script>
function toggleMenu() {
  var btn = document.querySelector('.hamburger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  var isOpen = btn.classList.toggle('open');
  menu.classList.toggle('open', isOpen);
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

function closeMenu() {
  var btn = document.querySelector('.hamburger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.classList.remove('open');
  menu.classList.remove('open');
  btn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
</script>
</body>
</html>`;
}

export function privacyPage(userId?: string): string {
  return pageShell('Privacy — Playsole One', '', `
<div class="container">
  <div class="page-header">
    <h1>Privacy Policy</h1>
    <p>Last updated: August 15, 2026</p>
  </div>
  <div class="content">
    <h2>1. Introduction</h2>
    <p>Playsole One ("we", "us", "our") provides an identity, authentication, and authorization platform. This Privacy Policy explains what data we collect, why we collect it, and how we handle it.</p>

    <h2>2. Data we collect</h2>
    <h3>Account data</h3>
    <p>When you create an account, we collect your display name, email address, and a password hash. Passwords are stored as salted, cryptographic hashes — never in plain text.</p>
    <h3>Verification data</h3>
    <p>If you verify a phone number, we store the phone number to verify future sign-ins. Verification codes are single-use and short-lived.</p>
    <h3>Authentication activity</h3>
    <p>We keep a session record for signed-in users, including the session identifier, creation time, and last activity. We do not store your browsing history.</p>
    <h3>Consent grants</h3>
    <p>When you authorize an application, we record which application received access and which scopes you approved. You can review and revoke these grants at any time.</p>

    <h2>3. How we use your data</h2>
    <ul>
      <li>To authenticate you and issue session cookies</li>
      <li>To provide OIDC authorization and consent to connected applications</li>
      <li>To send verification emails and magic sign-in links</li>
      <li>To secure your account and prevent abuse</li>
    </ul>

    <h2>4. Sharing your data</h2>
    <p>We share the minimum data required with applications you explicitly authorize, and only within the scopes you approve. We do not sell personal data. We do not share data with advertisers.</p>

    <h2>5. Data retention</h2>
    <p>Account data is retained until you delete your account. Session records expire automatically. Consent grants remain until you revoke them.</p>

    <h2>6. Your rights</h2>
    <p>You can update your display name and locale, revoke application access, sign out of active sessions, and request account deletion by contacting us.</p>

    <h2>7. Security</h2>
    <p>We use HTTPS, HttpOnly session cookies, hashed passwords, and regular dependency audits. Access tokens are short-lived and refresh tokens rotate.</p>

    <h2>8. Contact</h2>
    <p>Questions about this policy? Contact us at <a href="mailto:privacy@playsole.xyz">privacy@playsole.xyz</a>.</p>
  </div>
</div>`, userId, privacySeo);
}

export function termsPage(userId?: string): string {
  return pageShell('Terms of Service — Playsole One', '', `
<div class="container">
  <div class="page-header">
    <h1>Terms of Service</h1>
    <p>Last updated: August 15, 2026</p>
  </div>
  <div class="content">
    <h2>1. Agreement</h2>
    <p>By accessing or using Playsole One, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.</p>

    <h2>2. Your account</h2>
    <p>You are responsible for safeguarding your credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>

    <h2>3. Acceptable use</h2>
    <p>You agree not to: attempt to disrupt the service, exploit vulnerabilities, create accounts for fraudulent purposes, send unsolicited messages through the platform, or use the service to violate any law.</p>

    <h2>4. Third-party applications</h2>
    <p>Playsole One provides identity and authorization services to third-party applications. We are not responsible for the behavior, content, or practices of those applications. Review each application's own terms before granting access.</p>

    <h2>5. Availability</h2>
    <p>We aim to keep the service available, but we do not guarantee uninterrupted access. We may perform maintenance and may modify or discontinue features with reasonable notice.</p>

    <h2>6. Termination</h2>
    <p>We may suspend or terminate access to the service if you violate these Terms or if required by law. You may stop using the service and delete your account at any time.</p>

    <h2>7. Changes to these terms</h2>
    <p>We may update these Terms from time to time. Material changes will be reflected with an updated "Last updated" date. Continued use of the service after changes constitutes acceptance.</p>

    <h2>8. Governing law</h2>
    <p>These Terms are governed by the laws applicable in the jurisdiction in which Playsole operates, without regard to conflict-of-law principles.</p>

    <h2>9. Contact</h2>
    <p>Questions about these Terms? Contact us at <a href="mailto:legal@playsole.xyz">legal@playsole.xyz</a>.</p>
  </div>
</div>`, userId, termsSeo);
}

export { renderStatusPage as statusPage } from './statusView';
export type { ServiceCheck } from './statusView';

export { dashboardPage } from './dashboardView';
export type { DashboardData, DashboardOptions, DashboardProfile, DashboardGrant, DashboardSession, DashboardDevice, DashboardMethod, DeveloperApp } from './dashboardView';
export { adminDashboardPage } from './adminView';
export type { AdminDashboardData, AdminDashboardOptions, AdminUser, AdminClient, AdminTenant, AdminAuditLog } from './adminView';
