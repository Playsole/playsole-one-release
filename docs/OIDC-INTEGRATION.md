# Playsole One — OIDC Integration Guide

Every Playsole product delegates authentication to Playsole One using **OpenID Connect** over the **Authorization Code Flow + PKCE**. The browser never sees tokens — only an opaque HttpOnly session cookie managed by the Playsole One BFF.

All endpoints are accessed through the **API Gateway** (`http://localhost:8080` in dev), not individual services. The gateway handles rate limiting, session resolution, and request routing. Individual services reject direct requests.

```
Your App (SPA / Backend)
       │
       │  OIDC redirects + token exchange
       ▼
  Playsole One Gateway  ← http://localhost:8080 (dev)
       │
       ├── Auth Service  (internal, not directly accessible)
       ├── Session Service
       └── ...
```

---

## 1. Register Your Application

Before integrating, your application must be registered as an OIDC client. Contact the Playsole One team to obtain:

| Field | Example | Description |
|-------|---------|-------------|
| `client_id` | `playsole-game` | Unique identifier for your app |
| `redirect_uris` | `["https://myapp.playsole.xyz/auth/callback"]` | Allowed callback URLs (exact match) |
| `grant_types` | `["authorization_code", "refresh_token"]` | OAuth grant types |
| `scopes` | `["openid", "profile", "email"]` | Requested scopes |

For local development, use the dev client:

- **client_id:** `playsole-dev`
- **redirect_uris:** `http://localhost:5173/callback`, `http://localhost:8080/callback`
- **public client** (no secret required)

---

## 2. Initiate Login

Redirect the user to Playsole One's authorization endpoint:

```
GET {PLAYSOLE_ONE_ISSUER}/authorize?response_type=code
                                     &client_id={your_client_id}
                                     &redirect_uri={your_callback_url}
                                     &code_challenge={S256_hash_of_code_verifier}
                                     &code_challenge_method=S256
                                     &scope=openid+profile+email
                                     &state={random_opaque_value}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `response_type` | yes | Must be `code` |
| `client_id` | yes | Your registered client ID |
| `redirect_uri` | yes | Must exactly match a registered URI |
| `code_challenge` | yes | Base64URL-encoded SHA-256 hash of `code_verifier` |
| `code_challenge_method` | yes | Must be `S256` |
| `scope` | yes | Space-separated scopes (`openid` is required) |
| `state` | recommended | Opaque value for CSRF protection; echoed back in the redirect |

### PKCE Code Verifier & Challenge

Generate a cryptographically random `code_verifier` (43–128 characters, unreserved characters only). Store it server-side for the callback.

```js
// Node.js example
import crypto from 'node:crypto';

const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

---

## 3. Handle the Callback

After the user authenticates, Playsole One redirects to your `redirect_uri`:

```
GET {redirect_uri}?code={authorization_code}&state={original_state}
```

### Validate the State

Verify that the `state` value matches the one you sent. This prevents CSRF attacks.

### Consent

On a user's first interaction with a client, the gateway displays a **consent screen** (your app name + requested scopes). The user's decision is persisted as a consent grant, so subsequent logins skip consent. Users can review and revoke grants at `{PLAYSOLE_ONE_ISSUER}/grants`.

### Exchange the Code for Tokens

Send a server-side `POST` request to the token endpoint:

```
POST {PLAYSOLE_ONE_ISSUER}/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&code_verifier={original_code_verifier}
&redirect_uri={your_callback_url}
&client_id={your_client_id}
```

### Token Response

```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "id_token": "eyJraWQ..."
}
```

---

## 4. Validate the ID Token

The `id_token` is a JWT signed with RS256. Validate it on your backend:

1. **Fetch JWKS** from `{PLAYSOLE_ONE_ISSUER}/.well-known/jwks.json`
2. **Verify the signature** using the public key matching the `kid` header
3. **Check claims:**
   - `iss` — must match Playsole One's issuer
   - `aud` — must include your `client_id`
   - `exp` — must not be expired
   - `sub` — the unique user identifier (use this as your local user key)

```js
// Node.js example using jose
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:8080/.well-known/jwks.json'),
);

const { payload } = await jwtVerify(idToken, JWKS, {
  issuer: 'http://localhost:8080', // must match the OIDC_ISSUER value
  audience: 'your-client-id',
});

const userId = payload.sub; // Use as foreign key for this user
```

> **Issuer:** the `iss` claim is the value of the auth service's `OIDC_ISSUER` env var (default `http://localhost:8080`). Your app should **not** rely on that default. Set `OIDC_ISSUER` to your public gateway origin (e.g. `http://localhost:8080` in dev, `https://one.playsole.xyz` in prod) and validate the `iss` claim against that same value. You can inspect the actual issuer in the discovery document at `{PLAYSOLE_ONE_ISSUER}/.well-known/openid-configuration`.

---

## 5. Establish Your Own Session

After successful token validation, create your own application session (app-specific cookie, JWT, etc.) keyed to the `sub` claim. Do **not** store the Playsole One tokens in the browser — they belong server-side only.

---

## 6. Refresh Token Rotation

When the access token expires (default 15 minutes), use the refresh token:

```
POST {PLAYSOLE_ONE_ISSUER}/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={your_client_id}
```

Playsole One uses **refresh token rotation**: each request returns a new refresh token, and the previous one is invalidated. If a stolen token is reused, the entire token family is revoked (theft detection). Always store the latest refresh token returned.

---

## 7. API Requests to Playsole One

For requests to Playsole One services (userinfo, profile, etc.), include the access token:

```
GET {PLAYSOLE_ONE_ISSUER}/userinfo
Authorization: Bearer {access_token}
```

---

## 8. Logout

The Playsole One BFF session is managed via a browser cookie. To sign the user out, navigate the browser to `{PLAYSOLE_ONE_ISSUER}/logout` (both `GET` and `POST` are accepted). The session is destroyed and the user is redirected to the login page.

Users can also sign out from the footer of any Playsole One page ("Sign out" link).

---

## Environment Configuration

| Variable | Description | Dev Example | Production Example |
|----------|-------------|-------------|-------------------|
| `PLAYSOLE_ONE_ISSUER` | Gateway base URL | `http://localhost:8080` | `https://one.playsole.xyz` |
| `PLAYSOLE_ONE_CLIENT_ID` | Your registered client ID | `playsole-dev` | `playsole-game` |
| `PLAYSOLE_ONE_CLIENT_SECRET` | Secret (confidential clients only) | — | — |
| `PLAYSOLE_ONE_REDIRECT_URI` | Your callback URL | `http://localhost:5173/callback` | `https://myapp.playsole.xyz/auth/callback` |

Server-side (Playsole One) env vars that affect OIDC behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `OIDC_ISSUER` | The `iss` claim emitted in tokens. Set to your public gateway origin so it matches how clients reach you | `http://localhost:3001` |
| `INLINE_TOKEN_RESPONSE` | In dev, echo email/magic-link/phone tokens back in the UI instead of sending them | `true` |

---

## Dev Quickstart

Start all services with a single command — session, auth, profile, consent, and gateway run in parallel:

```bash
npm install
npm run dev
```

This starts:
- Gateway on **`http://localhost:8080`** ← your app points here
- Auth Service internally on port 3001
- Session Service internally on port 3004

For dev, point `OIDC_ISSUER` at the gateway so the `iss` claim matches your integration:

```
OIDC_ISSUER=http://localhost:8080
```

Configure your app:

```
PLAYSOLE_ONE_ISSUER=http://localhost:8080
PLAYSOLE_ONE_CLIENT_ID=playsole-dev
PLAYSOLE_ONE_REDIRECT_URI=http://localhost:5173/callback
```

The authorize URL becomes:

```
http://localhost:8080/authorize?response_type=code&client_id=playsole-dev&redirect_uri=http://localhost:5173/callback&code_challenge=...&code_challenge_method=S256&scope=openid+profile+email&state=...
```

### Try it in a browser (no app needed)

The dev client also accepts `http://localhost:8080/callback` as a redirect URI, so you can walk the whole flow on a single origin:

1. Open `http://localhost:8080/login` and create an account (dev mode echoes email/phone/magic-link tokens back on the page).
2. Generate a PKCE pair in the DevTools console:
   ```js
   const verifier = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
   const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
   const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
     .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
   console.log('VERIFIER=' + verifier); console.log('CHALLENGE=' + challenge);
   ```
3. Visit `/authorize` with `client_id=playsole-dev`, `redirect_uri=http://localhost:8080/callback`, and your `code_challenge`. Sign in, approve consent, and the authorization code appears in the address bar at `http://localhost:8080/callback?code=...`.
4. In the DevTools console, `fetch('/token', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({ grant_type:'authorization_code', code:'...', code_verifier:verifier, redirect_uri:'http://localhost:8080/callback', client_id:'playsole-dev' }) })` — then `fetch('/userinfo', { headers:{ Authorization:'Bearer ' + accessToken } })`.

Your app never talks to ports 3001 or 3004 directly — always through the gateway.

A step-by-step walkthrough is in [`TESTING.md`](./TESTING.md).
