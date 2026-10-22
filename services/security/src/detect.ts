// Suspicious-activity heuristics: new device, new IP, new location and
// impossible travel. Pure functions so they are unit-testable without a DB.

export interface RiskContext {
  fingerprint: string;
  ipAddress?: string;
  country?: string;
  city?: string;
}

export interface KnownDeviceRisk extends RiskContext {
  lastSeenAt: string;
  trusted: boolean;
}

export interface RiskOptions {
  nowMs?: number;
  newLocationWindowMs?: number;
}

export interface RiskResult {
  signals: string[];
  isNewDevice: boolean;
  isNewIp: boolean;
  isNewLocation: boolean;
  impossibleTravel: boolean;
}

export function detectRiskSignals(
  current: RiskContext,
  knownDevices: KnownDeviceRisk[],
  opts: RiskOptions = {},
): RiskResult {
  const nowMs = opts.nowMs ?? Date.now();
  const newLocationWindowMs = opts.newLocationWindowMs ?? 2 * 60 * 60 * 1000;
  const signals = new Set<string>();

  const existing = knownDevices.find((d) => d.fingerprint === current.fingerprint);
  const isNewDevice = !existing;
  if (isNewDevice) signals.add('new_device');
  else if (!existing.trusted) signals.add('untrusted_device');

  // Same device, different IP than last seen.
  const isNewIp = Boolean(existing && current.ipAddress && existing.ipAddress && existing.ipAddress !== current.ipAddress);
  if (isNewIp) signals.add('new_ip');

  let isNewLocation = false;
  let impossibleTravel = false;

  if (current.country) {
    // Any known device (including this one) seen in a different country within
    // the window is treated as impossible travel — reaching here that fast is
    // physically implausible.
    for (const d of knownDevices) {
      if (!d.country || d.country === current.country) continue;
      const since = nowMs - new Date(d.lastSeenAt).getTime();
      if (since >= 0 && since <= newLocationWindowMs) {
        impossibleTravel = true;
        break;
      }
    }

    if (impossibleTravel) {
      signals.add('impossible_travel');
    } else if (existing && existing.country && existing.country !== current.country) {
      isNewLocation = true;
      signals.add('new_location');
    } else if (existing && current.city && existing.city && existing.city !== current.city) {
      signals.add('new_city');
    }
  }

  return {
    signals: [...signals],
    isNewDevice,
    isNewIp,
    isNewLocation,
    impossibleTravel,
  };
}