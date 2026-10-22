# Playsole One

Unified identity and account platform for the Playsole ecosystem. Provides a single, secure account giving users seamless access to every Playsole product and service.

## Features

- **OAuth 2.0 + OpenID Connect** — Authorization Code Flow with PKCE (S256)
- **Backend-for-Frontend (BFF)** — Browser only holds opaque HttpOnly session cookies; tokens never reach the client
- **Refresh Token Rotation** — New refresh token issued on each use with family-based theft detection
- **Model Context Protocol (MCP)** — Integrated AI agent server for identity management and automated developer workflows
- **Multi-Service Architecture** — Gateway, Auth, Session, Profile, Consent, and Security services
- **Server-Rendered Auth UI** — Login and registration pages served by the gateway (no SPA dependency)

## Quick Start

Requirements: Node.js >= 20, a [Supabase](https://supabase.com) project (PostgreSQL + Auth) and an [Upstash](https://upstash.com) Redis database.

```bash
# Install dependencies
npm install

# Copy the environment template and fill in your Supabase / Upstash values and secrets
cp .env.example .env

# Apply database migrations (run manually; never executed automatically)
npm run migrate

# Start the unified server in development mode
npm run dev
```

The gateway is served at `http://localhost:8080`. In development a JWT signing keypair is generated automatically under `.data/`; in production you must provide `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (see [SECURITY.md](SECURITY.md)). Create an account at `/register` — in dev, verification tokens are echoed in the UI.

Production runs on Cloudflare Workers (`npm run build`, then `wrangler deploy`); see [Operations runbook](docs/runbooks/OPERATIONS.md).

## Architecture

```
Browser (HttpOnly session cookie)
       │
       ▼
  API Gateway / BFF     ← TLS, rate limiting, session resolution
       │
       ├── Auth Service       (OIDC provider — authorize, token, userinfo)
       ├── Profile Service    (read/write profile data)
       ├── Consent Service    (OAuth consent grants)
       ├── Session Service    (server-side sessions)
       └── Security Service   (MFA, login tracking)
```

The gateway acts as a BFF: it resolves the session cookie into user identity, injects it into proxied requests, and backend services never read cookies directly.

## Project Structure

```
├── gateway/             API Gateway + BFF
├── services/
│   ├── auth/            OIDC Auth Service
│   ├── session/         Session Service
│   ├── profile/         Profile Service
│   ├── consent/         Consent Service
│   ├── security/        Security Service (MFA, risk, recovery)
│   └── server/          Unified runtime booting all services
├── worker/              Cloudflare Workers entrypoint
├── packages/
│   ├── shared/          Shared TypeScript utilities, DB & Redis clients
│   └── mcp/             Model Context Protocol (MCP) AI agent server
├── scripts/             Migrations, health checks, load testing
├── test-apps/           Sample first-party / third-party relying parties
├── tests/               Unit and integration tests
└── docs/                Architecture, roadmap, testing, runbooks
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System design, service decomposition, data model
- [OIDC Integration](docs/OIDC-INTEGRATION.md) — Guide for Playsole products to integrate as relying parties
- [Roadmap](docs/ROADMAP.md) — Development phases and progress
- [QA Test Plan](docs/TESTING.md) — Browser-based end-to-end testing guide
- [Operations Runbook](docs/runbooks/OPERATIONS.md) — Deployment, rollback, incident response, key rotation

## Contributing & Security

- Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE).
