# Security Policy

Playsole One is an identity and authentication platform, so we take vulnerability reports seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Email **security@playsole.xyz** with:

- A description of the issue and its impact
- Steps to reproduce (or a proof of concept)
- Affected version / commit and configuration, if relevant

We aim to acknowledge reports within 3 business days and to provide a status update within 10 business days. Please give us a reasonable window to fix the issue before any public disclosure.

## Scope

In scope: this repository's source code (gateway, auth, session, profile, consent, security services, worker, scripts) and the official deployment configuration.

Out of scope: social engineering, denial-of-service by volumetric traffic, and vulnerabilities in third-party services (Supabase, Upstash, Cloudflare) that should be reported to those vendors.

## Supported versions

Only the latest commit on `main` receives security fixes.

## Deployment hardening checklist

If you self-host Playsole One:

- Set `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (RS256). Production refuses to start without them; no default key ships with the code.
- Set strong, unique `SESSION_SECRET` and `INTERNAL_SHARED_SECRET` values.
- Run with `NODE_ENV=production` and `COOKIE_SECURE=true`. Inline token echoing is disabled in production.
- Never commit `.env` files or secrets. Use your platform's secret store (for Cloudflare: `wrangler secret put`).
- Review and remove any development OAuth clients seeded by migrations before going live.
- Rotate secrets and keys if you suspect exposure (see `docs/runbooks/OPERATIONS.md`).
