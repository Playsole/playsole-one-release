import crypto from 'node:crypto';
import { createLogger } from './logger';

const logger = createLogger('shared:webhooks');

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookSubscription {
  id: string;
  endpointUrl: string;
  secret: string;
  events: string[]; // e.g. ['user.created', 'user.deleted', 'user.suspended']
  active: boolean;
}

// In-memory / dynamic registry for subscribed webhook endpoints
const subscriptions: WebhookSubscription[] = [];

export function registerWebhook(sub: Omit<WebhookSubscription, 'id'>): WebhookSubscription {
  const newSub: WebhookSubscription = {
    id: crypto.randomUUID(),
    ...sub,
  };
  subscriptions.push(newSub);
  return newSub;
}

export function listWebhooks(): WebhookSubscription[] {
  return [...subscriptions];
}

export function removeWebhook(id: string): boolean {
  const index = subscriptions.findIndex((s) => s.id === id);
  if (index !== -1) {
    subscriptions.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Dispatches an account event to all matching webhook subscriptions
 * Signs with HMAC-SHA256 for cryptographic verification
 */
export async function dispatchWebhook(event: string, data: Record<string, unknown>): Promise<void> {
  const matching = subscriptions.filter((s) => s.active && (s.events.includes(event) || s.events.includes('*')));

  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadJson = JSON.stringify(payload);

  for (const sub of matching) {
    const deliveryId = crypto.randomUUID();
    const signature = crypto.createHmac('sha256', sub.secret).update(payloadJson).digest('hex');

    // Asynchronous dispatch with timeout
    fetch(sub.endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Playsole-One-Webhook/1.0',
        'x-playsole-delivery': deliveryId,
        'x-playsole-event': event,
        'x-playsole-signature': `sha256=${signature}`,
      },
      body: payloadJson,
      signal: AbortSignal.timeout(5000),
    }).catch((err) => {
      logger.warn({ err: err.message, endpoint: sub.endpointUrl, deliveryId }, 'webhook delivery failed');
    });
  }
}
