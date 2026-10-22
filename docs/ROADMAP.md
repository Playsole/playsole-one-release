# Playsole One — Roadmap

## Phase 1 — Foundation

1. [x] Stand up project repository structure and CI/CD pipeline
2. [x] Scaffold API gateway with TLS, rate limiting, and basic routing
3. [x] Implement Auth Service — OIDC discovery, authorize, token, JWKS endpoints
4. [x] Implement Authorization Code Flow + PKCE (S256)
5. [x] Build login and registration pages (server-rendered or SPA served by BFF)
6. [x] Implement Session Service with Redis-backed server-side sessions
7. [x] Implement BFF pattern — login flow with opaque session cookies
8. [x] Implement refresh token rotation with family-based theft detection
9. [x] Implement PostgreSQL schema — tenants, users, clients, authorization_codes
10. [x] Implement audit_log table (append-only, insert-only role)
11. [x] Integrate with first Playsole application as OIDC relying party
12. [x] Write integration tests for auth flows

## Phase 2 — Profile & Consent

13. [x] Implement PostgreSQL database layer backed by Supabase — replace in-memory stores across all services with Supabase pg client, connection pooling, and run schema migrations on startup
14. [x] Implement Profile Service — read/write profile data
15. [x] Implement Consent Service — OAuth consent grants, scope management
16. [x] Add consent screen UI (what scopes an app is requesting)
17. [x] Implement user profile page UI (view and edit) *(unified into `/dashboard?tab=profile` with Apple-inspired studio design)*
18. [x] Implement consent management UI (view and revoke grants) *(unified into `/dashboard?tab=grants`)*
19. [x] Add email verification and phone verification flows
20. [x] Implement passwordless email magic link authentication
21. [x] Implement Row-Level Security (RLS) for multi-tenant data isolation
22. [x] Add rate limiting per endpoint per user/tenant at the gateway

## Phase 3 — Security & MFA

23. [x] Implement Security Service — MFA enrollment and verification
24. [x] Add TOTP (time-based one-time passwords) support *(with upgraded 2-column split card UI)*
25. [x] Add WebAuthn / passkeys support
26. [x] Implement MFA enforcement policies (optional vs required per app/tenant)
27. [x] Build security settings UI (MFA management, active sessions, device history) *(unified into `/dashboard?tab=security`)*
28. [x] Implement login attempt tracking and account lockout
29. [x] Implement suspicious activity detection (new device, new location, impossible travel)
30. [x] Add DPoP (sender-constrained access tokens) for sensitive apps
31. [x] Add session management UI — view and revoke active sessions *(unified into `/dashboard?tab=security`)*
32. [x] Implement account recovery flow (backup codes, email recovery)

## Phase 4 — Production Cloudflare Workers Deployment

> Deploys the complete Node.js application stack to Cloudflare Workers using `nodejs_compat`. Supabase PostgreSQL stays the single source of truth — no database abstraction layer. Upstash Redis handles distributed rate limiting, locks, and temporary state.

33. [x] Governance & updates — add Cloudflare Workers deployment rules; update README/docs to declare Cloudflare Workers the production runtime
34: [x] State hardening — Redis + PostgreSQL — move pending-auth and pending-MFA state, DPoP jti replay, and rate-limit counters to Redis (Upstash); persist risk alerts in PostgreSQL (migration 014); move JWT keys to env secrets
35. [x] Production runtime — unified runtime booting gateway + auth + session + profile + consent + security; trust proxy; pino structured logging with request IDs; `/health/ready`; production env guards
36. [x] Cloudflare Worker bundling — unified bridge enabling Node/Express stack to run inside Cloudflare Workers (`nodejs_compat`); update `wrangler.toml` and worker entrypoint
37. [x] CI/CD — CI with unit/integration tests, security checks, and portability checks; automated Cloudflare Workers deploy on `main` merge gated on green CI
38. [x] Production verification — full E2E verification on Cloudflare Workers; update docs

## Phase 5 — Admin & Operations

39. [x] Build admin dashboard UI — user search, view, suspend, delete *(delivered in Admin Studio at `/admin?tab=users`)*
40. [x] Implement OAuth client management UI (register, configure, rotate secrets) *(delivered at `/admin?tab=clients`)*
41. [x] Add tenant management (create, configure, deactivate) *(delivered at `/admin?tab=tenants`)*
42. [x] Build audit log viewer UI with filtering and export *(delivered at `/admin?tab=audit-logs` with JSON & CSV export)*
43. [x] Implement structured logging with correlation IDs across services *(delivered via `pino` + `pino-http`)*
44. [x] Add metrics and alerting (login success/failure rates, P99 latency, error budgets) *(delivered via `packages/shared/src/metrics.ts` and `/metrics` endpoint)*
45. [x] Set up distributed tracing across service boundaries *(delivered via W3C `traceparent` and correlation headers in `packages/shared/src/tracing.ts`)*
46. [x] Implement edge deployment & rollback pipeline *(handled natively by Cloudflare Workers zero-downtime deployments; rollback runbook documented)*
47. [x] Write runbooks for common operational scenarios *(delivered in [`docs/runbooks/OPERATIONS.md`](./runbooks/OPERATIONS.md))*

## Phase 6 — Scale & Polish

48. [x] Implement read replicas for PostgreSQL and cache warming strategies *(delivered via `getSupabaseReadOnly()` and replica URL routing)*
49. [x] Add CDN integration for avatar/profile image serving *(delivered via `/avatar/:userId` with 24h immutable CDN cache-control)*
50. [x] Implement session deduplication and concurrent session limits *(delivered via IP/UA deduplication and `MAX_CONCURRENT_SESSIONS` enforcement)*
51. [x] Add admin API for Playsole One (programmatic user/tenant management) *(delivered via `/api/v1/admin` REST endpoints with admin API key auth)*
52. [x] Implement webhook system for account events (user.created, user.deleted, etc.) *(delivered via `packages/shared/src/webhooks.ts` with HMAC-SHA256 signatures)*
53. [x] Add account deletion and data portability (GDPR compliance) *(delivered via `GET /account/export` and `POST /account/delete`)*
54. [x] Implement API versioning strategy and deprecation policy *(delivered via RFC 8594 `apiVersioningMiddleware`)*
55. [x] Build developer documentation portal for integrating apps *(delivered at `/developers` with interactive Apple-style studio UI and code samples)*
56. [x] Performance optimization — connection pooling, query optimization, caching tiers *(delivered via client connection caching and connection-safe configurations)*
57. [x] Load testing and capacity planning *(delivered via `scripts/load-test.ts` and `npm run test:load` benchmark engine)*

## Phase 7 — One Account Across Playsole Apps

> Scope: this phase makes a single Playsole One identity the account for all **Playsole-owned** apps and websites — one session, one account, like Google and its own apps. External/non-Playsole apps are unaffected: they continue to integrate One as a third-party IdP through the existing OIDC/OAuth consent flow (Phases 1–2).

58. [x] Design a shared first-party session strategy — a dedicated Playsole SSO domain whose session cookie is readable by every Playsole app on the same browser/device *(delivered via `ssoCookieDomain()`, `__Secure-` cookie semantics, and `SameSite: 'lax'` in `gateway/src/cookies.ts`)*
59. [x] Auto sign-in — when a Playsole app detects an active One session on the same browser or phone, sign the user in without prompting for a password *(delivered via first-party client detection and zero-prompt authorization)*
60. [x] Fetch the profile for the account chooser from the active session (display name, avatar, email) without re-authentication *(delivered via `GET /sso/accounts` and direct database profile resolution)*
61. [x] Build the account chooser UI — "Continue as [account]", "Use another account", "Create new account" — shared by all first-party apps *(delivered at `/sso/chooser` and `/account-chooser` in Apple Horizontal Island Studio design)*
62. [x] Implement account switching — choosing another account updates the shared session so every Playsole app on that browser/device reflects the same active identity *(delivered via `/sso/switch`)*
63. [x] Implement create-new-account from the chooser — provisions the new identity and starts a session under the same shared-session model, so the user has one account everywhere *(delivered via `/register?source=chooser` with direct SSO cookie creation)*
64. [x] Mobile parity — the same continue-as / use-another-account / create-new-account behavior on phones, including secure cross-device session handoff *(delivered via migration 016, `/sso/handoff/create`, and `/sso/handoff/:token`)*
65. [x] Single sign-out — ending a session from any Playsole app signs the user out of all Playsole apps (shared session revocation) *(delivered via `/sso/logout` clearing cookies across root domain)*

