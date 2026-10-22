import { getSupabase, getSupabaseForUser } from '@playsole-one/shared';

export async function getProfile(userId: string, tenantId?: string, accessToken?: string) {
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  let query = supabase.from('profiles').select('*').eq('user_id', userId);
  if (tenantId) query = query.eq('tenant_id', tenantId) as any;
  const { data } = await query.maybeSingle();
  if (!data) return undefined;

  return {
    id: data.id, userId: data.user_id, tenantId: data.tenant_id,
    email: data.email, displayName: data.display_name,
    avatarUrl: data.avatar_url ?? undefined, locale: data.locale,
    emailVerified: data.email_verified ?? false,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}

export async function updateProfile(userId: string, data: { displayName?: string; avatarUrl?: string | null; locale?: string }, tenantId?: string, accessToken?: string) {
  const existing = await getProfile(userId, tenantId, accessToken);
  if (!existing) return undefined;

  const updates: Record<string, any> = {};
  if (data.displayName !== undefined) updates.display_name = data.displayName;
  if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl || null;
  if (data.locale !== undefined) updates.locale = data.locale;
  if (Object.keys(updates).length === 0) return existing;

  updates.updated_at = new Date().toISOString();
  const supabase = accessToken ? getSupabaseForUser(accessToken) : getSupabase();
  let query = supabase.from('profiles').update(updates).eq('user_id', userId);
  if (tenantId) query = query.eq('tenant_id', tenantId) as any;
  const { error } = await query;
  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  // Synchronize changes to the users table so all OIDC, SSO, avatar CDN, and admin endpoints reflect the new avatar and display name immediately
  const userUpdates: Record<string, any> = {};
  if (data.displayName !== undefined) userUpdates.display_name = data.displayName;
  if (data.avatarUrl !== undefined) userUpdates.avatar_url = data.avatarUrl || null;
  if (data.locale !== undefined) userUpdates.locale = data.locale;
  if (Object.keys(userUpdates).length > 0) {
    try {
      await getSupabase().from('users').update(userUpdates).eq('id', userId);
    } catch {
      // Non-blocking fallback
    }
  }

  return getProfile(userId, tenantId, accessToken);
}

export async function createProfile(id: string, email: string, displayName: string, tenantId: string) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabase().from('profiles').insert({
    user_id: id, tenant_id: tenantId, email,
    display_name: displayName, locale: 'en',
  }).select().single();
  if (error) throw new Error(`Failed to create profile: ${error.message}`);
  return {
    id: data.id, userId: data.user_id, tenantId: data.tenant_id,
    email: data.email, displayName: data.display_name,
    avatarUrl: data.avatar_url ?? undefined, locale: data.locale,
    emailVerified: data.email_verified ?? false,
    createdAt: data.created_at, updatedAt: data.updated_at,
  };
}
