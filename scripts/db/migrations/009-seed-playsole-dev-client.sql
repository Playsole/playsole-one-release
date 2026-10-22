-- Migration: Seed the canonical development OAuth client
-- `playsole-dev` is referenced by the docs (OIDC-INTEGRATION, TESTING) and the
-- integration tests, but is not provisioned by any migration. Without it the
-- /authorize flow fails with unauthorized_client. Tied to the default tenant.
-- Two redirect URIs are registered: the real SPA dev server (:5173) and the
-- gateway's own origin (:8080/callback) so the whole flow can be exercised in
-- a browser on a single origin.

INSERT INTO clients (id, tenant_id, client_id, redirect_uris, grant_types, scopes, public_client)
VALUES (
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-000000000001',
    'playsole-dev',
    ARRAY['http://localhost:5173/callback', 'http://localhost:8080/callback'],
    ARRAY['authorization_code', 'refresh_token'],
    ARRAY['openid', 'profile', 'email'],
    TRUE
)
ON CONFLICT (client_id) DO NOTHING;
