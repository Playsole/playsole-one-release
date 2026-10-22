import { randomUUID } from 'node:crypto';
import { getSupabase } from './db';
import { createLogger } from './logger';

const logger = createLogger('shared');

export interface AuditEventInput {
  eventType: string;
  userId?: string;
  clientId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an append-only event to the audit_log table.
 * Fire-and-forget: errors are logged but never thrown, so audit failures
 * never block the request path.
 */
export async function audit(event: AuditEventInput): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('audit_log').insert({
      id: randomUUID(),
      event_type: event.eventType,
      user_id: event.userId ?? null,
      client_id: event.clientId ?? null,
      tenant_id: event.tenantId ?? null,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      logger.error({ err: error.message }, 'failed to write audit event');
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'unexpected audit error');
  }
}
