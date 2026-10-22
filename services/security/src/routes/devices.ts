import { Router } from 'express';
import { z } from 'zod';
import { audit, formatDeviceLabel, cleanIp } from '@playsole-one/shared';
import { listDevices, upsertDevice, setDeviceTrusted, deleteDevice, getDevice } from '../store';
import { detectRiskSignals } from '../detect';

const router = Router();

function requireUser(req: Record<string, any>, res: any): { userId: string; tenantId?: string } | null {
  const userId = req.headers['x-authenticated-user-id'];
  if (userId && typeof userId === 'string') {
    const tenantId = req.headers['x-tenant-id'];
    return { userId, tenantId: typeof tenantId === 'string' ? tenantId : undefined };
  }
  res.status(401).json({ error: 'invalid_token', error_description: 'Missing or invalid authentication.' });
  return null;
}

/** List the user's known devices (for the session/security UI). */
router.get('/devices', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const devices = await listDevices(auth.userId);
  res.json({ devices });
});

/**
 * Report the device currently being used. The gateway calls this on login and
 * MFA step-up so new devices / locations / impossible travel are flagged and
 * audited before the session is trusted.
 */
router.post('/devices', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const parsed = z.object({
    fingerprint: z.string().min(1),
    label: z.string().min(1).max(120).optional(),
    userAgent: z.string().max(500).optional(),
    ipAddress: z.string().max(64).optional(),
    country: z.string().max(64).optional(),
    city: z.string().max(64).optional(),
  }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }
  const input = parsed.data;

  const known = await listDevices(auth.userId);
  const current = {
    fingerprint: input.fingerprint,
    ipAddress: input.ipAddress ? cleanIp(input.ipAddress) : undefined,
    country: input.country,
    city: input.city,
  };
  const risk = detectRiskSignals(current, known);

  const label = (input.label && input.label !== 'Web browser') ? input.label : formatDeviceLabel(input.userAgent);
  const device = await upsertDevice({
    userId: auth.userId,
    fingerprint: input.fingerprint,
    label,
    userAgent: input.userAgent,
    ipAddress: current.ipAddress,
    country: input.country,
    city: input.city,
    trusted: risk.signals.length === 0,
  });

  if (risk.signals.length > 0) {
    void audit({
      eventType: 'security.suspicious_activity',
      userId: auth.userId,
      tenantId: auth.tenantId,
      metadata: { deviceId: device.id, signals: risk.signals, country: input.country ?? null, city: input.city ?? null },
    });
  }

  res.status(201).json({ device, riskSignals: risk.signals });
});

router.patch('/devices/:id', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const existing = await getDevice(req.params.id, auth.userId);
  if (!existing) {
    res.status(404).json({ error: 'not_found', error_description: 'Device not found.' });
    return;
  }

  const parsed = z.object({
    trusted: z.boolean().optional(),
    label: z.string().min(1).max(120).optional(),
  }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request', error_description: parsed.error.issues[0]?.message });
    return;
  }

  if (parsed.data.trusted !== undefined) {
    await setDeviceTrusted(req.params.id, auth.userId, parsed.data.trusted);
    void audit({
      eventType: parsed.data.trusted ? 'device.trusted' : 'device.untrusted',
      userId: auth.userId,
      tenantId: auth.tenantId,
      metadata: { deviceId: req.params.id },
    });
  }
  const updated = await getDevice(req.params.id, auth.userId);
  res.json({ device: updated });
});

router.delete('/devices/:id', async (req, res) => {
  const auth = requireUser(req, res);
  if (!auth) return;

  const removed = await deleteDevice(req.params.id, auth.userId);
  if (!removed) {
    res.status(404).json({ error: 'not_found', error_description: 'Device not found.' });
    return;
  }
  void audit({ eventType: 'device.removed', userId: auth.userId, tenantId: auth.tenantId, metadata: { deviceId: req.params.id } });
  res.json({ ok: true });
});

export { router as devicesRouter };