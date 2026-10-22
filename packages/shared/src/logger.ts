import pino, { type Logger } from 'pino';
import crypto from 'node:crypto';

if (typeof process?.setMaxListeners === 'function' && typeof process?.getMaxListeners === 'function') {
  process.setMaxListeners(Math.max(process.getMaxListeners(), 50));
}

const SENSITIVE_HEADER_PATHS = [
  'req.headers.x-internal-shared-secret',
  'req.headers.x-supabase-access-token',
  'req.headers.authorization',
  'req.headers.cookie',
];

const loggers = new Map<string, Logger>();

export function createLogger(name: string): Logger {
  let logger = loggers.get(name);
  if (!logger) {
    const isWorker = Boolean(
      process.env.CLOUDFLARE_WORKER ||
      process.env.WORKER ||
      (typeof navigator !== 'undefined' && (navigator as any).userAgent === 'Cloudflare-Workers')
    );
    const isProduction = process.env.NODE_ENV === 'production';
    const level = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');
    const usePretty = !isProduction && !isWorker && typeof process?.versions?.node === 'string';

    logger = pino({
      name,
      level,
      base: { service: name },
      redact: {
        paths: SENSITIVE_HEADER_PATHS,
        censor: '[REDACTED]',
      },
      ...(usePretty
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    });
    loggers.set(name, logger);
  }
  return logger;
}

export function httpLogger(name: string) {
  const logger = createLogger(name);

  return (req: any, res: any, next: (err?: any) => void) => {
    const rawHeader = req.headers?.['x-request-id'];
    const existing = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const reqId =
      typeof existing === 'string' && existing.length > 0 && existing.length <= 128
        ? existing
        : crypto.randomUUID();

    if (typeof res.setHeader === 'function') {
      res.setHeader('x-request-id', reqId);
    }

    const childLogger = logger.child({ reqId });
    req.log = childLogger;
    req.id = reqId;

    const startTime = Date.now();

    const onFinished = () => {
      if (typeof res.removeListener === 'function') {
        res.removeListener('finish', onFinished);
        res.removeListener('close', onFinished);
      }

      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode || 200;

      const meta = {
        req: {
          id: reqId,
          method: req.method,
          url: req.originalUrl || req.url,
          headers: req.headers,
        },
        res: {
          statusCode,
        },
        responseTime,
      };

      const msg = `${req.method} ${req.originalUrl || req.url} ${statusCode} in ${responseTime}ms`;
      if (statusCode >= 500) {
        childLogger.error(meta, msg);
      } else if (statusCode >= 400) {
        childLogger.warn(meta, msg);
      } else {
        childLogger.debug(meta, msg);
      }
    };

    if (typeof res.once === 'function') {
      res.once('finish', onFinished);
      res.once('close', onFinished);
    }

    next();
  };
}