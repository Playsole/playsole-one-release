import { describe, it, expect } from 'vitest';
import { ssoCookieDomain, sessionCookieName, sessionCookieOptions } from '../../gateway/src/cookies';
import { renderAccountChooserView } from '../../gateway/src/accountChooserView';

describe('Phase 7 — One Account Across Playsole Apps Tests', () => {
  describe('Shared First-Party Session Strategy & Cookies (Item 58)', () => {
    it('should configure SameSite lax and handle cookie names', () => {
      const options = sessionCookieOptions();
      expect(options.sameSite).toBe('lax');
      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(30 * 86400 * 1000);
    });

    it('should use __Secure- prefix when SSO domain is configured, and omit __Host- prefix', () => {
      const origDomain = process.env.SSO_COOKIE_DOMAIN;
      const origSecure = process.env.COOKIE_SECURE;

      try {
        process.env.SSO_COOKIE_DOMAIN = '.playsole.xyz';
        process.env.COOKIE_SECURE = 'true';

        expect(ssoCookieDomain()).toBe('.playsole.xyz');
        expect(sessionCookieName()).toBe('__Secure-playsole_session');

        const opts = sessionCookieOptions();
        expect(opts.domain).toBe('.playsole.xyz');
      } finally {
        process.env.SSO_COOKIE_DOMAIN = origDomain;
        process.env.COOKIE_SECURE = origSecure;
      }
    });
  });

  describe('Account Chooser UI & Profile Fetching (Items 60 & 61)', () => {
    it('should render the Account Chooser UI with active user profile and continue button', () => {
      const html = renderAccountChooserView({
        activeUser: {
          id: 'usr-999',
          email: 'alex@playsole.xyz',
          displayName: 'Alex Mercer',
          avatarUrl: 'https://images.playsole.xyz/avatar.jpg',
          isActive: true,
        },
        clientName: 'Playsole Studio',
        clientId: 'playsole-dev',
        returnTo: 'https://studio.playsole.xyz/callback',
      });

      expect(html).toContain('Choose an account');
      expect(html).toContain('Playsole Studio');
      expect(html).toContain('Continue as Alex Mercer');
      expect(html).toContain('alex@playsole.xyz');
      expect(html).toContain('Use another account');
      expect(html).toContain('Create a new Playsole account');
      expect(html).toContain('Active');
    });

    it('should display prompt to sign in when no active session is present', () => {
      const html = renderAccountChooserView({
        activeUser: null,
        accounts: [],
        clientName: 'Playsole Music',
        returnTo: '/dashboard',
      });

      expect(html).toContain('Choose an account');
      expect(html).toContain('No active session found on this device');
      expect(html).toContain('Sign in with Playsole One');
    });

    it('should render mobile handoff instructions when handoff code is provided (Item 64)', () => {
      const html = renderAccountChooserView({
        activeUser: {
          id: 'usr-999',
          email: 'alex@playsole.xyz',
          displayName: 'Alex Mercer',
        },
        handoffCode: 'HANDOFF-XYZ-777',
      });

      expect(html).toContain('Mobile Device Handoff');
      expect(html).toContain('HANDOFF-XYZ-777');
    });
  });
});
