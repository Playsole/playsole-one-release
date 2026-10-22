import { getSupabase, getRedisClient, pingDatabase, pingRedis, logAudit } from '@playsole-one/shared';
import crypto from 'node:crypto';

export interface HealthResult {
  status: 'ok' | 'degraded' | 'down';
  database: boolean;
  redis: boolean;
  timestamp: string;
}

export async function checkSystemHealth(): Promise<HealthResult> {
  const [dbOk, redisOk] = await Promise.all([
    pingDatabase().catch(() => false),
    pingRedis().catch(() => false),
  ]);

  const status = dbOk && redisOk ? 'ok' : dbOk || redisOk ? 'degraded' : 'down';

  return {
    status,
    database: dbOk,
    redis: redisOk,
    timestamp: new Date().toISOString(),
  };
}

export interface ClientSummary {
  id: string;
  client_id: string;
  name?: string;
  redirect_uris: string[];
  grant_types: string[];
  scopes: string[];
  is_first_party: boolean;
  created_at: string;
}

export async function listOAuthClients(): Promise<ClientSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select('id, client_id, name, redirect_uris, grant_types, scopes, is_first_party, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list clients: ${error.message}`);
  }

  return data ?? [];
}

export async function registerOAuthClient(params: {
  clientId: string;
  name: string;
  redirectUris: string[];
  scopes?: string[];
  isFirstParty?: boolean;
}): Promise<{ clientId: string; clientSecret: string }> {
  const supabase = getSupabase();
  const clientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
  const secretHash = crypto.createHash('sha256').update(clientSecret).digest('hex');

  const { error } = await supabase.from('clients').insert({
    client_id: params.clientId,
    name: params.name,
    client_secret: secretHash,
    redirect_uris: params.redirectUris,
    scopes: params.scopes ?? ['openid', 'profile', 'email'],
    grant_types: ['authorization_code', 'refresh_token'],
    is_first_party: params.isFirstParty ?? false,
    public_client: false,
  });

  if (error) {
    throw new Error(`Failed to register client: ${error.message}`);
  }

  await logAudit({
    event_type: 'mcp.client.registered',
    client_id: params.clientId,
    metadata: { name: params.name, redirectUris: params.redirectUris },
  });

  return {
    clientId: params.clientId,
    clientSecret,
  };
}

export async function rotateOAuthClientSecret(clientId: string): Promise<{ clientId: string; newClientSecret: string }> {
  const supabase = getSupabase();
  const newSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
  const secretHash = crypto.createHash('sha256').update(newSecret).digest('hex');

  const { error } = await supabase
    .from('clients')
    .update({ client_secret: secretHash })
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to rotate client secret: ${error.message}`);
  }

  await logAudit({
    event_type: 'mcp.client.secret_rotated',
    client_id: clientId,
  });

  return {
    clientId,
    newClientSecret: newSecret,
  };
}

export async function inspectUser(identifier: { userId?: string; email?: string }): Promise<any> {
  const supabase = getSupabase();
  let query = supabase.from('users').select('*');

  if (identifier.userId) {
    query = query.eq('id', identifier.userId);
  } else if (identifier.email) {
    query = query.eq('primary_email', identifier.email);
  } else {
    throw new Error('Either userId or email must be provided');
  }

  const { data, error } = await query.single();
  if (error) {
    throw new Error(`User not found: ${error.message}`);
  }

  return data;
}

export async function queryAuditLogs(filter: {
  eventType?: string;
  userId?: string;
  clientId?: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = getSupabase();
  let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false });

  if (filter.eventType) {
    query = query.eq('event_type', filter.eventType);
  }
  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.clientId) {
    query = query.eq('client_id', filter.clientId);
  }

  const limit = Math.min(filter.limit ?? 50, 100);
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to query audit logs: ${error.message}`);
  }

  return data ?? [];
}
