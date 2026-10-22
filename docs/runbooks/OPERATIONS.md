# Playsole One — Operations & Runbooks

> **Operational Runbooks and Disaster Recovery Procedures**  
> *Companion document for Phase 5 (Admin & Operations) of the Playsole One Roadmap. Replace `<your-domain>` with your deployment origin.*

---

## 1. Zero-Downtime Deployment & Rollback (Cloudflare Workers)

### Deployment Architecture
- **Provider**: Cloudflare Workers (`nodejs_compat`).
- **Trigger**: Automatic on `git push origin main` via Wrangler (gated on green CI in GitHub Actions).
- **Edge Deployment**: Cloudflare Workers deploy globally across the edge network with instant traffic migration and zero server downtime.

### Instant Rollback Procedure
If a production deployment introduces critical errors or regressions:

1. **Option A: Cloudflare Dashboard Rollback (Fastest — < 30 seconds)**:
   - Navigate to the **Cloudflare Dashboard** &rarr; Workers & Pages &rarr; `playsole-one`.
   - Open the **Deployments** tab.
   - Locate the previous successful deployment version.
   - Click **Rollback** to instantly point traffic to the previous deployment.

2. **Option B: Git Revert Rollback**:
   - Revert the problematic commit:
     ```bash
     git revert HEAD --no-edit
     git push origin main
     ```
   - CI/CD will build, test, verify portability, and auto-deploy the clean state.

---

## 2. High Login Failure Rate & Brute-Force Incident Response

### Indicators & Metrics
- **Metric**: `playsole_login_attempts_total{status="failure"}` spikes relative to `playsole_login_attempts_total{status="success"}`.
- **Alert Condition**: `loginFailureRate > 0.20` (over 20% failures in a 5-minute rolling window) via `/metrics`.
- **Symptoms**: Multiple audit log events of type `auth.login.failed` or `auth.account.locked`.

### Immediate Actions
1. **Inspect Live Audit Logs**:
   - Navigate to `https://<your-domain>/admin?tab=audit-logs`.
   - Filter by `login.failed`.
   - Identify if attacks are targeting a single user or originating from a specific IP subnet.
2. **Account Lockout Verification**:
   - Confirm built-in lockout is active: 5 consecutive failed attempts trigger automatic 15-minute lock.
3. **Targeted IP / User Action**:
   - If a specific user account is targeted:
     - Navigate to `https://<your-domain>/admin?tab=users`.
     - Suspend the account temporarily (`/admin/users/:id/suspend`) while notifying the user.
    - If attacks come from known malicious bot CIDRs:
      - Add Cloudflare WAF block rule in the Cloudflare dashboard.

---

## 3. Database Emergency (Supabase Connection Saturation & Migration Rollback)

### Connection Saturation Mitigation
- **Indicator**: Service logs show `connection timeout` or `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
- **Immediate Recovery**:
  1. Verify Supabase connection pooler is active (Transaction mode port 6543 / Session mode port 5432).
  2. Cloudflare Workers connections use HTTP/REST-based pooling for Upstash Redis and Supabase client pooling.

### Manual Database Migration Rollback
Per rule `manual-db-migrations`:
1. Check `schema_migrations` table to identify the latest executed migration:
   ```sql
   SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
   ```
2. Locate the corresponding rollback SQL script or inverse query.
3. Execute the rollback manually in the Supabase SQL Editor.
4. Remove the migration record from `schema_migrations`:
   ```sql
   DELETE FROM schema_migrations WHERE version = '<version>';
   ```

---

## 4. Secret & Keypair Rotation Runbook

### A. Rotating OAuth Client Secret
1. Open the Admin Studio at `/admin?tab=clients`.
2. Locate the confidential client (e.g. `playsole-games-service`).
3. Click **Rotate Secret**.
4. The system immediately generates a new 256-bit cryptographically secure secret, updates the SHA-256 hash in PostgreSQL `clients`, and displays the plaintext secret in the one-time reveal banner.
5. Copy the secret into the relying party's environment configuration.

### B. Rotating JWT Signing Keypair (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`)
1. Generate fresh RS256 2048-bit keypair:
   ```bash
   openssl genrsa -out jwt-private.pem 2048
   openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
   ```
2. Update `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in Cloudflare Workers secrets (`wrangler secret put`).
3. Deploy the worker.
4. Existing access tokens (5-minute TTL) will expire naturally; relying parties will re-fetch updated public keys from `/.well-known/jwks.json`.

---

## 5. Redis Outage & Fail-Open Rate Limiting

### Behavior During Outage
- **Upstash Redis** handles short-lived state: rate limit counters, DPoP `jti` replay tracking, and pending MFA challenges.
- **Fail-Open Policy**: If Redis becomes temporarily unreachable, the custom rate limiter logs a warning and allows requests through rather than locking out legitimate users.
- **Durable Data Unaffected**: Users, sessions, clients, credentials, and audit logs reside in Supabase PostgreSQL and remain 100% operational.

### Recovery Check
1. Query `/health/ready`:
   - Returns `{"status":"ok","supabase":true,"redis":true}` when fully healthy.
2. If `redis: false`, verify Upstash database status in the Upstash console and verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Cloudflare Workers secrets.
