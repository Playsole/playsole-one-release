import { randomUUID } from 'node:crypto';
import { getSupabase, getSupabaseForUser } from '@playsole-one/shared';

export async function createGrant(userId: string, clientId: string, scopes: string[], tenantId: string, accessToken?: string) {
  const id = randomUUID();
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  const { error } = await supabase.from('consents').insert({
    id, user_id: userId, tenant_id: tenantId, client_id: clientId, scopes,
  });
  if (error) throw new Error(`Failed to create grant: ${error.message}`);
  return { id, userId, tenantId, clientId, scopes, grantedAt: new Date().toISOString(), revokedAt: undefined };
}

export async function getGrant(id: string, tenantId?: string, accessToken?: string) {
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  let query = supabase.from('consents').select('*').eq('id', id);
  if (tenantId) query = query.eq('tenant_id', tenantId) as any;
  const { data } = await query.maybeSingle();
  if (!data) return undefined;
  return { id: data.id, userId: data.user_id, tenantId: data.tenant_id, clientId: data.client_id, scopes: data.scopes, grantedAt: data.granted_at, revokedAt: data.revoked_at ?? undefined };
}

export async function listGrants(userId: string, tenantId?: string, accessToken?: string) {
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  let query = supabase
    .from('consents')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });
  if (tenantId) query = query.eq('tenant_id', tenantId) as any;
  const { data } = await query;
  return (data ?? []).map((g: any) => ({
    id: g.id, userId: g.user_id, tenantId: g.tenant_id, clientId: g.client_id,
    scopes: g.scopes, grantedAt: g.granted_at, revokedAt: g.revoked_at ?? undefined,
  }));
}

export async function revokeGrant(id: string, tenantId?: string, accessToken?: string) {
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  let query = supabase
    .from('consents')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .is('revoked_at', null)
    .select();
  if (tenantId) query = query.eq('tenant_id', tenantId) as any;
  const { data } = await query.maybeSingle();
  return !!data;
}

export async function findGrant(userId: string, clientId: string, tenantId?: string, accessToken?: string) {
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  let query = supabase
    .from('consents')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .is('revoked_at', null);
  if (tenantId) query = query.eq('tenant_id', tenantId) as any;
  const { data } = await query.maybeSingle();
  if (!data) return undefined;
  return { id: data.id, userId: data.user_id, tenantId: data.tenant_id, clientId: data.client_id, scopes: data.scopes, grantedAt: data.granted_at, revokedAt: data.revoked_at ?? undefined };
}

export async function upsertGrant(userId: string, clientId: string, scopes: string[], tenantId: string, accessToken?: string) {
  const existing = await findGrant(userId, clientId, tenantId, accessToken);
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  if (existing) {
    const { error } = await supabase
      .from('consents')
      .update({ scopes, granted_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw new Error(`Failed to update grant: ${error.message}`);
    return { ...existing, scopes, grantedAt: new Date().toISOString() };
  }

  const id = randomUUID();
  const { error } = await supabase.from('consents').insert({
    id, user_id: userId, tenant_id: tenantId, client_id: clientId, scopes,
  });
  if (error) throw new Error(`Failed to create grant: ${error.message}`);
  return { id, userId, tenantId, clientId, scopes, grantedAt: new Date().toISOString(), revokedAt: undefined };
}
