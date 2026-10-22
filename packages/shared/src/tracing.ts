import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export interface TraceContext {
  traceId: string;
  spanId: string;
  sampled: boolean;
}

const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export function parseTraceparent(header?: string): TraceContext | null {
  if (!header) return null;
  const match = header.trim().match(TRACEPARENT_REGEX);
  if (!match) return null;
  return {
    traceId: match[1],
    spanId: match[2],
    sampled: match[3] === '01',
  };
}

export function generateTraceparent(existingTraceId?: string): { header: string; context: TraceContext } {
  const traceId = existingTraceId || crypto.randomBytes(16).toString('hex');
  const spanId = crypto.randomBytes(8).toString('hex');
  const header = `00-${traceId}-${spanId}-01`;
  return {
    header,
    context: {
      traceId,
      spanId,
      sampled: true,
    },
  };
}

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
      spanId?: string;
      traceparent?: string;
    }
  }
}

/**
 * Distributed tracing middleware
 * Extracts or generates W3C traceparent header and attaches to Request object
 * and response headers for cross-service observability.
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingHeader = req.headers['traceparent'] as string | undefined;
  const parsed = parseTraceparent(incomingHeader);

  const traceId = parsed?.traceId || crypto.randomBytes(16).toString('hex');
  const { header, context } = generateTraceparent(traceId);

  req.traceId = context.traceId;
  req.spanId = context.spanId;
  req.traceparent = header;

  res.setHeader('traceparent', header);
  if (req.headers['x-request-id']) {
    res.setHeader('x-request-id', req.headers['x-request-id'] as string);
  }

  next();
}

/**
 * Helper to produce cross-service forwarding headers with traceparent and correlation IDs
 */
export function traceHeaders(req: Request, additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  if (req.traceparent) {
    headers['traceparent'] = req.traceparent;
  }
  const reqId = (req.headers['x-request-id'] as string) || req.traceId;
  if (reqId) {
    headers['x-request-id'] = reqId;
  }

  return headers;
}
