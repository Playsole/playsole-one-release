# Contributing to Playsole One

Thanks for your interest in contributing! By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License of contributions

Playsole One is licensed under the [Apache License 2.0](LICENSE). Unless you state otherwise, any contribution you submit is licensed under the same terms (Apache-2.0 §5). Only submit code you have the right to contribute, and do not include code copied from incompatible licenses (e.g. GPL) or proprietary sources.

## Development setup

Requirements: Node.js >= 20, a Supabase project, and an Upstash Redis database.

```bash
npm install
cp .env.example .env     # fill in Supabase, Upstash and secrets
npm run migrate          # applies SQL migrations (see "Database changes")
npm run dev              # gateway on http://localhost:8080
```

Useful commands:

| Command | Purpose |
|---|---|
| `npm run build` | Type-check and build all workspaces |
| `npm test` | Run unit and integration tests (Vitest) |
| `npm run check:portability` | Verify hosting portability rules |

## Project conventions

- **One implementation.** Modify existing code; don't fork or duplicate logic into a parallel codebase.
- **No process-memory state for correctness-critical data.** Auth challenges, MFA state, risk alerts and rate-limit counters belong in Supabase PostgreSQL (durable) or Redis (short-lived). Small, bounded, TTL-limited performance caches are fine.
- **Cloudflare Workers is the production runtime.** Avoid platform-specific lock-in and don't add Docker/container configuration.
- **Database changes** are SQL files in `scripts/db/migrations/` with the next sequential number. Migrations are applied manually; never run them automatically from application code.
- **Never commit secrets**, `.env` files or private keys. Use `.env.example` for documenting variables.
- **Commit messages** use plain natural language (e.g. "Added rate limiting to the token endpoint"), not conventional-commit prefixes.

## Pull requests

1. Open an issue first for larger changes.
2. Keep PRs focused, with tests for new behavior.
3. Make sure `npm run build`, `npm test` and `npm run check:portability` pass.
4. Update docs when behavior changes.
