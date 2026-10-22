import { describe, expect, it } from 'vitest';
import { mfaChallengePage } from '../../gateway/src/views';

describe('mfaChallengePage rendering', () => {
  it('defaults to TOTP authenticator form when hasTotp and hasBackupCodes are true', () => {
    const html = mfaChallengePage('pending-123', false, true, true);
    // Panel TOTP should be active
    expect(html).toContain('id="panelTotp" role="tabpanel"');
    expect(html).toContain('class="mfa-panel active" id="panelTotp"');
    // Panel backup should NOT be active by default
    expect(html).toContain('class="mfa-panel " id="panelBackup"');
    // Backup code should not be a primary tab
    expect(html).not.toContain('id="tabBackup"');
    // Fallback toggle button should be present
    expect(html).toContain('id="switchToBackupBtn"');
    expect(html).toContain('Use a backup code');
  });

  it('defaults to Passkey when user only has WebAuthn', () => {
    const html = mfaChallengePage('pending-123', true, false, true);
    expect(html).toContain('class="mfa-panel active" id="panelWebAuthn"');
    expect(html).toContain('class="mfa-panel " id="panelBackup"');
    expect(html).toContain('id="switchToBackupBtn"');
  });

  it('shows App and Passkey tabs when user has both, but never Backup Code as a tab', () => {
    const html = mfaChallengePage('pending-123', true, true, true);
    expect(html).toContain('id="tabTotp"');
    expect(html).toContain('id="tabWebAuthn"');
    expect(html).not.toContain('id="tabBackup"');
  });

  it('activates backup code panel when activeMode is backup or backup error occurs', () => {
    const htmlMode = mfaChallengePage('pending-123', false, true, true, undefined, 'backup');
    expect(htmlMode).toContain('class="mfa-panel active" id="panelBackup"');
    expect(htmlMode).toContain('class="mfa-panel " id="panelTotp"');

    const htmlError = mfaChallengePage('pending-123', false, true, true, 'Invalid backup code');
    expect(htmlError).toContain('class="mfa-panel active" id="panelBackup"');
  });
});
