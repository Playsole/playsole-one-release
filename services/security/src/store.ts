import { randomUUID, createHash } from 'node:crypto';
import { getSupabase } from '@playsole-one/shared';

// ── Users / MFA state ──

export interface UserMfaState {
  mfaEnabled: boolean;
  mfaMethods: Array<{ type: string; id: string; name?: string; createdAt: string }>;
}

export async function findUserByEmail(email: string): Promise<{ id: string; tenantId: string; email: string } | undefined> {
  const { data } = await getSupabase()
    .from('users').select('id, tenant_id, primary_email').eq('primary_email', email).maybeSingle();
  if (!data) return undefined;
  return { id: data.id, tenantId: data.tenant_id, email: data.primary_email };
}

export async function getUserMfaState(userId: string): Promise<UserMfaState> {
  const { data } = await getSupabase().from('users').select('mfa_enabled, mfa_methods').eq('id', userId).maybeSingle();
  return {
    mfaEnabled: data?.mfa_enabled ?? false,
    mfaMethods: data?.mfa_methods ?? [],
  };
}

export async function setUserMfaState(userId: string, enabled: boolean, methods: Array<{ type: string; id: string; name?: string; createdAt: string }>): Promise<void> {
  const { error } = await getSupabase()
    .from('users')
    .update({ mfa_enabled: enabled, mfa_methods: methods })
    .eq('id', userId);
  if (error) throw new Error(`Failed to update MFA state: ${error.message}`);
}

// ── TOTP ──

export interface TotpMethod {
  id: string;
  userId: string;
  secret: string;
  name: string;
  verified: boolean;
  createdAt: string;
}

function toTotp(row: any): TotpMethod {
  return {
    id: row.id, userId: row.user_id, secret: row.secret,
    name: row.name, verified: row.verified,
    createdAt: row.created_at,
  };
}

export async function createTotpSecret(userId: string, secret: string, name = 'Authenticator app'): Promise<TotpMethod> {
  const id = randomUUID();
  const { error } = await getSupabase().from('totp_secrets').insert({
    id, user_id: userId, secret, name,
  });
  if (error) throw new Error(`Failed to create TOTP secret: ${error.message}`);
  return { id, userId, secret, name, verified: false, createdAt: new Date().toISOString() };
}

export async function getTotpSecret(id: string, userId: string): Promise<TotpMethod | undefined> {
  const { data } = await getSupabase()
    .from('totp_secrets').select('*')
    .eq('id', id).eq('user_id', userId).maybeSingle();
  return data ? toTotp(data) : undefined;
}

export async function getVerifiedTotp(userId: string): Promise<TotpMethod | undefined> {
  const { data } = await getSupabase()
    .from('totp_secrets').select('*')
    .eq('user_id', userId).eq('verified', true).maybeSingle();
  return data ? toTotp(data) : undefined;
}

export async function listTotpMethods(userId: string): Promise<TotpMethod[]> {
  const { data } = await getSupabase()
    .from('totp_secrets').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  return (data ?? []).map(toTotp);
}

export async function markTotpVerified(id: string, userId: string): Promise<TotpMethod | undefined> {
  const { data, error } = await getSupabase()
    .from('totp_secrets').update({ verified: true })
    .eq('id', id).eq('user_id', userId)
    .select().maybeSingle();
  if (error) throw new Error(`Failed to verify TOTP: ${error.message}`);
  return data ? toTotp(data) : undefined;
}

export async function deleteTotpSecret(id: string, userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('totp_secrets').delete()
    .eq('id', id).eq('user_id', userId)
    .select().maybeSingle();
  return !!data;
}

// ── WebAuthn ──

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceLabel: string;
  transports: string[];
  createdAt: string;
  lastUsedAt?: string;
}

function toCredential(row: any): WebAuthnCredential {
  return {
    id: row.id, userId: row.user_id, credentialId: row.credential_id,
    publicKey: row.public_key, counter: row.counter, deviceLabel: row.device_label,
    transports: row.transports ?? [], createdAt: row.created_at, lastUsedAt: row.last_used_at ?? undefined,
  };
}

export async function listWebAuthnCredentials(userId: string): Promise<WebAuthnCredential[]> {
  const { data } = await getSupabase()
    .from('webauthn_credentials').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  return (data ?? []).map(toCredential);
}

export async function getWebAuthnCredential(credentialId: string, userId: string): Promise<WebAuthnCredential | undefined> {
  const { data } = await getSupabase()
    .from('webauthn_credentials').select('*')
    .eq('credential_id', credentialId).eq('user_id', userId).maybeSingle();
  return data ? toCredential(data) : undefined;
}

export async function createWebAuthnCredential(
  userId: string, credentialId: string, publicKey: string, deviceLabel: string, transports: string[],
): Promise<WebAuthnCredential> {
  const id = randomUUID();
  const { error } = await getSupabase().from('webauthn_credentials').insert({
    id, user_id: userId, credential_id: credentialId, public_key: publicKey,
    device_label: deviceLabel, transports,
  });
  if (error) throw new Error(`Failed to store credential: ${error.message}`);
  return { id, userId, credentialId, publicKey, counter: 0, deviceLabel, transports, createdAt: new Date().toISOString() };
}

export async function updateCredentialCounter(id: string, userId: string, counter: number): Promise<void> {
  const { error } = await getSupabase()
    .from('webauthn_credentials')
    .update({ counter, last_used_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', userId);
  if (error) throw new Error(`Failed to update credential counter: ${error.message}`);
}

export async function deleteWebAuthnCredential(id: string, userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('webauthn_credentials').delete()
    .eq('id', id).eq('user_id', userId)
    .select().maybeSingle();
  return !!data;
}

// ── MFA challenges (WebAuthn handshakes) ──

export interface MfaChallenge {
  id: string;
  userId?: string;
  challenge: string;
  kind: 'registration' | 'authentication';
  payload: Record<string, unknown>;
  expiresAt: string;
}

export async function createMfaChallenge(
  challenge: string, kind: 'registration' | 'authentication', userId: string | undefined,
  payload: Record<string, unknown>, ttlSec = 300,
): Promise<void> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const { error } = await getSupabase().from('mfa_challenges').insert({
    id, user_id: userId ?? null, challenge, kind, payload, expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create MFA challenge: ${error.message}`);
}

/** Consume (single-use) a stored challenge, returning its payload if valid. */
export async function consumeMfaChallenge(challenge: string, kind: 'registration' | 'authentication'): Promise<{ userId?: string; payload: Record<string, unknown> } | null> {
  const { data } = await getSupabase()
    .from('mfa_challenges').delete()
    .eq('challenge', challenge).eq('kind', kind)
    .gt('expires_at', new Date().toISOString())
    .select().maybeSingle();
  if (!data) return null;
  return { userId: data.user_id ?? undefined, payload: data.payload ?? {} };
}

// ── Backup codes ──

export interface BackupCodeRow {
  id: string;
  userId: string;
  codeHash: string;
  used: boolean;
  usedAt?: string;
  createdAt: string;
}

export async function createBackupCodes(userId: string, hashes: string[]): Promise<void> {
  const rows = hashes.map((h) => ({ id: randomUUID(), user_id: userId, code_hash: h }));
  const { error } = await getSupabase().from('backup_codes').insert(rows);
  if (error) throw new Error(`Failed to store backup codes: ${error.message}`);
}

export async function getBackupCodeStats(userId: string): Promise<{ total: number; used: number }> {
  const { data } = await getSupabase()
    .from('backup_codes').select('used').eq('user_id', userId);
  const rows = data ?? [];
  return { total: rows.length, used: rows.filter((r) => r.used).length };
}

/** Atomically consume a single-use backup code. Returns true on first match. */
export async function consumeBackupCode(userId: string, codeHash: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('backup_codes')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('user_id', userId).eq('code_hash', codeHash).eq('used', false)
    .select().maybeSingle();
  return !!data;
}

export async function deleteBackupCodes(userId: string): Promise<void> {
  const { error } = await getSupabase().from('backup_codes').delete().eq('user_id', userId);
  if (error) throw new Error(`Failed to delete backup codes: ${error.message}`);
}

// ── Devices ──

export interface Device {
  id: string;
  userId: string;
  fingerprint: string;
  label: string;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  trusted: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

function toDevice(row: any): Device {
  return {
    id: row.id, userId: row.user_id, fingerprint: row.fingerprint, label: row.label,
    userAgent: row.user_agent ?? undefined, ipAddress: row.ip_address ?? undefined,
    country: row.country ?? undefined, city: row.city ?? undefined,
    trusted: row.trusted, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at,
  };
}

export async function listDevices(userId: string): Promise<Device[]> {
  const { data } = await getSupabase()
    .from('devices').select('*').eq('user_id', userId)
    .order('last_seen_at', { ascending: false });
  return (data ?? []).map(toDevice);
}

export async function getDevice(id: string, userId: string): Promise<Device | undefined> {
  const { data } = await getSupabase()
    .from('devices').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  return data ? toDevice(data) : undefined;
}

export async function upsertDevice(device: {
  userId: string; fingerprint: string; label: string; userAgent?: string;
  ipAddress?: string; country?: string; city?: string; trusted?: boolean;
}): Promise<Device> {
  const supabase = getSupabase();
  const existing = await getDeviceByFingerprint(device.userId, device.fingerprint);
  if (existing) {
    const { data, error } = await supabase
      .from('devices')
      .update({
        user_agent: device.userAgent ?? existing.userAgent ?? null,
        ip_address: device.ipAddress ?? existing.ipAddress ?? null,
        country: device.country ?? existing.country ?? null,
        city: device.city ?? existing.city ?? null,
        trusted: device.trusted ?? existing.trusted,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select().maybeSingle();
    if (error) throw new Error(`Failed to update device: ${error.message}`);
    return data ? toDevice(data) : existing;
  }

  const id = randomUUID();
  const { data, error } = await supabase.from('devices').insert({
    id,
    user_id: device.userId,
    fingerprint: device.fingerprint,
    label: device.label,
    user_agent: device.userAgent ?? null,
    ip_address: device.ipAddress ?? null,
    country: device.country ?? null,
    city: device.city ?? null,
    trusted: device.trusted ?? false,
  }).select().maybeSingle();
  if (error) throw new Error(`Failed to create device: ${error.message}`);
  return toDevice(data);
}

async function getDeviceByFingerprint(userId: string, fingerprint: string): Promise<Device | undefined> {
  const { data } = await getSupabase()
    .from('devices').select('*')
    .eq('user_id', userId).eq('fingerprint', fingerprint).maybeSingle();
  return data ? toDevice(data) : undefined;
}

export async function setDeviceTrusted(id: string, userId: string, trusted: boolean): Promise<Device | undefined> {
  const { data, error } = await getSupabase()
    .from('devices').update({ trusted })
    .eq('id', id).eq('user_id', userId)
    .select().maybeSingle();
  if (error) throw new Error(`Failed to update device: ${error.message}`);
  return data ? toDevice(data) : undefined;
}

export async function deleteDevice(id: string, userId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('devices').delete().eq('id', id).eq('user_id', userId).select().maybeSingle();
  return !!data;
}

// ── MFA policies ──

export interface MfaPolicy {
  id: string;
  tenantId: string;
  clientId?: string;
  required: boolean;
}

export async function getMfaPolicy(tenantId: string, clientId?: string): Promise<MfaPolicy | undefined> {
  if (clientId) {
    const { data } = await getSupabase()
      .from('mfa_policies').select('*')
      .eq('tenant_id', tenantId).eq('client_id', clientId).maybeSingle();
    if (data) return { id: data.id, tenantId: data.tenant_id, clientId: data.client_id ?? undefined, required: data.required };
  }
  const { data: tenantPolicy } = await getSupabase()
    .from('mfa_policies').select('*')
    .eq('tenant_id', tenantId).is('client_id', null).maybeSingle();
  if (tenantPolicy) return { id: tenantPolicy.id, tenantId: tenantPolicy.tenant_id, required: tenantPolicy.required };
  return undefined;
}

/** Resolve the effective MFA requirement: tenant-wide default, then per-client override. */
export async function isMfaRequired(tenantId: string, clientId?: string): Promise<boolean> {
  if (clientId) {
    const { data } = await getSupabase()
      .from('mfa_policies').select('required')
      .eq('tenant_id', tenantId).eq('client_id', clientId).maybeSingle();
    if (data) return data.required;
  }
  const { data: tenantPolicy } = await getSupabase()
    .from('mfa_policies').select('required')
    .eq('tenant_id', tenantId).is('client_id', null).maybeSingle();
  return tenantPolicy?.required ?? false;
}

export async function setMfaPolicy(tenantId: string, clientId: string | null, required: boolean): Promise<void> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('mfa_policies').select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId === null ? null : clientId)
    .maybeSingle();
  if (data) {
    const { error } = await supabase
      .from('mfa_policies').update({ required, updated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (error) throw new Error(`Failed to update MFA policy: ${error.message}`);
    return;
  }
  const { error } = await supabase.from('mfa_policies').insert({
    id: randomUUID(), tenant_id: tenantId, client_id: clientId, required,
  });
  if (error) throw new Error(`Failed to create MFA policy: ${error.message}`);
}

// ── Recovery tokens ──

export async function createRecoveryToken(userId: string, ttlSec = 1800): Promise<string> {
  const token = randomUUID();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const { error } = await getSupabase().from('recovery_tokens').insert({
    token: tokenHash, user_id: userId, expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create recovery token: ${error.message}`);
  return token;
}

export async function consumeRecoveryToken(token: string): Promise<{ userId: string } | null> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data } = await getSupabase()
    .from('recovery_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', tokenHash).is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select().maybeSingle();
  if (!data) return null;
  return { userId: data.user_id };
}