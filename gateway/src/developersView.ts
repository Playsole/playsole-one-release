import { renderSeoHead, developersSeo } from './seo';

export function renderDevelopersView(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="#000000">
${renderSeoHead(developersSeo)}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" href="/logo.png">
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
  <style>
    /* Dark Theme (Pure True OLED Black) */
    :root,
    html.dark,
    [data-theme="dark"] {
      color-scheme: dark;
      --bg-base: #000000;
      --bg-surface: #08080a;
      --bg-surface-elevated: #101014;
      --bg-surface-hover: #18181e;
      --border-subtle: rgba(255, 255, 255, 0.1);
      --border-strong: rgba(255, 255, 255, 0.2);
      --text-primary: #ffffff;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --accent-blue: #0a84ff;
      --accent-cyan: #38bdf8;
      --accent-emerald: #30d158;
      --accent-purple: #c084fc;
      --accent-orange: #fb923c;
      --code-bg: #040405;
      --radius-sm: 8px;
      --radius-md: 14px;
      --radius-lg: 20px;
      --radius-full: 9999px;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Light Theme for Developer Portal */
    html:not(.dark):not([data-theme="dark"]),
    [data-theme="light"] {
      color-scheme: light;
      --bg-base: #f8fafc;
      --bg-surface: #ffffff;
      --bg-surface-elevated: #f1f5f9;
      --bg-surface-hover: #e2e8f0;
      --border-subtle: rgba(15, 23, 42, 0.08);
      --border-strong: rgba(15, 23, 42, 0.16);
      --text-primary: #090d16;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --accent-blue: #0076fe;
      --accent-cyan: #0284c7;
      --accent-emerald: #10b981;
      --accent-purple: #7c3aed;
      --accent-orange: #d97706;
      --code-bg: #090d16;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    html {
      scroll-behavior: smooth;
      overflow-x: hidden;
      max-width: 100vw;
    }

    [id] {
      scroll-margin-top: 96px;
    }

    body {
      background-color: var(--bg-base);
      color: var(--text-primary);
      font-family: var(--font-sans);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      max-width: 100vw;
      width: 100%;
    }

    /* Fixed Top Omni-Dock Header */
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
      background: var(--bg-surface-elevated);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset;
      max-width: 1360px;
      width: 100%;
      pointer-events: auto;
    }
    html.dark .omni-dock, [data-theme="dark"] .omni-dock {
      background: rgba(8, 8, 10, 0.92);
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 40px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.08) inset;
    }
    html:not(.dark):not([data-theme="dark"]) .omni-dock, [data-theme="light"] .omni-dock {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.9) inset;
    }

    .mobile-nav-toggle {
      display: none;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      border-radius: var(--radius-full);
      width: 36px;
      height: 36px;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .mobile-nav-toggle:hover, .mobile-nav-toggle:active {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.12);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 600;
      font-size: 15px;
      padding-right: 14px;
      border-right: 1px solid var(--border-subtle);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .brand-logo {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      flex-shrink: 0;
    }

    /* Centered Navigation Items */
    .dock-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      flex: 1;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .dock-nav::-webkit-scrollbar {
      display: none;
    }

    .dock-nav a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .dock-nav a:hover, .dock-nav a.active {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.08);
    }

    .dock-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .status-capsule {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(48, 209, 88, 0.12);
      color: var(--accent-emerald);
      border: 1px solid rgba(48, 209, 88, 0.25);
      white-space: nowrap;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
      flex-shrink: 0;
    }

    .admin-link-btn {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      padding: 5px 12px;
      border-radius: var(--radius-full);
      border: 1px solid var(--border-subtle);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .admin-link-btn:hover, .admin-link-btn:active {
      color: var(--text-primary);
      border-color: var(--border-strong);
      background: rgba(255, 255, 255, 0.05);
    }

    /* Portal Layout Container */
    .portal-layout {
      max-width: 1360px;
      margin: 0 auto;
      padding: 86px 24px 64px 24px;
      display: flex;
      gap: 28px;
      width: 100%;
      flex: 1;
      position: relative;
    }

    /* Mobile Backdrop */
    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1999;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .sidebar-backdrop.active {
      display: block;
      opacity: 1;
    }

    /* Glassmorphic Sidebar */
    .dev-sidebar {
      width: 280px;
      flex-shrink: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      background: var(--bg-surface-elevated);
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 18px 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
    }
    html.dark .dev-sidebar, [data-theme="dark"] .dev-sidebar {
      background: rgba(6, 6, 8, 0.94);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    }
    html:not(.dark):not([data-theme="dark"]) .dev-sidebar, [data-theme="light"] .dev-sidebar {
      background: rgba(255, 255, 255, 0.92);
      border-color: rgba(15, 23, 42, 0.08);
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
      scrollbar-color: rgba(15, 23, 42, 0.15) transparent;
    }

    .dev-sidebar::-webkit-scrollbar {
      width: 4px;
    }
    .dev-sidebar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sidebar-heading-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar-section-eyebrow {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: var(--accent-cyan);
      text-transform: uppercase;
    }

    .sidebar-portal-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.2px;
    }

    .sidebar-close-btn {
      display: none;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      border-radius: 8px;
      width: 36px;
      height: 36px;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .sidebar-close-btn:hover, .sidebar-close-btn:active {
      background: rgba(255, 255, 255, 0.16);
      color: var(--text-primary);
    }

    /* Environment Telemetry Card */
    .sidebar-env-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .env-badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .env-pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
      flex-shrink: 0;
    }

    .env-label {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .env-copy-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      background: var(--code-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 4px 8px;
    }

    .env-copy-box code {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--accent-cyan);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .env-copy-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.15s ease;
      min-width: 24px;
      min-height: 24px;
      justify-content: center;
    }
    .env-copy-btn:hover, .env-copy-btn:active {
      color: var(--text-primary);
    }

    /* Search input */
    .sidebar-search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .sidebar-search-box .search-icon {
      position: absolute;
      left: 10px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .sidebar-search-box input {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 10px 8px 32px;
      color: var(--text-primary);
      font-size: 12.5px;
      font-family: var(--font-sans);
      outline: none;
      transition: border-color 0.2s ease, background 0.2s ease;
    }

    .sidebar-search-box input:focus {
      border-color: var(--accent-blue);
      background: rgba(255, 255, 255, 0.07);
    }

    /* Navigation Tree */
    .sidebar-nav-tree {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .nav-group-title {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.7px;
      text-transform: uppercase;
      padding: 4px 8px;
    }

    .sidebar-nav-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
      border-left: 2px solid transparent;
      min-height: 36px;
    }

    .sidebar-nav-link svg {
      opacity: 0.65;
      flex-shrink: 0;
      transition: opacity 0.15s ease;
    }

    .sidebar-nav-link:hover, .sidebar-nav-link:active {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.06);
    }

    .sidebar-nav-link:hover svg, .sidebar-nav-link:active svg {
      opacity: 1;
    }

    .sidebar-nav-link.active {
      color: var(--text-primary);
      background: rgba(10, 132, 255, 0.14);
      border-left-color: var(--accent-blue);
      font-weight: 600;
    }

    .sidebar-nav-link.active svg {
      opacity: 1;
      color: var(--accent-blue);
    }

    /* Sidebar Endpoint Quick Pills */
    .sidebar-endpoint-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 2px;
    }

    .sidebar-ep-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid transparent;
      transition: all 0.15s ease;
      min-height: 32px;
    }

    .sidebar-ep-item:hover, .sidebar-ep-item:active {
      background: rgba(255, 255, 255, 0.07);
      border-color: var(--border-subtle);
    }

    .sidebar-badge-get {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
      background: rgba(48, 209, 88, 0.18);
      color: var(--accent-emerald);
      font-family: var(--font-mono);
      flex-shrink: 0;
    }

    .sidebar-badge-post {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
      background: rgba(10, 132, 255, 0.18);
      color: var(--accent-blue);
      font-family: var(--font-mono);
      flex-shrink: 0;
    }

    .sidebar-ep-item code {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-ep-item:hover code, .sidebar-ep-item:active code {
      color: var(--text-primary);
    }

    /* Resources Links */
    .sidebar-resource-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
      min-height: 36px;
    }
    .sidebar-resource-link:hover, .sidebar-resource-link:active {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.06);
    }
    .resource-arrow {
      color: var(--text-muted);
      font-size: 12px;
      transition: transform 0.15s ease;
    }
    .sidebar-resource-link:hover .resource-arrow, .sidebar-resource-link:active .resource-arrow {
      transform: translateX(2px);
      color: var(--text-primary);
    }

    /* Main Container */
    .dev-main {
      flex: 1;
      min-width: 0;
      max-width: 100%;
      display: flex;
      flex-direction: column;
    }

    .hero-banner {
      padding: 6px 0 24px 0;
      text-align: left;
    }

    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent-cyan);
      background: rgba(100, 210, 255, 0.1);
      border: 1px solid rgba(100, 210, 255, 0.2);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      margin-bottom: 12px;
    }

    .hero-title {
      font-size: clamp(26px, 4.5vw, 36px);
      font-weight: 700;
      letter-spacing: -0.8px;
      line-height: 1.18;
      background: linear-gradient(180deg, #ffffff 0%, #a1a1a6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
      word-break: break-word;
    }
    html:not(.dark):not([data-theme="dark"]) .hero-title, [data-theme="light"] .hero-title {
      background: linear-gradient(180deg, #090d16 0%, #334155 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-desc {
      font-size: clamp(14.5px, 2.5vw, 16px);
      color: var(--text-secondary);
      max-width: 780px;
      line-height: 1.55;
    }

    /* Horizon Grid Cards */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
      margin-top: 16px;
      width: 100%;
    }

    .bento-card {
      background: var(--bg-surface);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 24px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      min-width: 0;
      max-width: 100%;
      word-break: break-word;
    }

    .bento-card:hover {
      border-color: var(--border-strong);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }

    html.dark .bento-card, [data-theme="dark"] .bento-card {
      background: #08080a;
      border-color: rgba(255, 255, 255, 0.1);
    }
    html.dark .bento-card:hover, [data-theme="dark"] .bento-card:hover {
      border-color: rgba(255, 255, 255, 0.22);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7);
    }
    html:not(.dark):not([data-theme="dark"]) .bento-card, [data-theme="light"] .bento-card {
      background: #ffffff;
      border-color: rgba(15, 23, 42, 0.08);
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.03);
    }
    html:not(.dark):not([data-theme="dark"]) .bento-card:hover, [data-theme="light"] .bento-card:hover {
      border-color: rgba(15, 23, 42, 0.16);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }

    .col-12 { grid-column: span 12; }
    .col-8 { grid-column: span 8; }
    .col-6 { grid-column: span 6; }
    .col-4 { grid-column: span 4; }

    .card-title {
      font-size: 19px;
      font-weight: 600;
      letter-spacing: -0.3px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .card-desc {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 18px;
      line-height: 1.5;
    }

    /* Endpoint Pill */
    .endpoint-pill-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin-bottom: 12px;
      padding-bottom: 2px;
    }

    .endpoint-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 6px 12px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--text-primary);
      max-width: 100%;
      white-space: nowrap;
    }
    html:not(.dark):not([data-theme="dark"]) .endpoint-pill, [data-theme="light"] .endpoint-pill {
      background: #f1f5f9;
      border-color: rgba(15, 23, 42, 0.08);
      color: #090d16;
    }

    .method-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .method-get { background: rgba(48, 209, 88, 0.2); color: var(--accent-emerald); }
    .method-post { background: rgba(10, 132, 255, 0.2); color: var(--accent-blue); }
    .method-delete { background: rgba(255, 69, 58, 0.2); color: #ff453a; }
    .method-patch { background: rgba(255, 159, 10, 0.2); color: var(--accent-orange); }

    /* Code Tabs & Snippets */
    .code-container {
      background: var(--code-bg);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-top: 14px;
      max-width: 100%;
    }
    html.dark .code-container, [data-theme="dark"] .code-container {
      background: #040405;
      border-color: rgba(255, 255, 255, 0.1);
    }
    html:not(.dark):not([data-theme="dark"]) .code-container, [data-theme="light"] .code-container {
      background: #090d16;
      border-color: rgba(15, 23, 42, 0.12);
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border-subtle);
      max-width: 100%;
    }

    .code-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .code-tabs::-webkit-scrollbar {
      display: none;
    }

    .code-tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .code-tab-btn.active {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.1);
    }

    .copy-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .copy-btn:hover, .copy-btn:active {
      color: var(--text-primary);
      border-color: var(--border-strong);
    }

    pre {
      padding: 14px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      font-family: var(--font-mono);
      font-size: 13px;
      color: #e2e8f0;
      line-height: 1.5;
      max-width: 100%;
    }

    .step-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(10, 132, 255, 0.2);
      color: var(--accent-blue);
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* Policy list */
    .policy-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .policy-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.5;
      word-break: break-word;
    }

    .policy-item strong {
      color: var(--text-primary);
    }

    .policy-item code {
      word-break: break-all;
    }

    /* Interactive Data Tables & Badges */
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin-top: 14px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);
      background: rgba(0, 0, 0, 0.25);
      -webkit-overflow-scrolling: touch;
    }
    html.dark .table-container, [data-theme="dark"] .table-container {
      background: #040405;
      border-color: rgba(255, 255, 255, 0.1);
    }
    html:not(.dark):not([data-theme="dark"]) .table-container, [data-theme="light"] .table-container {
      background: #ffffff;
      border-color: rgba(15, 23, 42, 0.08);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .data-table th {
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-subtle);
      white-space: nowrap;
    }
    html:not(.dark):not([data-theme="dark"]) .data-table th, [data-theme="light"] .data-table th {
      background: #f8fafc;
      color: #475569;
      border-bottom-color: rgba(15, 23, 42, 0.08);
    }
    .data-table td {
      padding: 11px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      vertical-align: top;
      line-height: 1.45;
    }
    html:not(.dark):not([data-theme="dark"]) .data-table td, [data-theme="light"] .data-table td {
      border-bottom-color: rgba(15, 23, 42, 0.06);
      color: #334155;
    }
    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    html:not(.dark):not([data-theme="dark"]) .data-table tr:hover td, [data-theme="light"] .data-table tr:hover td {
      background: rgba(15, 23, 42, 0.02);
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-emerald { background: rgba(52, 211, 153, 0.12); color: var(--accent-emerald); border: 1px solid rgba(52, 211, 153, 0.25); }
    .badge-amber { background: rgba(245, 158, 11, 0.12); color: var(--accent-amber); border: 1px solid rgba(245, 158, 11, 0.25); }
    .badge-rose { background: rgba(244, 63, 94, 0.12); color: var(--accent-rose); border: 1px solid rgba(244, 63, 94, 0.25); }
    .badge-blue { background: rgba(96, 165, 250, 0.12); color: var(--accent-blue); border: 1px solid rgba(96, 165, 250, 0.25); }
    .badge-purple { background: rgba(192, 132, 252, 0.12); color: var(--accent-purple); border: 1px solid rgba(192, 132, 252, 0.25); }

    .footer {
      text-align: center;
      padding: 14px 16px;
      color: var(--text-muted);
      font-size: 11.5px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 20px;
      line-height: 1.4;
      width: 100%;
    }

    /* ========================================================
       DESKTOP LAYOUT (Fixed Navbar & Fixed Independent Sidebar)
       ======================================================== */
    @media (min-width: 1081px) {
      .dev-sidebar {
        position: fixed;
        top: 86px;
        left: max(24px, calc((100vw - 1360px) / 2 + 24px));
        width: 280px;
        height: calc(100vh - 106px);
        z-index: 90;
      }
      .dev-main {
        margin-left: 308px;
        width: calc(100% - 308px);
      }
    }

    /* ========================================================
       RESPONSIVE BREAKPOINTS (Tablet, Mobile)
       ======================================================== */
    @media (max-width: 1080px) {
      .mobile-nav-toggle {
        display: inline-flex;
      }
      .sidebar-close-btn {
        display: flex;
      }
      .dev-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 310px;
        max-width: 86vw;
        height: 100vh;
        z-index: 2000;
        border-radius: 0;
        border-top: none;
        border-bottom: none;
        border-left: none;
        transform: translateX(-100%);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 20px 0 50px rgba(0, 0, 0, 0.6);
      }
      .dev-sidebar.open {
        transform: translateX(0);
      }
      .portal-layout {
        padding: 80px 20px 48px 20px;
      }
    }

    @media (max-width: 900px) {
      .col-12, .col-8, .col-6, .col-4 {
        grid-column: span 12;
      }
      .dock-nav {
        display: none;
      }
      .bento-grid {
        gap: 16px;
      }
    }

    @media (max-width: 640px) {
      .dock-container {
        top: 8px;
        padding: 0 10px;
      }
      .omni-dock {
        padding: 6px 10px;
        gap: 8px;
      }
      .brand-section {
        padding-right: 8px;
        font-size: 13.5px;
        gap: 8px;
      }
      .brand-logo {
        width: 22px;
        height: 22px;
      }
      .dock-actions {
        gap: 6px;
      }
      .status-capsule {
        font-size: 10px;
        padding: 3px 8px;
      }
      .status-text-full {
        display: none;
      }
      .admin-link-btn {
        font-size: 11px;
        padding: 4px 9px;
      }
      .portal-layout {
        padding: 72px 12px 40px 12px;
      }
      .bento-card {
        padding: 16px;
        border-radius: var(--radius-md);
      }
      .card-title {
        font-size: 17px;
      }
      .card-desc {
        font-size: 13.5px;
        margin-bottom: 14px;
      }
      .endpoint-pill {
        font-size: 12px;
        padding: 5px 10px;
      }
      pre {
        padding: 12px;
        font-size: 12px;
      }
      .footer {
        padding: 12px 10px;
        margin-top: 16px;
        font-size: 11px;
      }
    }

    @media (max-width: 380px) {
      .brand-section span {
        display: none;
      }
      .brand-section {
        border-right: none;
        padding-right: 0;
      }
    }
  </style>
</head>
<body>

  <!-- Floating Omni-Dock Header (Fixed & Centered) -->
  <div class="dock-container">
    <div class="omni-dock">
      <button class="mobile-nav-toggle" id="mobileNavToggle" onclick="toggleSidebar()" aria-label="Toggle navigation menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <a href="/" class="brand-section">
        <img src="/logo.png" alt="Playsole One" class="brand-logo" onerror="this.style.display='none'">
        <span>Playsole One</span>
      </a>

      <!-- Centered Global Platform Navigation -->
      <nav class="dock-nav">
        <a href="/">Home</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/profile">Profile</a>
        <a href="/security">Security</a>
        <a href="/grants">Grants</a>
        <a href="/developers" class="active">Developers</a>
        <a href="/status">Status</a>
      </nav>

      <div class="dock-actions">
        <div class="status-capsule">
          <span class="status-dot"></span>
          <span>v1.0</span>
        </div>
        <a href="/admin" class="admin-link-btn">Admin Studio</a>
      </div>
    </div>
  </div>

  <!-- Portal Two-Column Layout -->
  <div class="portal-layout">
    <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="toggleSidebar(false)"></div>

    <!-- Navigation Sidebar (Fixed on desktop, never moved by footer or scroll) -->
    <aside class="dev-sidebar" id="devSidebar">
      <div class="sidebar-header">
        <div class="sidebar-heading-group">
          <span class="sidebar-section-eyebrow">INTEGRATION DOCS</span>
          <span class="sidebar-portal-title">Developer Hub</span>
        </div>
        <button class="sidebar-close-btn" onclick="toggleSidebar(false)" aria-label="Close menu">&times;</button>
      </div>

      <!-- Environment Telemetry Card -->
      <div class="sidebar-env-card">
        <div class="env-badge-row">
          <span class="env-pulse"></span>
          <span class="env-label">Live Gateway</span>
        </div>
        <div class="env-copy-box">
          <code id="baseUrlText">https://one.playsole.xyz</code>
          <button class="env-copy-btn" onclick="copyBaseUrl(this)" title="Copy Base URL" aria-label="Copy Base URL">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>

      <!-- Live Search / Filter Input -->
      <div class="sidebar-search-box">
        <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="sidebarSearch" placeholder="Filter sections & APIs..." oninput="filterSidebarNav(this.value)">
      </div>

      <!-- Sidebar Navigation Tree -->
      <nav class="sidebar-nav-tree" id="sidebarNavTree">
        <div class="nav-group">
          <div class="nav-group-title">GETTING STARTED</div>
          <a href="#discovery" class="sidebar-nav-link active" data-target="discovery" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span>OIDC Discovery & JWKS</span>
          </a>
          <a href="#app-registration" class="sidebar-nav-link" data-target="app-registration" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>App Registration &amp; Console</span>
          </a>
          <a href="#pkce" class="sidebar-nav-link" data-target="pkce" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>PKCE Auth Code Flow</span>
          </a>
          <a href="#frameworks" class="sidebar-nav-link" data-target="frameworks" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span>Framework Quickstarts</span>
          </a>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">AUTHENTICATION & SECURITY</div>
          <a href="#dpop" class="sidebar-nav-link" data-target="dpop" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>DPoP Proof-of-Possession</span>
          </a>
          <a href="#revocation" class="sidebar-nav-link" data-target="revocation" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
            <span>Token Revocation (RFC 7009)</span>
          </a>
          <a href="#mfa-security" class="sidebar-nav-link" data-target="mfa-security" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
            <span>MFA Step-Up & Passkeys</span>
          </a>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">FEDERATION & IDENTITY</div>
          <a href="#sso" class="sidebar-nav-link" data-target="sso" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
            <span>Single Sign-On &amp; Accounts</span>
          </a>
          <a href="#userinfo" class="sidebar-nav-link" data-target="userinfo" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Claims & User Identity</span>
          </a>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">INTEGRATIONS & POLICIES</div>
          <a href="#webhooks" class="sidebar-nav-link" data-target="webhooks" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span>Live Webhooks</span>
          </a>
          <a href="#webhook-events" class="sidebar-nav-link" data-target="webhook-events" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Webhook Events Catalog</span>
          </a>
          <a href="#errors" class="sidebar-nav-link" data-target="errors" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>OAuth 2.0 Error Dictionary</span>
          </a>
          <a href="#versioning" class="sidebar-nav-link" data-target="versioning" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            <span>API Versioning &amp; Sunset</span>
          </a>
          <a href="#brand-assets" class="sidebar-nav-link" data-target="brand-assets" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>Brand Assets &amp; Buttons</span>
          </a>
          <a href="#mcp-agents" class="sidebar-nav-link" data-target="mcp-agents" onclick="onNavLinkClick()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <span>Model Context Protocol (MCP)</span>
          </a>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">ENDPOINTS EXPLORER</div>
          <div class="sidebar-endpoint-list">
            <a href="#discovery" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-get">GET</span>
              <code>/.well-known/openid-configuration</code>
            </a>
            <a href="#discovery" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-get">GET</span>
              <code>/.well-known/jwks.json</code>
            </a>
            <a href="#pkce" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-get">GET</span>
              <code>/authorize</code>
            </a>
            <a href="#pkce" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-post">POST</span>
              <code>/token</code>
            </a>
            <a href="#revocation" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-post">POST</span>
              <code>/revoke</code>
            </a>
            <a href="#userinfo" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-get">GET</span>
              <code>/userinfo</code>
            </a>
            <a href="#sso" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-get">GET</span>
              <code>/sso/accounts</code>
            </a>
            <a href="#sso" class="sidebar-ep-item" onclick="onNavLinkClick()">
              <span class="sidebar-badge-get">GET</span>
              <code>/sso/chooser</code>
            </a>
          </div>
        </div>

        <div class="nav-group">
          <div class="nav-group-title">RESOURCES</div>
          <a href="/status" class="sidebar-resource-link">
            <span>📊 Live System Status</span>
            <span class="resource-arrow">&rarr;</span>
          </a>
          <a href="/dashboard?tab=developer" target="_blank" rel="noopener noreferrer" class="sidebar-resource-link">
            <span>⚙ Developer Dashboard</span>
            <span class="resource-arrow">&rarr;</span>
          </a>
          <a href="/profile" class="sidebar-resource-link">
            <span>👤 Account Profile</span>
            <span class="resource-arrow">&rarr;</span>
          </a>
        </div>
      </nav>
    </aside>

    <!-- Main Content Area -->
    <main class="dev-main">
      <div class="hero-banner">
        <div class="hero-tag">Unified Identity Platform</div>
        <h1 class="hero-title">Developer Integration Portal</h1>
        <p class="hero-desc">
          Integrate standard OpenID Connect (OIDC) and OAuth 2.0 PKCE authentication with Playsole One. Add secure single sign-on, cryptographic DPoP proof-of-possession, and real-time HMAC webhook notifications to any application in minutes.
        </p>
      </div>

      <div class="bento-grid">

        <!-- Discovery Endpoints -->
        <div class="bento-card col-12" id="discovery">
          <div class="card-title">
            <span>OIDC Discovery &amp; Metadata</span>
          </div>
          <p class="card-desc">
            Standard OpenID Provider Configuration Document (RFC 8414) and JSON Web Key Sets (JWKS) enable automatic client configuration and cryptographic signature verification with any OIDC client library.
          </p>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
            <div class="endpoint-pill-wrapper" style="width: auto;">
              <div class="endpoint-pill">
                <span class="method-badge method-get">GET</span>
                <span>/.well-known/openid-configuration</span>
              </div>
            </div>
            <div class="endpoint-pill-wrapper" style="width: auto;">
              <div class="endpoint-pill">
                <span class="method-badge method-get">GET</span>
                <span>/.well-known/jwks.json</span>
              </div>
            </div>
          </div>
          <div class="code-container">
            <div class="code-header">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">Live Provider Metadata Response</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>{
  "issuer": "https://one.playsole.xyz",
  "authorization_endpoint": "https://one.playsole.xyz/authorize",
  "token_endpoint": "https://one.playsole.xyz/token",
  "userinfo_endpoint": "https://one.playsole.xyz/userinfo",
  "revocation_endpoint": "https://one.playsole.xyz/revoke",
  "jwks_uri": "https://one.playsole.xyz/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"],
  "dpop_signing_alg_values_supported": ["ES256", "RS256"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "claims_supported": ["sub", "name", "email", "locale", "cnf"]
}</code></pre>
          </div>
        </div>

        <!-- App Registration & Developer Console -->
        <div class="bento-card col-12" id="app-registration">
          <div class="card-title">
            <span class="step-badge">0</span>
            <span>App Registration &amp; Credentials (Developer Console)</span>
          </div>
          <p class="card-desc">
            Any third-party app, website, or game integrating with Playsole One must register as an OAuth 2.0 client to receive its credentials. Registration is instant and self-serve.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-bottom: 16px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 8px;">Step 1: Open Developer Console</div>
              <p style="font-size: 13.5px; color: var(--text-secondary); margin: 0; line-height: 1.55;">Sign in to your account and go to <a href="/dashboard?tab=developer" target="_blank" rel="noopener noreferrer" style="color: var(--accent-blue); text-decoration: underline; font-weight: 600;">Dashboard &rarr; Developer Console</a>. Click <strong>Create Application</strong>.</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 8px;">Step 2: Add Callback Redirect URIs</div>
              <p style="font-size: 13.5px; color: var(--text-secondary); margin: 0; line-height: 1.55;">Add the exact callback URL where Playsole One will return users with an authorization code (e.g., <code>http://localhost:5002/callback</code> or <code>https://yourapp.com/auth/callback</code>).</p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 8px;">Step 3: Save Client ID &amp; Client Secret</div>
              <p style="font-size: 13.5px; color: var(--text-secondary); margin: 0; line-height: 1.55;">You will receive a public <code>client_id</code> and a confidential <code>client_secret</code> (e.g., <code>pso_...</code>). <strong>The client secret is strictly mandatory</strong> for code exchange at <code>POST /token</code> and must only be stored securely on your backend server.</p>
            </div>
          </div>

          <div style="background: rgba(10, 132, 255, 0.08); border: 1px solid rgba(10, 132, 255, 0.22); border-radius: var(--radius-sm); padding: 14px 16px; font-size: 13.5px; color: var(--text-secondary); line-height: 1.55;">
            <strong style="color: var(--text-primary);">🔒 Security Requirement:</strong> Every project (both web servers and mobile/SPA backends) must authenticate with their <code>client_secret</code> when exchanging authorization codes or refreshing tokens at <code>POST /token</code>. Never expose your <code>client_secret</code> in frontend client-side bundles.
          </div>
        </div>

        <!-- Quickstart: PKCE Flow -->
        <div class="bento-card col-12" id="pkce">
          <div class="card-title">
            <span class="step-badge">1</span>
            <span>Authorization Code Flow with PKCE (Third-Party Sign-In)</span>
          </div>
          <p class="card-desc">
            Implementing "Sign in with Playsole" follows standard OAuth 2.0 with PKCE (RFC 7636) in two simple steps: send the user to our authorize page, then exchange the returned code on your backend server.
          </p>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px;">
            <div class="endpoint-pill-wrapper" style="width: auto;">
              <div class="endpoint-pill">
                <span class="method-badge method-get">GET</span>
                <span>https://one.playsole.xyz/authorize</span>
              </div>
            </div>
            <div class="endpoint-pill-wrapper" style="width: auto;">
              <div class="endpoint-pill">
                <span class="method-badge method-post">POST</span>
                <span>https://one.playsole.xyz/token</span>
              </div>
            </div>
          </div>

          <div class="code-container">
            <div class="code-header">
              <div class="code-tabs">
                <button class="code-tab-btn active" onclick="switchSnippet(this, 'pkce-ts')">Node.js / Express</button>
                <button class="code-tab-btn" onclick="switchSnippet(this, 'pkce-curl')">cURL</button>
                <button class="code-tab-btn" onclick="switchSnippet(this, 'pkce-py')">Python</button>
              </div>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre id="pkce-ts"><code>import crypto from 'node:crypto';

// -------------------------------------------------------------
// STEP 1: In your frontend or router: Redirect user to login
// -------------------------------------------------------------
// Generate PKCE code_verifier & code_challenge
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
const state = crypto.randomBytes(16).toString('hex');

// Save codeVerifier and state in your user's backend session/cookie
req.session.codeVerifier = codeVerifier;
req.session.oauthState = state;

// Redirect browser to Playsole One authorization URL:
const authUrl = 'https://one.playsole.xyz/authorize?' + new URLSearchParams({
  response_type: 'code',
  client_id: process.env.PLAYSOLE_CLIENT_ID,
  redirect_uri: process.env.PLAYSOLE_REDIRECT_URI, // e.g. https://yourapp.com/callback
  scope: 'openid profile email',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state,
}).toString();

res.redirect(authUrl);

// -------------------------------------------------------------
// STEP 2: In your callback router: Exchange authorization code
// -------------------------------------------------------------
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Handle OAuth provider errors safely without proceeding
  if (error) {
    return res.status(400).send('Authentication error: ' + error + ' (' + (error_description || 'no details') + ')');
  }

  const verifier = req.session.codeVerifier;
  const savedState = req.session.oauthState;

  // Validate state and verifier presence, then IMMEDIATELY consume to prevent replay & CSRF
  delete req.session.codeVerifier;
  delete req.session.oauthState;

  if (!state || !savedState || state !== savedState) {
    return res.status(400).send('Invalid or expired OAuth state parameter (CSRF detected).');
  }

  if (!code || !verifier) {
    return res.status(400).send('Missing authorization code or PKCE verifier.');
  }

  // Confidential POST to /token with mandatory client_secret
  const tokenRes = await fetch('https://one.playsole.xyz/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: process.env.PLAYSOLE_REDIRECT_URI,
      client_id: process.env.PLAYSOLE_CLIENT_ID,
      client_secret: process.env.PLAYSOLE_CLIENT_SECRET, // Mandatory secret
      code_verifier: verifier,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return res.status(tokenRes.status).send('Token exchange failed: ' + (tokenData.error_description || tokenData.error || 'Unknown error'));
  }

  const { access_token, id_token, refresh_token, expires_in } = tokenData;

  // Fetch verified user profile with access_token
  const userRes = await fetch('https://one.playsole.xyz/userinfo', {
    headers: { Authorization: 'Bearer ' + access_token },
  });
  if (!userRes.ok) {
    return res.status(userRes.status).send('Failed to fetch user profile.');
  }

  const userProfile = await userRes.json();
  // Establish application session (never expose raw access tokens to client-side JS)
  req.session.userId = userProfile.sub;
  res.redirect('/dashboard');
});</code></pre>
            <pre id="pkce-curl" style="display: none;"><code># Step 1: Open in user browser to initiate authorization and consent:
# https://one.playsole.xyz/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=https://yourapp.com/callback&code_challenge=CODE_CHALLENGE&code_challenge_method=S256&scope=openid+profile+email&state=RANDOM_STATE

# Step 2: In your backend server: exchange authorization code for tokens:
curl -X POST "https://one.playsole.xyz/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=SplxlOBeZQQYbYs6WxSbIA" \
  -d "redirect_uri=https://yourapp.com/callback" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code_verifier=YOUR_SAVED_CODE_VERIFIER"</code></pre>
            <pre id="pkce-py" style="display: none;"><code>import requests

# In your backend callback route:
if "error" in request.args:
    return f"Authentication failed: {request.args.get('error')}", 400

auth_code = request.args.get("code")
state = request.args.get("state")
saved_state = session.pop("oauth_state", None)
saved_verifier = session.pop("code_verifier", None)

if not state or state != saved_state:
    return "Invalid state parameter", 400

res = requests.post("https://one.playsole.xyz/token", data={
    "grant_type": "authorization_code",
    "code": auth_code,
    "redirect_uri": "https://yourapp.com/callback",
    "client_id": PLAYSOLE_CLIENT_ID,
    "client_secret": PLAYSOLE_CLIENT_SECRET, # Mandatory client secret
    "code_verifier": saved_verifier,
})

if not res.ok:
    return f"Token exchange failed: {res.text}", res.status_code

tokens = res.json()
access_token = tokens["access_token"]
id_token = tokens.get("id_token")
refresh_token = tokens.get("refresh_token")

# Fetch user profile
user_info_res = requests.get(
    "https://one.playsole.xyz/userinfo",
    headers={"Authorization": f"Bearer {access_token}"}
)
if not user_info_res.ok:
    return "Failed to fetch user profile", user_info_res.status_code

user_info = user_info_res.json()
session["user_id"] = user_info["sub"]
return redirect("/dashboard")</code></pre>
          </div>
        </div>

        <!-- Framework SDK Starters -->
        <div class="bento-card col-12" id="frameworks">
          <div class="card-title">
            <span class="step-badge">★</span>
            <span>Framework Quickstart Recipes</span>
          </div>
          <p class="card-desc">
            Integrate Playsole One into your existing tech stack using industry-standard OAuth 2.0 / OpenID Connect libraries.
          </p>

          <div class="code-container">
            <div class="code-header">
              <div class="code-tabs">
                <button class="code-tab-btn active" onclick="switchSnippet(this, 'fw-nextjs')">Next.js (Auth.js / NextAuth)</button>
                <button class="code-tab-btn" onclick="switchSnippet(this, 'fw-express')">Node.js (Express)</button>
                <button class="code-tab-btn" onclick="switchSnippet(this, 'fw-fastapi')">Python (FastAPI / Authlib)</button>
                <button class="code-tab-btn" onclick="switchSnippet(this, 'fw-spa')">Vanilla JS (SPA)</button>
              </div>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre id="fw-nextjs"><code>// Next.js (Auth.js / NextAuth.js provider)
import NextAuth from "next-auth";

export const authOptions = {
  providers: [
    {
      id: "playsole",
      name: "Playsole",
      type: "oauth",
      wellKnown: "https://one.playsole.xyz/.well-known/openid-configuration",
      authorization: { params: { scope: "openid profile email" } },
      idToken: true,
      checks: ["pkce", "state"],
      clientId: process.env.PLAYSOLE_CLIENT_ID,
      clientSecret: process.env.PLAYSOLE_CLIENT_SECRET, // Mandatory client_secret
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
};

export default NextAuth(authOptions);</code></pre>
            <pre id="fw-express" style="display: none;"><code>// Express OAuth Callback Handler
import express from 'express';

const app = express();

app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const verifier = req.session.code_verifier; // Stored in session during initial redirect

  const tokenRes = await fetch('https://one.playsole.xyz/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: process.env.PLAYSOLE_REDIRECT_URI,
      client_id: process.env.PLAYSOLE_CLIENT_ID,
      client_secret: process.env.PLAYSOLE_CLIENT_SECRET, // Mandatory client_secret
      code_verifier: verifier,
    }),
  });

  const tokens = await tokenRes.json();
  req.session.accessToken = tokens.access_token;
  res.redirect('/dashboard');
});</code></pre>
            <pre id="fw-fastapi" style="display: none;"><code># FastAPI with Authlib
from fastapi import FastAPI, Request
from authlib.integrations.starlette_client import OAuth

app = FastAPI()
oauth = OAuth()
oauth.register(
    name="playsole",
    server_metadata_url="https://one.playsole.xyz/.well-known/openid-configuration",
    client_id=PLAYSOLE_CLIENT_ID,
    client_secret=PLAYSOLE_CLIENT_SECRET, # Mandatory client_secret
    client_kwargs={"scope": "openid profile email"},
)

@app.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("auth_callback")
    return await oauth.playsole.authorize_redirect(request, redirect_uri)

@app.get("/auth/callback")
async def auth_callback(request: Request):
    token = await oauth.playsole.authorize_access_token(request)
    user = token.get("userinfo")
    return {"status": "authenticated", "user": user}</code></pre>
            <pre id="fw-spa" style="display: none;"><code>// Browser Vanilla JS PKCE Initiator
function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function initiatePlaysoleLogin() {
  // Generate 43-character base64url verifier from 32 secure random bytes
  const random = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64url(random);
  sessionStorage.setItem('pkce_verifier', verifier);

  // Compute SHA-256 S256 challenge
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64url(new Uint8Array(digest));

  // Generate cryptographically random state & nonce for CSRF & token injection defense
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oidc_nonce', nonce);

  const authUrl = new URL('https://one.playsole.xyz/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
  authUrl.searchParams.set('redirect_uri', window.location.origin + '/callback');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);

  // Note: Playsole One is confidential-client-only; exchange code on your backend BFF with client_secret
  window.location.href = authUrl.toString();
}</code></pre>
          </div>
        </div>


        <!-- DPoP Security -->
        <div class="bento-card col-6" id="dpop">
          <div class="card-title">
            <span class="step-badge">2</span>
            <span>DPoP Token Binding (RFC 9449)</span>
          </div>
          <p class="card-desc">
            Demonstrating Proof-of-Possession binds access tokens cryptographically to an ephemeral ECDSA/RSA key pair on the client device. If a token is leaked in transit, an attacker cannot use it without possessing your private key.
          </p>
          <ul class="policy-list" style="margin-bottom: 12px;">
            <li class="policy-item">
              <span>•</span>
              <div><strong>Proof Header:</strong> Send a signed DPoP JWT with <code>htm</code> (HTTP method), <code>htu</code> (URL without query), and <code>ath</code> (access token hash).</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Replay Protection:</strong> Single-use nonce validation and strict clock skew verification (&plusmn;60 seconds).</div>
            </li>
          </ul>
          <div class="code-container">
            <div class="code-header">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">Authenticated HTTP Request with DPoP</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>GET /userinfo HTTP/1.1
Host: one.playsole.xyz
Authorization: DPoP eyJhbGciOiJSUzI1NiIs...
DPoP: eyJ0eXAiOiJkcG9wK2p3dCIsImFsZyI6IkVTMjU2IiwiandrIjp7...</code></pre>
          </div>
        </div>

        <!-- Token Revocation (RFC 7009) -->
        <div class="bento-card col-6" id="revocation">
          <div class="card-title">
            <span class="step-badge">3</span>
            <span>Token Revocation (RFC 7009)</span>
          </div>
          <p class="card-desc">
            Invalidate access tokens and refresh token families when users log out or revoke active application authorizations.
          </p>
          <div class="endpoint-pill-wrapper">
            <div class="endpoint-pill">
              <span class="method-badge method-post">POST</span>
              <span>/revoke</span>
            </div>
          </div>
          <div class="code-container">
            <div class="code-header">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">Revocation Request</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>// Invalidate refresh token on user logout
await fetch('https://one.playsole.xyz/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  }),
});
// HTTP 200 OK returned on success</code></pre>
          </div>
        </div>

        <!-- Single Sign-On & Account Selection -->
        <div class="bento-card col-6" id="sso">
          <div class="card-title">
            <span class="step-badge">4</span>
            <span>Single Sign-On &amp; Accounts</span>
          </div>
          <p class="card-desc">
            Enable multi-account identity switching and seamless single sign-on across games, portals, and third-party apps.
          </p>
          <ul class="policy-list">
            <li class="policy-item">
              <span>•</span>
              <div><strong>Account Chooser:</strong> Navigate to <code>/sso/chooser</code> or pass <code>prompt=select_account</code> in <code>/authorize</code> to let users select their active profile.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Session Inspection:</strong> Query <code>GET /sso/accounts</code> to retrieve current user status and connected profiles as JSON.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Re-Authentication:</strong> Pass <code>prompt=login</code> to require fresh credential entry even if an active session exists.</div>
            </li>
          </ul>
        </div>

        <!-- Claims & User Identity -->
        <div class="bento-card col-6" id="userinfo">
          <div class="card-title">
            <span class="step-badge">5</span>
            <span>Claims &amp; User Identity</span>
          </div>
          <p class="card-desc">
            Retrieve verified user identity claims, avatar, and security posture using the standard OIDC userinfo endpoint.
          </p>
          <div class="endpoint-pill-wrapper">
            <div class="endpoint-pill">
              <span class="method-badge method-get">GET</span>
              <span>/userinfo</span>
            </div>
          </div>
          <div class="code-container">
            <div class="code-header">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">GET /userinfo Response</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>{
  "sub": "usr_9b1deb4d-3b7d-4bad-a89e-2b73ecba9112",
  "email": "alex@playsole.xyz",
  "email_verified": true,
  "name": "Alex Mercer",
  "picture": "https://one.playsole.xyz/avatar/usr_9b1deb4d",
  "tenant_id": "00000000-0000-0000-0000-000000000001",
  "mfa_enabled": true,
  "updated_at": 1727184000
}</code></pre>
          </div>
        </div>

        <!-- MFA Step-Up & Passkeys -->
        <div class="bento-card col-6" id="mfa-security">
          <div class="card-title">
            <span class="step-badge">6</span>
            <span>MFA Step-Up &amp; Passkeys</span>
          </div>
          <p class="card-desc">
            Enforce strong multi-factor authentication for sensitive administrative or billing actions.
          </p>
          <ul class="policy-list">
            <li class="policy-item">
              <span>•</span>
              <div><strong>Step-Up Claim:</strong> Pass <code>acr_values=urn:playsole:mfa</code> in your authorization request to require fresh 2FA.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Supported Authenticators:</strong> Hardware security keys (WebAuthn / FIDO2 Passkeys), TOTP apps (Authenticator), and backup codes.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Verification Claim:</strong> The issued ID token includes <code>"acr": "urn:playsole:mfa"</code> and <code>"auth_time"</code>.</div>
            </li>
          </ul>
        </div>

        <!-- Webhooks Integration -->
        <div class="bento-card col-6" id="webhooks">
          <div class="card-title">
            <span class="step-badge">7</span>
            <span>Live Webhook Subscriptions</span>
          </div>
          <p class="card-desc">
            Receive real-time event notifications with cryptographic HMAC-SHA256 signature verification in the <code>x-playsole-signature</code> header.
          </p>
          <div class="code-container">
            <div class="code-header">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">HMAC Signature Verification (Node.js)</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>import crypto from 'node:crypto';

// Verify x-playsole-signature header safely (constant-time, no unhandled throw)
function verifyWebhook(rawBody, signatureHeader, secret) {
  if (typeof signatureHeader !== 'string' || !signatureHeader || !secret) {
    return false;
  }
  const expected = 'sha256=' + crypto.createHmac('sha256', secret)
    .update(rawBody).digest('hex');
  const sigBuffer = Buffer.from(signatureHeader);
  const expBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}</code></pre>
          </div>
        </div>

        <!-- Webhook Events Catalog -->
        <div class="bento-card col-12" id="webhook-events">
          <div class="card-title">
            <span>Webhook Events Catalog</span>
          </div>
          <p class="card-desc">
            Events are delivered via HTTP POST JSON with headers: <code>x-playsole-event</code>, <code>x-playsole-delivery</code> (UUID), and <code>x-playsole-signature</code>.
          </p>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Trigger Description</th>
                  <th>Payload Keys</th>
                  <th>Delivery Format</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge-pill badge-emerald">user.created</span></td>
                  <td>Fired when a user successfully registers or onboards via magic link.</td>
                  <td><code>userId, email, name, tenantId</code></td>
                  <td>HTTP POST &bull; HMAC-SHA256</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-blue">user.updated</span></td>
                  <td>Fired when user modifies name, avatar, or profile preferences.</td>
                  <td><code>userId, changes, updatedAt</code></td>
                  <td>HTTP POST &bull; HMAC-SHA256</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-rose">user.suspended</span></td>
                  <td>Fired by security monitor on risk detection or admin lockout.</td>
                  <td><code>userId, reason, suspendedAt</code></td>
                  <td>HTTP POST &bull; HMAC-SHA256</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-rose">user.deleted</span></td>
                  <td>Fired when an account is permanently deleted.</td>
                  <td><code>userId, purgeTimestamp</code></td>
                  <td>HTTP POST &bull; HMAC-SHA256</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-amber">session.revoked</span></td>
                  <td>Fired when a session is invalidated manually or via admin panel.</td>
                  <td><code>sessionId, userId, reason</code></td>
                  <td>HTTP POST &bull; HMAC-SHA256</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-purple">mfa.enabled</span></td>
                  <td>Fired when a user successfully configures TOTP or Passkey MFA.</td>
                  <td><code>userId, factorType, enrolledAt</code></td>
                  <td>HTTP POST &bull; HMAC-SHA256</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- OAuth 2.0 Error Dictionary -->
        <div class="bento-card col-12" id="errors">
          <div class="card-title">
            <span>OAuth 2.0 Standard Error Dictionary</span>
          </div>
          <p class="card-desc">
            Error responses strictly adhere to RFC 6749. Errors returned to redirect URIs are encoded as query parameters; direct endpoint errors return JSON with <code>error</code> and <code>error_description</code>.
          </p>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Error Code</th>
                  <th>HTTP Status</th>
                  <th>Description</th>
                  <th>Developer Remediation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span class="badge-pill badge-rose">invalid_request</span></td>
                  <td><code>400 Bad Request</code></td>
                  <td>Missing required parameter, malformed query, or duplicate parameter.</td>
                  <td>Verify client_id, redirect_uri, code_challenge, and response_type are present.</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-rose">unauthorized_client</span></td>
                  <td><code>401 Unauthorized</code></td>
                  <td>Client ID is unknown, inactive, or redirect URI does not match whitelist.</td>
                  <td>Confirm Client ID in Developer Console and verify registered redirect URIs.</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-amber">access_denied</span></td>
                  <td><code>403 Forbidden</code></td>
                  <td>End-user cancelled authorization or rejected required scopes.</td>
                  <td>Handle cancellation gracefully and redirect the user back to sign-in.</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-rose">invalid_grant</span></td>
                  <td><code>400 Bad Request</code></td>
                  <td>Authorization code expired (60s lifetime), already used, or PKCE verifier mismatch.</td>
                  <td>Exchange authorization code immediately upon receipt and verify SHA-256 challenge.</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-amber">invalid_dpop_proof</span></td>
                  <td><code>401 Unauthorized</code></td>
                  <td>DPoP signature expired, invalid HTTP method binding, or invalid jwk thumbprint.</td>
                  <td>Generate a fresh DPoP proof with matching HTTP method, URL, and valid system clock.</td>
                </tr>
                <tr>
                  <td><span class="badge-pill badge-purple">rate_limit_exceeded</span></td>
                  <td><code>429 Too Many Requests</code></td>
                  <td>Request quota exceeded for client IP or client ID.</td>
                  <td>Inspect the <code>Retry-After</code> response header and back off before retrying.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- API Versioning & Deprecation Policy -->
        <div class="bento-card col-12" id="versioning">
          <div class="card-title">
            <span>API Versioning &amp; Deprecation Standards</span>
          </div>
          <p class="card-desc">
            Playsole One APIs follow strict semantic versioning and the RFC 8594 standard for transparent, non-disruptive upgrades.
          </p>
          <ul class="policy-list">
            <li class="policy-item">
              <span>•</span>
              <div><strong>Version Header:</strong> <code>X-API-Version: 1.0</code> is returned on every HTTP response.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Advance Notice Window:</strong> Breaking changes are announced with at least <strong>6 months</strong> sunset notice before decommission.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Deprecation Headers:</strong> Deprecated endpoints emit <code>Deprecation: @epoch</code> and <code>Sunset: &lt;Date&gt;</code> headers.</div>
            </li>
            <li class="policy-item">
              <span>•</span>
              <div><strong>Migration Directives:</strong> Standard <code>Link: &lt;url&gt;; rel="deprecation"</code> points directly to migration runbooks.</div>
            </li>
          </ul>
        </div>

        <!-- Brand Assets & Buttons -->
        <div class="bento-card col-12" id="brand-assets">
          <div class="card-title">
            <span>Playsole Brand Assets &amp; Official Sign-In Buttons</span>
          </div>
          <p class="card-desc">
            Direct public CDN endpoints with CORS (<code>Access-Control-Allow-Origin: *</code>) and caching for embedding the official Playsole logo and buttons into your website or game.
          </p>

          <!-- Visual Showcase of Buttons and Logo -->
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin:18px 0 22px;align-items:center;">
            <a href="https://one.playsole.xyz/brand/btn-signin-dark.svg" target="_blank" style="display:inline-flex;border-radius:22px;border:1px solid rgba(255,255,255,0.16);overflow:hidden;text-decoration:none;" title="Official Dark Badge">
              <img src="/brand/btn-signin-dark.svg" alt="Sign in with Playsole (Dark)" height="44" style="display:block;">
            </a>
            <a href="https://one.playsole.xyz/brand/btn-signin-light.svg" target="_blank" style="display:inline-flex;border-radius:22px;border:1px solid #cbd5e1;overflow:hidden;text-decoration:none;" title="Official Light Badge">
              <img src="/brand/btn-signin-light.svg" alt="Sign in with Playsole (Light)" height="44" style="display:block;">
            </a>
            <div style="display:flex;align-items:center;gap:10px;padding:6px 14px;border-radius:9999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);">
              <img src="/brand/playsole-logo.png" alt="Playsole Logo" width="24" height="24" style="object-fit:contain;border-radius:4px;">
              <span style="font-size:12px;color:var(--text-primary);font-family:var(--font-mono);font-weight:600;">Playsole Logo (Brand)</span>
            </div>
          </div>

          <div class="table-container" style="margin-bottom:18px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>CDN URL</th>
                  <th>Format</th>
                  <th>Third-Party Usage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Playsole Brand Logo</strong></td>
                  <td><code>https://one.playsole.xyz/brand/playsole-logo.png</code></td>
                  <td><span class="badge-pill badge-blue">PNG</span></td>
                  <td>Official Playsole logo icon (blue "P" droplet) for your custom sign-in buttons</td>
                </tr>
                <tr>
                  <td><strong>Dark Sign-In Badge</strong></td>
                  <td><code>https://one.playsole.xyz/brand/btn-signin-dark.svg</code></td>
                  <td><span class="badge-pill badge-blue">SVG</span></td>
                  <td>Ready-to-use vector pill button with official Playsole logo (Dark mode)</td>
                </tr>
                <tr>
                  <td><strong>Light Sign-In Badge</strong></td>
                  <td><code>https://one.playsole.xyz/brand/btn-signin-light.svg</code></td>
                  <td><span class="badge-pill badge-blue">SVG</span></td>
                  <td>Ready-to-use vector pill button with official Playsole logo (Light mode)</td>
                </tr>
                <tr>
                  <td><strong>Button CSS Stylesheet</strong></td>
                  <td><code>https://one.playsole.xyz/brand/signin-button.css</code></td>
                  <td><span class="badge-pill badge-emerald">CSS</span></td>
                  <td>Drop-in stylesheet for customizable <code>.playsole-btn</code> HTML buttons</td>
                </tr>
                <tr>
                  <td><strong>Playsole One Logo</strong></td>
                  <td><code>https://one.playsole.xyz/logo.svg</code></td>
                  <td><span class="badge-pill badge-purple">SVG</span></td>
                  <td>Official identity provider mark (displayed on Playsole One consent screens)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 18px; font-size: 13.5px; line-height: 1.6;">
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Button &amp; Branding Rules:</div>
            <ul style="margin-left: 18px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px;">
              <li><strong>Third-Party Apps &amp; Games:</strong> You must use the official <strong>"Sign in with Playsole"</strong> wording and display the <strong>Playsole brand logo</strong> (not Playsole One logo). When your users click it, Playsole One will display the branded consent screen.</li>
              <li><strong>First-Party Official Apps:</strong> Native ecosystem products use a direct <strong>"Sign In"</strong> button with seamless zero-consent single sign-on.</li>
            </ul>
          </div>

          <div class="code-container">
            <div class="code-header">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">Third-Party Frontend Button Examples</span>
              <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre><code>&lt;!-- Important Security Note:
     Do NOT hardcode authorization URLs. Always generate the authorize URL dynamically
     on your backend server (or client auth initiator) with unique per-request PKCE
     code_challenge, cryptographic CSRF 'state', and OIDC 'nonce'.
--&gt;

&lt;!-- Option 1: Drop-in SVG Badge (Triggers server initiation route) --&gt;
&lt;a href="/auth/login"&gt;
  &lt;img src="https://one.playsole.xyz/brand/btn-signin-dark.svg" alt="Sign in with Playsole" height="44" /&gt;
&lt;/a&gt;

&lt;!-- Option 2: Pre-styled CSS Button --&gt;
&lt;link rel="stylesheet" href="https://one.playsole.xyz/brand/signin-button.css"&gt;

&lt;a href="/auth/login" class="playsole-btn playsole-btn-primary"&gt;
  &lt;img src="https://one.playsole.xyz/brand/playsole-logo.png" class="playsole-btn-icon" alt="Playsole Logo"&gt;
  &lt;span&gt;Sign in with Playsole&lt;/span&gt;
&lt;/a&gt;

&lt;!-- Your /auth/login route generates:
     https://one.playsole.xyz/authorize?client_id=YOUR_CLIENT_ID&amp;redirect_uri=YOUR_REDIRECT_URI&amp;response_type=code&amp;scope=openid%20profile%20email&amp;code_challenge=S256_HASH&amp;code_challenge_method=S256&amp;state=RANDOM_STATE&amp;nonce=RANDOM_NONCE
--&gt;</code></pre>
          </div>
        </div>

        <!-- 13. Model Context Protocol (MCP) AI Agent Server -->
        <div class="bento-card col-12" id="mcp-agents">
          <div class="card-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <span>Model Context Protocol (MCP) Server</span>
            <span class="badge-pill badge-purple">AI Agent Ready</span>
          </div>
          <div class="card-desc">
            Connect AI assistants (Claude Desktop, Cursor, Antigravity, or custom LLM agents) directly to Playsole One. The bundled <code>@playsole-one/mcp</code> server allows AI workflows to securely inspect health, manage OAuth clients, query audit logs, and test PKCE authentication flows.
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 16px;">
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px;">
              <div style="font-weight: 600; font-size: 13px; color: var(--accent-cyan); margin-bottom: 6px;">⚡ Identity &amp; Platform Ops</div>
              <ul style="font-size: 12.5px; color: var(--text-secondary); list-style: inside square; line-height: 1.6;">
                <li><code>check_system_health</code> — Core DB &amp; Redis connectivity</li>
                <li><code>list_oauth_clients</code> — Inspect registered applications</li>
                <li><code>register_oauth_client</code> — Provision confidential clients</li>
                <li><code>rotate_client_secret</code> — Auto-rotate 256-bit hashed secrets</li>
                <li><code>inspect_user</code> — Lookup account claims &amp; MFA state</li>
                <li><code>query_audit_logs</code> — Filter immutable audit records</li>
              </ul>
            </div>

            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px;">
              <div style="font-weight: 600; font-size: 13px; color: var(--accent-emerald); margin-bottom: 6px;">🛠️ Developer Workflows</div>
              <ul style="font-size: 12.5px; color: var(--text-secondary); list-style: inside square; line-height: 1.6;">
                <li><code>generate_pkce_pair</code> — RFC 7636 challenge &amp; verifier</li>
                <li><code>inspect_rate_limit</code> — Redis counters &amp; remaining TTLs</li>
                <li><code>fetch_jwks</code> — Validate active RS256 signing keys</li>
              </ul>
            </div>
          </div>

          <div class="code-container">
            <div class="code-header">
              <div class="code-tabs">
                <button class="code-tab-btn active" onclick="switchSnippet(this, 'snip-mcp-config')">Client Config (.agents / Claude)</button>
                <button class="code-tab-btn" onclick="switchSnippet(this, 'snip-mcp-run')">Running Server</button>
              </div>
              <button class="code-copy-btn" onclick="copyCode(this)">Copy</button>
            </div>
            <pre id="snip-mcp-config" style="display: block;"><code>{
  "mcpServers": {
    "playsole-one": {
      "command": "node",
      "args": ["packages/mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}</code></pre>
            <pre id="snip-mcp-run" style="display: none;"><code># Start the Playsole One MCP server over stdio
npm run mcp

# Or in development mode with live watch/compilation:
npm run dev:mcp</code></pre>
          </div>
        </div>

      </div>

      <!-- Integrated Footer inside Main Column (Prevents sidebar from shifting/moving) -->
      <footer class="footer">
        Playsole One Identity &bull; Apple Horizontal Island Studio &bull; RFC Compliant OAuth 2.0 & OIDC
      </footer>
    </main>
  </div>

  <script>
    function switchSnippet(btn, id) {
      const parent = btn.closest('.code-container');
      parent.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('pre').forEach(p => p.style.display = 'none');
      btn.classList.add('active');
      parent.querySelector('#' + id).style.display = 'block';
    }

    function copyCode(btn) {
      const container = btn.closest('.code-container');
      const activePre = Array.from(container.querySelectorAll('pre')).find(p => p.style.display !== 'none');
      if (activePre) {
        navigator.clipboard.writeText(activePre.innerText.trim()).then(() => {
          btn.innerText = 'Copied!';
          setTimeout(() => btn.innerText = 'Copy', 2000);
        });
      }
    }

    function copyBaseUrl(btn) {
      const urlText = document.getElementById('baseUrlText').innerText;
      navigator.clipboard.writeText(urlText).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<span style="font-size:10px; color:var(--accent-emerald);">✓</span>';
        setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
      });
    }

    function toggleSidebar(forceState) {
      const sidebar = document.getElementById('devSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      const isOpen = sidebar.classList.contains('open');
      const newState = typeof forceState === 'boolean' ? forceState : !isOpen;
      if (newState) {
        sidebar.classList.add('open');
        backdrop.classList.add('active');
        document.body.style.overflow = window.innerWidth <= 1080 ? 'hidden' : '';
      } else {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    function onNavLinkClick() {
      if (window.innerWidth <= 1080) {
        toggleSidebar(false);
      }
    }

    // Close drawer on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        toggleSidebar(false);
      }
    });

    function filterSidebarNav(query) {
      const q = query.toLowerCase().trim();
      const links = document.querySelectorAll('.sidebar-nav-link, .sidebar-ep-item');
      links.forEach(link => {
        const text = link.innerText.toLowerCase();
        if (!q || text.includes(q)) {
          link.style.display = '';
        } else {
          link.style.display = 'none';
        }
      });
    }

    // Scrollspy navigation highlight for sidebar
    (function initScrollSpy() {
      const sections = ['discovery', 'app-registration', 'pkce', 'frameworks', 'dpop', 'revocation', 'sso', 'userinfo', 'mfa-security', 'webhooks', 'webhook-events', 'errors', 'versioning', 'brand-assets'];
      const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');

      function onScroll() {
        const scrollPos = window.scrollY + 130;
        let current = '';

        for (const id of sections) {
          const el = document.getElementById(id);
          if (el && el.offsetTop <= scrollPos) {
            current = id;
          }
        }

        if (current) {
          sidebarLinks.forEach(link => {
            if (link.getAttribute('data-target') === current) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();
  </script>
</body>
</html>`;
}
