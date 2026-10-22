import { describe, expect, it } from 'vitest';
import { detectRiskSignals } from '../../services/security/src/detect';

const NOW = Date.parse('2025-01-01T12:00:00Z');

function device(overrides: Record<string, any> = {}) {
  return {
    fingerprint: 'dev-1',
    ipAddress: '1.2.3.4',
    country: 'US',
    city: 'NY',
    lastSeenAt: new Date(NOW - 60_000).toISOString(),
    trusted: true,
    ...overrides,
  };
}

describe('suspicious activity detection', () => {
  it('flags a brand-new device', () => {
    const result = detectRiskSignals({ fingerprint: 'dev-new', country: 'US' }, [device()], { nowMs: NOW });
    expect(result.isNewDevice).toBe(true);
    expect(result.signals).toContain('new_device');
  });

  it('does not flag a known trusted device from the same location', () => {
    const result = detectRiskSignals({ fingerprint: 'dev-1', ipAddress: '1.2.3.4', country: 'US', city: 'NY' }, [device()], { nowMs: NOW });
    expect(result.signals).toEqual([]);
  });

  it('flags a known device using a different IP', () => {
    const result = detectRiskSignals({ fingerprint: 'dev-1', ipAddress: '9.9.9.9', country: 'US', city: 'NY' }, [device()], { nowMs: NOW });
    expect(result.isNewIp).toBe(true);
    expect(result.signals).toContain('new_ip');
  });

  it('flags a known device seen in a different country (not impossible)', () => {
    const result = detectRiskSignals({ fingerprint: 'dev-1', ipAddress: '1.2.3.4', country: 'GB' }, [device({ lastSeenAt: new Date(NOW - 24 * 60 * 60 * 1000).toISOString() })], { nowMs: NOW });
    expect(result.isNewLocation).toBe(true);
    expect(result.signals).toContain('new_location');
  });

  it('flags impossible travel when another device is in a different country within the window', () => {
    const devices = [
      device({ lastSeenAt: new Date(NOW - 5 * 60 * 1000).toISOString() }),
      device({ fingerprint: 'dev-2', country: 'GB', city: 'LDN', lastSeenAt: new Date(NOW - 10 * 60 * 1000).toISOString() }),
    ];
    const result = detectRiskSignals({ fingerprint: 'dev-1', ipAddress: '1.2.3.4', country: 'US', city: 'NY' }, devices, { nowMs: NOW });
    expect(result.impossibleTravel).toBe(true);
    expect(result.signals).toContain('impossible_travel');
  });

  it('does not flag impossible travel when the other country is older than the window', () => {
    const devices = [
      device({ lastSeenAt: new Date(NOW - 5 * 60 * 1000).toISOString() }),
      device({ fingerprint: 'dev-2', country: 'GB', lastSeenAt: new Date(NOW - 5 * 60 * 60 * 1000).toISOString() }),
    ];
    const result = detectRiskSignals({ fingerprint: 'dev-1', ipAddress: '1.2.3.4', country: 'US', city: 'NY' }, devices, { nowMs: NOW });
    expect(result.impossibleTravel).toBe(false);
    expect(result.signals).not.toContain('impossible_travel');
  });

  it('flags an untrusted device', () => {
    const result = detectRiskSignals({ fingerprint: 'dev-1', ipAddress: '1.2.3.4', country: 'US', city: 'NY' }, [device({ trusted: false })], { nowMs: NOW });
    expect(result.signals).toContain('untrusted_device');
  });
});