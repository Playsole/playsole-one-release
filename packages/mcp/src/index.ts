import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  checkSystemHealth,
  listOAuthClients,
  registerOAuthClient,
  rotateOAuthClientSecret,
  inspectUser,
  queryAuditLogs,
} from './tools/admin';
import { generatePkce, inspectRateLimit, fetchJwks } from './tools/dev';

const server = new McpServer({
  name: 'playsole-one',
  version: '0.1.0',
});

// Tool 1: check_system_health
server.tool(
  'check_system_health',
  'Check health and connectivity of Playsole One core services (PostgreSQL and Redis)',
  {},
  async () => {
    try {
      const health = await checkSystemHealth();
      return {
        content: [{ type: 'text', text: JSON.stringify(health, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Health check failed: ${err.message}` }],
      };
    }
  }
);

// Tool 2: list_oauth_clients
server.tool(
  'list_oauth_clients',
  'List registered OAuth 2.0 / OIDC clients in Playsole One',
  {},
  async () => {
    try {
      const clients = await listOAuthClients();
      return {
        content: [{ type: 'text', text: JSON.stringify(clients, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to list clients: ${err.message}` }],
      };
    }
  }
);

// Tool 3: register_oauth_client
server.tool(
  'register_oauth_client',
  'Register a new confidential OAuth 2.0 client application',
  {
    clientId: z.string().describe('Unique client identifier slug (e.g. playsole-game-studio)'),
    name: z.string().describe('Human readable name of the application'),
    redirectUris: z.array(z.string()).describe('List of allowed OAuth callback URLs'),
    scopes: z.array(z.string()).optional().describe('Allowed scopes (defaults to openid, profile, email)'),
    isFirstParty: z.boolean().optional().describe('Whether this is an internal first-party Playsole application'),
  },
  async (args) => {
    try {
      const res = await registerOAuthClient(args);
      return {
        content: [
          {
            type: 'text',
            text: `Successfully registered client '${res.clientId}'.\nClient Secret (Save this now, it is hashed in DB): ${res.clientSecret}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Client registration failed: ${err.message}` }],
      };
    }
  }
);

// Tool 4: rotate_client_secret
server.tool(
  'rotate_client_secret',
  'Generate a new cryptographically secure secret for a registered client and hash it in the database',
  {
    clientId: z.string().describe('The client ID to rotate the secret for'),
  },
  async ({ clientId }) => {
    try {
      const res = await rotateOAuthClientSecret(clientId);
      return {
        content: [
          {
            type: 'text',
            text: `Rotated secret for '${clientId}'.\nNew Secret: ${res.newClientSecret}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Secret rotation failed: ${err.message}` }],
      };
    }
  }
);

// Tool 5: inspect_user
server.tool(
  'inspect_user',
  'Lookup user details and security state by userId or email address',
  {
    userId: z.string().optional().describe('UUID of the user'),
    email: z.string().optional().describe('Primary email of the user'),
  },
  async (args) => {
    try {
      const user = await inspectUser(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(user, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to inspect user: ${err.message}` }],
      };
    }
  }
);

// Tool 6: query_audit_logs
server.tool(
  'query_audit_logs',
  'Query recent append-only audit trail events (e.g. logins, MFA enrollment, secret rotations)',
  {
    eventType: z.string().optional().describe('Filter by event type (e.g. auth.login.success, mcp.client.registered)'),
    userId: z.string().optional().describe('Filter by user ID'),
    clientId: z.string().optional().describe('Filter by client ID'),
    limit: z.number().optional().describe('Maximum number of entries to return (default: 50, max: 100)'),
  },
  async (args) => {
    try {
      const logs = await queryAuditLogs(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Audit log query failed: ${err.message}` }],
      };
    }
  }
);

// Tool 7: generate_pkce_pair
server.tool(
  'generate_pkce_pair',
  'Generate an RFC 7636 PKCE code_verifier and code_challenge (S256) for manual/automated OIDC testing',
  {},
  async () => {
    const pair = generatePkce();
    return {
      content: [{ type: 'text', text: JSON.stringify(pair, null, 2) }],
    };
  }
);

// Tool 8: inspect_rate_limit
server.tool(
  'inspect_rate_limit',
  'Inspect the current counter and remaining TTL for an Upstash Redis rate-limit key',
  {
    key: z.string().describe('The Redis rate-limit key (e.g. rl:global:127.0.0.1 or rl:auth:user@playsole.xyz)'),
  },
  async ({ key }) => {
    try {
      const info = await inspectRateLimit(key);
      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to inspect rate limit: ${err.message}` }],
      };
    }
  }
);

// Tool 9: fetch_jwks
server.tool(
  'fetch_jwks',
  'Retrieve and display public keys from the /.well-known/jwks.json endpoint',
  {
    issuerUrl: z.string().optional().describe('Base origin of the auth server (default: http://localhost:8080)'),
  },
  async ({ issuerUrl }) => {
    try {
      const jwks = await fetchJwks(issuerUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(jwks, null, 2) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to fetch JWKS: ${err.message}` }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
