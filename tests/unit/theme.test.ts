import { describe, expect, it } from 'vitest';
import { themeScript, themeStyles, themeToggleHtml, injectTheme } from '../../gateway/src/theme';

describe('Dark mode and floating theme toggle', () => {
  it('exports themeScript with local storage and system prefers-color-scheme detection', () => {
    expect(themeScript).toContain("localStorage.getItem('playsole_theme')");
    expect(themeScript).toContain("prefers-color-scheme: dark");
    expect(themeScript).toContain("data-theme");
  });

  it('exports themeStyles containing dark mode tokens and floating button CSS', () => {
    expect(themeStyles).toContain('playsole-theme-toggle');
    expect(themeStyles).toContain('position: fixed');
    expect(themeStyles).toContain('bottom: 20px');
    expect(themeStyles).toContain('right: 20px');
    expect(themeStyles).toContain('html.dark');
    expect(themeStyles).toContain('[data-theme="dark"]');
    expect(themeStyles).toContain('--bg-canvas');
  });

  it('exports themeToggleHtml with toggle button and sun/moon SVGs', () => {
    expect(themeToggleHtml).toContain('id="playsoleThemeToggle"');
    expect(themeToggleHtml).toContain('theme-icon-sun');
    expect(themeToggleHtml).toContain('theme-icon-moon');
    expect(themeToggleHtml).toContain('playsole-theme-toggle');
  });

  it('injectTheme inserts theme styles into head and button into body', () => {
    const rawHtml = '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
    const themed = injectTheme(rawHtml);

    expect(themed).toContain('id="playsole-theme-styles"');
    expect(themed).toContain('id="playsoleThemeToggle"');
    expect(themed).toContain('theme-icon-sun');
    expect(themed).toContain('theme-icon-moon');

    // Should not inject twice if already present
    const doubleInjected = injectTheme(themed);
    expect(doubleInjected).toBe(themed);
  });
});
