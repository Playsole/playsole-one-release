import type { Server } from 'node:http';
import type { Logger } from 'pino';

export interface ShutdownOptions {
  logger: Logger;
  servers: Server[];
  onClose?: () => Promise<void>;
  graceMs?: number;
}

export function setupGracefulShutdown(opts: ShutdownOptions): void {
  const { logger, servers, onClose, graceMs = 15000 } = opts;
  if (typeof process?.setMaxListeners === 'function' && typeof process?.getMaxListeners === 'function') {
    process.setMaxListeners(Math.max(process.getMaxListeners(), 30));
  }
  let shuttingDown = false;

  const sockets = new Set<any>();
  for (const server of servers) {
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
  }

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    const forceTimer = setTimeout(() => {
      logger.error('graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, graceMs);
    (forceTimer as any).unref?.();

    for (const server of servers) {
      server.close(() => {});
    }
    for (const socket of sockets) {
      socket.end();
    }

    try {
      await onClose?.();
    } finally {
      clearTimeout(forceTimer);
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}