import { Readable, PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';

export interface DispatchOptions {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string | Buffer | null;
}

const _serviceRegistry: Record<string, (req: any, res: any, next: (err?: any) => void) => void> = {};

export function registerInternalService(
  name: string,
  app: (req: any, res: any, next: (err?: any) => void) => void
): void {
  _serviceRegistry[name] = app;
}

export function getInternalService(
  name: string
): ((req: any, res: any, next: (err?: any) => void) => void) | undefined {
  return _serviceRegistry[name];
}

/**
 * In-process dispatcher that passes a request to an Express application and returns
 * a standard Web Response without requiring TCP network sockets.
 */
export async function dispatchToExpress(
  app: (req: any, res: any, next: (err?: any) => void) => void,
  url: string,
  options: DispatchOptions = {}
): Promise<Response> {
  return new Promise((resolve) => {
    const method = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    if (options.headers) {
      for (const [k, v] of Object.entries(options.headers)) {
        if (v !== undefined) {
          headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
        }
      }
    }

    const bodyBuffer = options.body
      ? Buffer.isBuffer(options.body)
        ? options.body
        : Buffer.from(options.body)
      : null;

    if (bodyBuffer && !headers['content-length']) {
      headers['content-length'] = String(bodyBuffer.length);
    }

    const reqStream = new Readable({
      read() {
        if (bodyBuffer) {
          this.push(bodyBuffer);
        }
        this.push(null);
      }
    });

    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const search = parsedUrl.search;

    const mockSocket = Object.assign(new PassThrough(), {
      remoteAddress: '127.0.0.1',
      encrypted: false,
    });

    const req: any = Object.assign(reqStream, {
      method,
      url: pathname + search,
      originalUrl: pathname + search,
      path: pathname,
      rawBody: bodyBuffer,
      headers,
      query: Object.fromEntries(parsedUrl.searchParams),
      connection: mockSocket,
      socket: mockSocket,
      protocol: 'http',
      secure: false,
      ip: '127.0.0.1',
      ips: [],
      subdomains: [],
      hostname: 'localhost',
      header(name: string) {
        return headers[name.toLowerCase()];
      },
      get(name: string) {
        return headers[name.toLowerCase()];
      },
    });

    const resHeaders: Record<string, string | string[]> = {};
    let statusCode = 200;
    const responseChunks: Buffer[] = [];

    const res: any = new EventEmitter();
    res.statusCode = 200;
    res.headersSent = false;
    res.setHeader = (key: string, value: any) => {
      const lower = key.toLowerCase();
      if (Array.isArray(value)) {
        resHeaders[lower] = value.map(String);
      } else {
        resHeaders[lower] = String(value);
      }
    };
    res.getHeader = (key: string) => {
      const val = resHeaders[key.toLowerCase()];
      return Array.isArray(val) ? val.join(', ') : val;
    };
    res.removeHeader = (key: string) => {
      delete resHeaders[key.toLowerCase()];
    };
    res.hasHeader = (key: string) => key.toLowerCase() in resHeaders;
    res.getHeaders = () => ({ ...resHeaders });
    res.writeHead = (code: number, maybeHeaders?: any) => {
      statusCode = code;
      res.statusCode = code;
      if (maybeHeaders) {
        for (const [k, v] of Object.entries(maybeHeaders)) {
          res.setHeader(k, v);
        }
      }
      return res;
    };
    res.status = (code: number) => {
      statusCode = code;
      res.statusCode = code;
      return res;
    };
    res.type = res.contentType = (type: string) => {
      res.setHeader('content-type', type);
      return res;
    };
    res.location = (target: string) => {
      res.setHeader('location', target);
      return res;
    };
    res.redirect = (statusOrUrl: number | string, maybeUrl?: string) => {
      const code = typeof statusOrUrl === 'number' ? statusOrUrl : 302;
      const target = typeof statusOrUrl === 'string' ? statusOrUrl : maybeUrl || '/';
      res.status(code);
      res.setHeader('location', target);
      res.end(`Found. Redirecting to ${target}`);
      return res;
    };
    res.json = (data: any) => {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      const body = JSON.stringify(data);
      res.end(body);
      return res;
    };
    res.send = (data: any) => {
      if (data === null || data === undefined) {
        res.end();
        return res;
      }
      if (typeof data === 'object' && !Buffer.isBuffer(data)) {
        return res.json(data);
      }
      if (typeof data === 'string' && !res.getHeader('content-type')) {
        res.setHeader('content-type', 'text/html; charset=utf-8');
      }
      res.end(data);
      return res;
    };
    res.write = (chunk: any) => {
      if (chunk) {
        responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return true;
    };
    res.end = (chunk?: any) => {
      if (chunk) {
        responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      res.headersSent = true;
      res.emit('finish');

      try {
        const isNoBodyStatus = statusCode === 204 || statusCode === 205 || statusCode === 304;
        const responseBody = isNoBodyStatus ? null : (responseChunks.length > 0 ? Buffer.concat(responseChunks) : null);

        const headersObj = new Headers();
        for (const [k, v] of Object.entries(resHeaders)) {
          if (Array.isArray(v)) {
            for (const item of v) {
              headersObj.append(k, item);
            }
          } else if (v !== undefined) {
            headersObj.set(k, String(v));
          }
        }

        resolve(
          new Response(responseBody, {
            status: statusCode,
            headers: headersObj,
          })
        );
      } catch (respErr: any) {
        resolve(
          new Response(
            JSON.stringify({ error: 'response_construction_error', message: respErr?.message || 'Error constructing response' }),
            { status: 500, headers: { 'content-type': 'application/json' } }
          )
        );
      }
      return res;
    };

    try {
      app(req, res, (err?: any) => {
        if (err) {
          resolve(
            new Response(
              JSON.stringify({
                error: 'server_error',
                error_description: err?.message || 'Internal server error',
              }),
              {
                status: err.status || err.statusCode || 500,
                headers: { 'content-type': 'application/json' },
              }
            )
          );
        } else if (!res.headersSent) {
          resolve(
            new Response(
              JSON.stringify({ error: 'not_found', error_description: 'Not found' }),
              {
                status: 404,
                headers: { 'content-type': 'application/json' },
              }
            )
          );
        }
      });
    } catch (err: any) {
      resolve(
        new Response(
          JSON.stringify({
            error: 'server_error',
            error_description: err?.message || 'Internal server error',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }
        )
      );
    }
  });
}
