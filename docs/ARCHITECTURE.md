# Playsole One — Technical Architecture

## 1. System Design Overview

Playsole One is a unified identity platform using an **OAuth 2.0 + OpenID Connect** authorization server pattern. It follows a **Backend-for-Frontend (BFF)** architecture where the browser never sees tokens — only opaque, HttpOnly session cookies. Each Playsole application acts as a relying party (OIDC client) and owns its product-specific data, while Playsole One centrally manages authentication, profile, security, and consent.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  (HttpOnly session cookie, no JS token access)              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  API Gateway / Reverse Proxy                 │
│  - TLS termination, rate limiting, bot detection            │
│  - Routes /auth/* → Auth Service                            │
│  - Routes /api/* → Playsole One services or per-app APIs    │
│  - Validates access tokens at edge (opaque token introspect)│
└─────┬──────────────┬──────────────┬──────────────┬──────────┘
      │              │              │              │
┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────┐ ┌────▼──────────┐
│ Auth       │ │ Profile   │ │ Consent   │ │ Session       │
│ Service    │ │ Service   │ │ Service   │ │ Service       │
│ (OIDC      │ │ (read/    │ │ (OAuth    │ │ (session      │
│  provider) │ │  write    │ │  consent  │ │  store,       │
│            │ │  profile) │ │  grants)  │ │  token mgmt)  │
└─────┬──────┘ └────┬──────┘ └────┬──────┘ └────┬──────────┘
      │             │             │             │
┌─────▼─────────────▼─────────────▼─────────────▼──────────┐
│                  Data Layer                               │
│  - PostgreSQL (primary) + Redis (session/token cache)     │
│  - Row-Level Security (RLS) scoped by tenant_id           │
│  - Immutable audit log (append-only table or event bus)   │
└───────────────────────────────────────────────────────────┘
```

## 2. Service Decomposition

### 2.1 Auth Service (OIDC Provider)
- Handles authorization endpoint, token endpoint, JWKS endpoint, userinfo endpoint, end-session endpoint.
- Supports **Authorization Code Flow + PKCE** (S256) for all clients.
- Passwordless primary flow (email magic link or one-time code), with TOTP/WebAuthn MFA as secondary factors.
- Issues **opaque access tokens** (introspected by the gateway) + **JWT ID tokens** for identity claims.
- **Refresh Token Rotation** — issues a new refresh token on each use; revokes the previous one.
- **DPoP** (sender-constrained tokens) for high-security sessions.

### 2.2 Profile Service
- Manages core identity attributes: display name, email, phone, avatar, locale, linked social accounts.
- Exposes a REST API scoped to the authenticated user (never cross-tenant).
- Each Playsole app can extend profile with app-specific attributes (stored in the app's own domain).

### 2.3 Consent Service
- Records OAuth consent grants: user has authorized client X to access scope Y.
- Supports granular consent (user can revoke individual scopes per client).
- Stores consent decisions per user + client pair, with expiry and versioning.

### 2.4 Session Service
- Manages server-side session store (Redis).
- On login: creates session → stores tokens server-side → issues opaque session cookie to browser.
- On API call via BFF: BFF reads session from cookie, retrieves access token, proxies request to target service.
- Handles session refresh, revocation, and concurrent session limits.

### 2.5 Security Service
- Handles MFA enrollment/verification (TOTP, WebAuthn/passkeys).
- Manages security events: login attempts, device tracking, suspicious activity detection.
- Exposes settings: passwordless preference, MFA methods, active sessions list, device history.

## 3. Authentication Flow

```
Browser                    BFF (Gateway)            Auth Service           Session Service
   │                           │                        │                      │
   │  GET /auth/login          │                        │                      │
   ├──────────────────────────►│                        │                      │
   │                           │  Redirect to            │                      │
   │  (login page)             │  authorization          │                      │
   │◄──────────────────────────┤  endpoint               │                      │
   │                           ├───────────────────────►│                      │
   │  User submits credentials │                        │                      │
   ├──────────────────────────►│                        │                      │
   │                           │  auth request          │                      │
   │                           ├───────────────────────►│                      │
   │                           │                        │  Authenticate user    │
   │                           │  auth_code             │  Generate auth code   │
   │                           │◄───────────────────────┤                      │
   │                           │                        │                      │
   │                           │  POST /auth/token      │                      │
   │                           │  (code + PKCE verifier)│                      │
   │                           ├───────────────────────►│                      │
   │                           │                        │  Validate code        │
   │                           │  access_token          │  Issue tokens         │
   │                           │  refresh_token         │                      │
   │                           │  id_token              │                      │
   │                           │◄───────────────────────┤                      │
   │                           │                        │                      │
   │                           │  Store tokens in       │                      │
   │                           │  server-side session   │  CREATE session      │
   │                           ├──────────────────────────────────────────────►│
   │  Set-Cookie: session_id  │                        │                      │
   │◄──────────────────────────┤                        │                      │
   │                           │                        │                      │
   │  GET /api/profile         │                        │                      │
   │  (cookie: session_id)     │                        │                      │
   ├──────────────────────────►│                        │                      │
   │                           │  GET session           │                      │
   │                           ├──────────────────────────────────────────────►│
   │                           │  access_token          │                      │
   │                           │◄──────────────────────────────────────────────┤
   │                           │                        │                      │
   │                           │  GET /api/profile      │                      │
   │                           │  (Authorization: Bearer)│                     │
   │                           ├─────────────────────────────────────────────►│
   │  profile data             │                        │                      │
   │◄──────────────────────────┤                        │                      │
```

## 4. Data Model

### 4.1 Core Tables (PostgreSQL)

```
tenants
  id              UUID PK
  slug            VARCHAR(64) UNIQUE     -- e.g. "playsole"
  name            VARCHAR(256)
  domain          VARCHAR(256)           -- e.g. "playsole.xyz"
  config          JSONB                  -- tenant-specific settings
  created_at      TIMESTAMP

users
  id              UUID PK
  tenant_id       UUID FK → tenants
  primary_email   VARCHAR(256)
  primary_phone   VARCHAR(32)
  display_name    VARCHAR(128)
  avatar_url      TEXT
  locale          VARCHAR(8)
  mfa_enabled     BOOLEAN DEFAULT FALSE
  mfa_methods     JSONB                  -- registered MFA methods
  status          VARCHAR(32)            -- active, suspended, disabled
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

clients (OAuth 2.0)
  id              UUID PK
  tenant_id       UUID FK → tenants
  client_id       VARCHAR(128) UNIQUE
  client_secret   VARCHAR(256)           -- hashed, only for confidential clients
  redirect_uris   TEXT[]                  -- allowed redirect URIs
  grant_types     TEXT[]                 -- authorization_code, refresh_token
  scopes          TEXT[]                 -- "openid", "profile", "email", custom
  public_client   BOOLEAN DEFAULT TRUE
  created_at      TIMESTAMP

authorization_codes
  code            VARCHAR(128) PK        -- short-lived, single-use
  client_id       VARCHAR(128)
  user_id         UUID FK → users
  code_challenge  VARCHAR(256)
  code_method     VARCHAR(8)             -- "S256"
  scopes          TEXT[]
  redirect_uri    TEXT
  expires_at      TIMESTAMP

sessions
  id              UUID PK
  user_id         UUID FK → users
  client_id       VARCHAR(128)
  refresh_token   VARCHAR(256)           -- hashed
  access_token    TEXT                   -- opaque or JWT
  token_type      VARCHAR(32)           -- "bearer", "dpop"
  device_info     JSONB
  ip_address      INET
  expires_at      TIMESTAMP
  revoked_at      TIMESTAMP

refresh_tokens
  id              UUID PK
  session_id      UUID FK → sessions
  token_hash      VARCHAR(256) UNIQUE   -- SHA-256 of the actual token
  family          UUID                  -- to detect token theft
  sequence        INTEGER               -- incremented on rotation
  expires_at      TIMESTAMP

consents
  id              UUID PK
  user_id         UUID FK → users
  client_id       VARCHAR(128)
  scopes          TEXT[]
  granted_at      TIMESTAMP
  revoked_at      TIMESTAMP             -- soft delete

audit_log
  id              UUID PK
  event_type      VARCHAR(64)           -- login, logout, consent_grant, mfa_enroll, etc.
  user_id         UUID
  client_id       VARCHAR(128)
  ip_address      INET
  user_agent      TEXT
  metadata        JSONB
  created_at      TIMESTAMP DEFAULT NOW()
  (APPEND-ONLY — no UPDATE/DELETE)
```

### 4.2 Redis (Session Cache & Token Blacklist)
- `session:{id}` → session payload (TTL = session lifetime)
- `blacklist:{token_hash}` → revoked timestamp (TTL = original token TTL)
- `rate_limit:{endpoint}:{user_id}` → counter (sliding window)

## 5. API Design

### 5.1 Public Endpoints (via Gateway)

| Method | Path | Service | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/.well-known/openid-configuration` | Auth | None | OIDC discovery |
| GET | `/.well-known/jwks.json` | Auth | None | Public keys |
| GET | `/auth/authorize` | Auth | Session* | OAuth authorization |
| POST | `/auth/token` | Auth | Client** | Token endpoint |
| POST | `/auth/revoke` | Auth | Client | Token revocation |
| GET | `/auth/userinfo` | Auth | Access token | User claims |
| POST | `/auth/logout` | Auth | Session | End session |
| POST | `/auth/login` | Auth | None | Initiate login |
| POST | `/auth/register` | Auth | None | Create account |
| GET | `/api/profile` | Profile | Access token | Get profile |
| PUT | `/api/profile` | Profile | Access token | Update profile |
| GET | `/api/security/mfa` | Security | Access token | List MFA methods |
| POST | `/api/security/mfa` | Security | Access token | Enroll MFA |
| DELETE | `/api/security/mfa/{id}` | Security | Access token | Remove MFA |
| GET | `/api/consent` | Consent | Access token | List consent grants |
| POST | `/api/consent` | Consent | Access token | Update consent |
| GET | `/api/sessions` | Session | Access token | List active sessions |
| DELETE | `/api/sessions/{id}` | Session | Access token | Revoke session |

\* BFF session cookie  
\** Client credentials or PKCE verification

### 5.2 Internal Service-to-Service Communication
- mTLS between services within the mesh.
- Services use a shared internal JWT or API key for service identity.
- Auth Service exposes an internal `/internal/introspect` endpoint (not exposed via gateway) for gateway token validation.

## 6. Integration Pattern for Playsole Applications

Each Playsole application follows this pattern:

```
┌──────────────────────┐     ┌────────────────────────────────────┐
│  Playsole App (SPA)  │     │  Playsole App Backend              │
│                      │     │  - Owns app-specific DB tables     │
│  - User auth via     │     │  - Validates Playsole One tokens   │
│    redirect to       │     │  - Reads user_id from token claims  │
│    Playsole One BFF  │     │  - Stores app data keyed by user_id │
│                      │     │                                    │
└──────────────────────┘     └────────────────────────────────────┘
         │                              │
         │  1. User clicks "Sign in"    │
         ├──────────────────────────────►│  (or BFF handles directly)
         │                              │
         │  2. Redirect to              │
         │     https://one.playsole.xyz  │
         │     /authorize?...           │
         │◄─────────────────────────────┤
         │                              │
         │  3. Auth flow completes      │
         │     (see §3)                 │
         │                              │
         │  4. Redirect back to app     │
         │     with auth code           │
         ├──────────────────────────────►│
         │                              │
         │  5. App backend exchanges    │
         │     code for tokens          │
         │                              │
         │  6. App validates ID token   │
         │     using JWKS, extracts     │
         │     user_id                  │
```

Each app:
- Does NOT store authentication state — delegates to Playsole One.
- Uses the `sub` (subject) claim from the ID token as the foreign key for its user records.
- Can request custom scopes that Playsole One will present for user consent.

## 7. Security Architecture

### 7.1 Token Strategy
- **Access tokens**: Opaque (UUID), 15-minute TTL. Validated via introspect endpoint at the gateway.
- **Refresh tokens**: Opaque (high-entropy random), rotated on each use, tied to a token family to detect theft.
- **ID tokens**: Short-lived JWT signed with RS256 (or EdDSA). Contains `sub`, `name`, `email`, `locale`, `tenant_id`.
- **Session cookies**: HttpOnly, Secure, SameSite=Strict, Path=/; prefix `__Host-` for binding to origin.

### 7.2 Threat Mitigations
| Threat | Mitigation |
|--------|-----------|
| CSRF | SameSite=Strict cookie + `state` parameter in OAuth flow |
| XSS token theft | BFF pattern — browser never sees tokens |
| Authorization code interception | PKCE (S256) + exact redirect URI matching |
| Refresh token theft | Rotation + family detection (theft breaks family → revoke all) |
| Token replay | DPoP binding for access tokens; short TTL |
| Session fixation | Regenerate session ID on login |
| Brute force | Rate limiting at gateway; account lockout after N failures |
| Cross-tenant data leak | RLS scoped by `tenant_id` in all DB queries |

### 7.3 Audit Trail
- All authentication and consent events are written to an append-only `audit_log` table.
- Insert-only role on the table; no UPDATE/DELETE privileges granted to application roles.
- Events include: login (success/failure), logout, token refresh, consent grant/revoke, MFA enroll/remove, profile change, account creation/deletion.

## 8. Operational Concerns

### 8.1 Scalability
- Auth and Session services are stateless (state lives in Redis + PostgreSQL).
- Gateway can be horizontally scaled behind a load balancer (sticky sessions optional via Redis).
- Read-heavy profile data can be replicated or cached (CDN for avatars).

### 8.2 Observability
- Structured JSON logging with correlation IDs propagated via headers.
- Metrics: login success/failure rate, token issuance rate, session count, P99 latency per endpoint.
- Distributed tracing across service boundaries.

### 8.3 Deployment
- Production deployment via Cloudflare Workers (`nodejs_compat`).
- Environment-based configuration matching Supabase projects (local dev, production).
- Zero-downtime edge deploys and instant rollback via Cloudflare Workers.

## 9. Technology Recommendations

| Layer | Technology |
|-------|-----------|
| API Gateway | Envoy / Kong / Ory Oathkeeper |
| Auth Service (OIDC) | Custom (e.g. Go, Rust, or Node) or embedded library (Ory Hydra as foundation) |
| Profile / Consent / Session | Go or TypeScript (Node) REST services |
| Database | Supabase (PostgreSQL 15+ with Row-Level Security) |
| Cache / Session Store | Supabase (Redis 7+ via Upstash integration) |
| Observability | OpenTelemetry + Grafana stack |
