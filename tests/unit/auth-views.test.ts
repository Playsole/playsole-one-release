import { describe, it, expect } from 'vitest';
import { loginPage, registerPage, verifyEmailPage, mfaChallengePage } from '../../gateway/src/views';

describe('Auth Views Mobile & Layout Styling (views.ts)', () => {
  describe('loginPage', () => {
    it('is viewport-locked and non-scrollable with 100dvh and overflow hidden', () => {
      const html = loginPage('/dashboard');

      expect(html).toContain('viewport-fit=cover');
      expect(html).toContain('height: 100dvh;');
      expect(html).toContain('overflow: hidden;');
    });

    it('renders form elements directly on page without a card or box container', () => {
      const html = loginPage('/dashboard');

      expect(html).toContain('class="auth-wrap"');
      expect(html).not.toContain('class="auth-panel"');
      expect(html).toContain('.auth-wrap {');
      expect(html).toContain('max-width: 380px;');
      expect(html).toContain('class="auth-brand"');
      expect(html).toContain('class="pill-input"');
      expect(html).toContain('font-size: 16px;');
      expect(html).toContain('class="btn-pill-primary"');
    });

    it('includes responsive compact styling for small screen heights', () => {
      const html = loginPage('/dashboard');

      expect(html).toContain('@media (max-height: 600px)');
      expect(html).toContain('@media (max-width: 440px)');
    });
  });

  describe('registerPage', () => {
    it('is viewport-locked and non-scrollable with 100dvh and overflow hidden', () => {
      const html = registerPage('/dashboard');

      expect(html).toContain('viewport-fit=cover');
      expect(html).toContain('height: 100dvh;');
      expect(html).toContain('overflow: hidden;');
    });

    it('renders form elements directly on page without a card or box container', () => {
      const html = registerPage('/dashboard');

      expect(html).toContain('class="auth-wrap"');
      expect(html).not.toContain('class="auth-panel"');
      expect(html).toContain('.auth-wrap {');
      expect(html).toContain('max-width: 380px;');
      expect(html).toContain('class="auth-brand"');
      expect(html).toContain('class="pill-input"');
      expect(html).toContain('font-size: 16px;');
      expect(html).toContain('class="btn-pill-primary"');
      expect(html).toContain('class="pw-strength-bar"');
    });

    it('includes responsive compact styling for small screen heights', () => {
      const html = registerPage('/dashboard');

      expect(html).toContain('@media (max-height: 640px)');
      expect(html).toContain('@media (max-width: 440px)');
    });
  });

  describe('verifyEmailPage (OTP UI)', () => {
    it('is viewport-locked and styled like loginPage without a card container', () => {
      const html = verifyEmailPage('user@example.com', '', undefined, true, '/profile');

      expect(html).toContain('viewport-fit=cover');
      expect(html).toContain('height: 100dvh;');
      expect(html).toContain('overflow: hidden;');
      expect(html).toContain('class="auth-wrap"');
      expect(html).toContain('class="auth-brand"');
      expect(html).toContain('class="pill-input');
      expect(html).toContain('class="btn-pill-primary"');
      expect(html).not.toContain('class="card"');
    });
  });

  describe('mfaChallengePage (Two-Factor Verification UI)', () => {
    it('is viewport-locked and styled like loginPage without split layout card', () => {
      const html = mfaChallengePage('pending-123', true, true, true);

      expect(html).toContain('viewport-fit=cover');
      expect(html).toContain('height: 100dvh;');
      expect(html).toContain('overflow: hidden;');
      expect(html).toContain('class="auth-wrap"');
      expect(html).toContain('class="auth-brand"');
      expect(html).toContain('class="btn-pill-primary"');
      expect(html).not.toContain('class="auth-card"');
      expect(html).not.toContain('class="auth-visual-side"');
    });
  });
});

