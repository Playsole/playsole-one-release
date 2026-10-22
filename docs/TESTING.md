# Playsole One — QA Test Plan

This guide walks through every user-facing feature from the browser. Use it to verify the product works correctly after any change.

All flows run against the **API Gateway** (`http://localhost:8080`). Individual services are internal-only and reject direct requests, so never point the browser at ports 3001–3005.

---

## Setup

```bash
npm install
npm run build
npm run dev
```

`npm run dev` starts all services in parallel (session, auth, profile, consent, gateway). The gateway serves everything at `http://localhost:8080` — `http://localhost:8080/` shows the landing page (auth-aware: "Sign in"/"Create account" when signed out, "Open your account"/"Manage apps" when signed in).

> **Dev client:** tests use the `playsole-dev` OAuth client (provisioned by migration `009-seed-playsole-dev-client.sql`). It is a public client (no secret) whose redirect URIs are `http://localhost:5173/callback` and `http://localhost:8080/callback`.
>
> **Dev tokens:** with `INLINE_TOKEN_RESPONSE` enabled (default), email/magic-link/phone tokens are echoed back in the UI. No real email or SMS is sent unless `SMTP_*` / `TWILIO_*` env vars are set.

---

## 1. Registration

**Precondition:** Not logged in (no session cookie).

| Step | Action | Expected Result |
|------|--------|----------------|
| 1.1 | Navigate to `http://localhost:8080/register` | Page displays "Create account" form with Name, Email, Password fields and "Create account" button. A "Sign in" link is present. |
| 1.2 | Submit with empty fields | Form re-renders with error: "All fields are required." |
| 1.3 | Submit with password shorter than 8 characters | Error: "Password must be at least 8 characters." |
| 1.4 | Submit with a valid name, email, and password (e.g., `Alice`, `alice@example.com`, `test1234`) | Redirected to `/verify-email`. A `session_id` cookie is set. You are now logged in. |
| 1.5 | Log out (see section 6), then try registering with the same email again | Error: "An account with this email already exists." |

---

## 2. Login

**Precondition:** Account already exists from section 1.

| Step | Action | Expected Result |
|------|--------|----------------|
| 2.1 | Navigate to `http://localhost:8080/login` | Page displays "Sign in" form with Email, Password fields and "Sign in" button. "Create account" and "Sign in with magic link" links are present. |
| 2.2 | Submit with empty fields | Error: "Email and password are required." |
| 2.3 | Submit with a wrong password | Error: "Invalid email or password." |
| 2.4 | Submit with the correct email and password | Redirected to `/authorize`. Session cookie is set. You are logged in. |

---

## 3. Authorization Flow (OIDC App Integration)

This is the core flow — a third-party app redirects a user to Playsole One to log in and grant permissions.

| Step | Action | Expected Result |
|------|--------|----------------|
| 3.1 | Log out first (section 6). Open a new tab and navigate to `http://localhost:8080/authorize?client_id=playsole-dev&scope=openid%20profile%20email&response_type=code` | Since you're not logged in, you are **redirected to `/login?pending_auth=...`** with a pending auth ID in the URL. |
| 3.2 | Submit valid login credentials | After login, you are **redirected to `/authorize`** with the original params. If no prior consent exists, the **consent screen** appears showing the app name and requested scopes. |
| 3.3 | Click **"Deny"** on the consent screen | Redirected to `/login`. |
| 3.4 | Repeat steps 3.1–3.2 to reach the consent screen again. Click **"Allow"** | Consent is saved. You are redirected to the auth service which issues an authorization code and redirects to the app's callback URL. The URL contains `code=...` and `state=...`. |

### 3.5 Re-authorize with existing consent

| Step | Action | Expected Result |
|------|--------|----------------|
| 3.5.1 | Navigate to `http://localhost:8080/authorize?client_id=playsole-dev&scope=openid%20profile%20email&response_type=code` again | You are **immediately redirected** to the app callback with a `code=...` — the consent screen is skipped because consent was already granted. |

### 3.6 Full PKCE flow, token exchange, and validation

This exercises the complete OIDC flow the way an integrating app would — single origin (`http://localhost:8080`), no SPA required.

**Precondition:** Logged in with a session (section 2) and no consent grant for `playsole-dev` (revoke it in section 5 if present).

**Step 3.6.1 — Generate a PKCE pair.** Open DevTools on any `http://localhost:8080` tab and paste:

```js
const verifier = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
  .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
console.log('VERIFIER=' + verifier);
console.log('CHALLENGE=' + challenge);
```

Copy both values for later.

**Step 3.6.2 — Start the authorization request.** In a new tab open:

```
http://localhost:8080/authorize?response_type=code&client_id=playsole-dev&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fcallback&code_challenge=CHALLENGE&code_challenge_method=S256&scope=openid%20profile%20email&state=abc123
```

Substitute `CHALLENGE`. Approve the consent screen if shown.

**Step 3.6.3 — Capture the authorization code.** You land on `http://localhost:8080/callback?code=<AUTH_CODE>&state=abc123`. The gateway has no `/callback` page, so the browser shows a 404 — expected. The address bar holds the authorization code. Confirm `state=abc123` matches.

**Step 3.6.4 — Exchange the code for tokens.** Staying on the `http://localhost:8080` origin, run in the DevTools console:

```js
const res = await fetch('/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: 'AUTH_CODE',                 // from 3.6.3
    code_verifier: 'VERIFIER',         // from 3.6.1
    redirect_uri: 'http://localhost:8080/callback',
    client_id: 'playsole-dev'
  })
});
console.log(await res.json());
```

Expected: an `access_token`, an `id_token`, a `refresh_token`, and `expires_in: 900`.

**Step 3.6.5 — Validate via userinfo.**

```js
const res = await fetch('/userinfo', {
  headers: { Authorization: 'Bearer ACCESS_TOKEN' }
});
console.log(await res.json());
```

Expected: a JSON object containing at least `{ "sub": "<user-id>" }`.

**Step 3.6.6 — Refresh the token (rotation).**

```js
const res = await fetch('/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: 'REFRESH_TOKEN',
    client_id: 'playsole-dev'
  })
});
console.log(await res.json());
```

Expected: a **new** `access_token` and a **rotated** `refresh_token`. Reusing the old refresh token should fail with `invalid_grant`.

---

## 4. Profile

**Precondition:** Logged in.

| Step | Action | Expected Result |
|------|--------|----------------|
| 4.1 | Navigate to `http://localhost:8080/profile` | Profile page displays your display name, email, avatar URL, locale, and timestamps. |
| 4.2 | Edit the display name field and submit the form | Page refreshes with the updated name displayed. |
| 4.3 | Submit with an empty display name | Error: "Display name is required." |
| 4.4 | Navigate to `/profile` when **not logged in** | Redirected to `/login?return_to=%2Fprofile`. |

---

## 5. Grants Management

**Precondition:** Logged in with at least one consent grant from section 3.

| Step | Action | Expected Result |
|------|--------|----------------|
| 5.1 | Navigate to `http://localhost:8080/grants` | Displays a list of apps you've granted consent to, showing the app ID, scopes, and grant date. |
| 5.2 | Click **"Revoke"** on a grant | Grant is revoked. You are redirected back to the grants page and the grant no longer appears. |
| 5.3 | Navigate to `/grants` when **not logged in** | Redirected to `/login?return_to=%2Fgrants`. |

After revoking, re-running section 3.5 will show the consent screen again (grant is gone).

---

## 6. Logout

| Step | Action | Expected Result |
|------|--------|----------------|
| 6.1 | While logged in, navigate to `http://localhost:8080/logout` (both `GET` and `POST` are accepted) | Session cookie is cleared. Redirected to `/login`. |
| 6.2 | Click the footer **"Sign out"** link on any page | Same as 6.1. |
| 6.3 | Visit `/profile` after logout | Redirected to login page. |

---

## 7. Magic Link Authentication

**Precondition:** An account exists with a known email (e.g., `alice@example.com`).

| Step | Action | Expected Result |
|------|--------|----------------|
| 7.1 | Log out. Navigate to `http://localhost:8080/login` and click **"Sign in with magic link"** | A "Send magic link" form appears below the login form with an Email field. |
| 7.2 | Submit with empty email | Error: "Email is required." |
| 7.3 | Submit with an email that has no account | Error page indicating the email was not found. |
| 7.4 | Submit with a valid email | "Check your email" confirmation page appears with the email address shown. |
| 7.5 | Open the magic link URL — in dev the token is echoed on the "Check your email" page as `Dev token: ...`, so open `http://localhost:8080/magic-link/verify?token=<dev token>` | If valid, a session is created and you are redirected to `/profile`. The profile page shows your info — you are logged in. |
| 7.6 | Try using the same magic link token again | Error page: "Invalid or expired grant." |
| 7.7 | Try using a fake token | Error page: "Invalid or expired grant." |

---

## 8. Email & Phone Verification

**Precondition:** Logged in.

| Step | Action | Expected Result |
|------|--------|----------------|
| 8.1 | Navigate to `http://localhost:8080/verify-email` | Prompts to verify your email address. If unverified, it shows a verification link (dev mode echoes the token). |
| 8.2 | Click the verification link | Email address is marked as verified and you are redirected to `/profile`, which shows `Email verified`. |
| 8.3 | Navigate to `http://localhost:8080/verify-phone`, enter a phone number (e.g., `+15551234567`), and submit | The page shows the **verification code** (dev mode echo). |
| 8.4 | Paste the code into the code field and submit | Phone is verified. You are redirected to `/profile`. |
| 8.5 | Request another verification for the same email | A new token replaces the old one (only the latest token is valid). |

---

## 9. Edge Cases & Error Handling

| Step | Action | Expected Result |
|------|--------|----------------|
| 9.1 | Visit `http://localhost:8080/authorize` without `client_id` or other params | Auth service returns an error (invalid request). |
| 9.2 | Visit `http://localhost:8080/authorize?client_id=unknown-app&response_type=code` | Auth service returns "unauthorized client" error. |
| 9.3 | Visit `http://localhost:8080/authorize?client_id=playsole-dev&response_type=token` (implicit grant, unsupported) | Auth service returns "invalid request" error. |
| 9.4 | Rapidly refresh `/login` 15+ times in quick succession | Gateway returns `429 Too Many Requests` — rate limiting kicks in for auth endpoints. |
| 9.5 | Run the section 3.6.4 fetch with a bogus `code` | `{"error":"invalid_grant","error_description":"Authorization code expired or invalid."}` |
| 9.6 | Run the section 3.6.5 fetch without an `Authorization` header | `{"error":"invalid_token","error_description":"Missing or invalid authorization header."}` |

---

## 10. Rate Limiting

Rate limits are applied per user (if logged in) or per IP (if anonymous), per endpoint category:

| Endpoint | Limit | Scope |
|----------|-------|-------|
| Login, Register, Magic Link (BFF + API) | 10 req / 60s | Per user or per IP |
| Token exchange, Revocation | 30 req / 60s | Per user or per IP |
| Profile, Consent, Sessions, Userinfo | 100 req / 60s | Per user |
| Any other request | 200 req / 60s | Per user or per IP |

---

## 11. Services, Ports & Health Checks

All BFF routes and pages are served via the gateway at `http://localhost:8080`. The individual services also run on their own ports for direct API access:

| Service | Port | Health Check |
|---------|------|-------------|
| Gateway | 8080 | `GET /health` → `{"status":"ok","service":"gateway"}` |
| Auth | 3001 | `GET /health` → `{"status":"ok","service":"auth"}` |
| Profile | 3002 | `GET /health` → `{"status":"ok","service":"profile"}` |
| Consent | 3003 | `GET /health` → `{"status":"ok","service":"consent"}` |
| Session | 3004 | `GET /health` → `{"status":"ok","service":"session"}` |
| Security | 3005 | `GET /health` → `{"status":"ok","service":"security"}` |

Well-known endpoints (also via the gateway):

- **`http://localhost:8080/.well-known/openid-configuration`** — OIDC discovery document (`issuer`, `authorization_endpoint`, `token_endpoint`, `jwks_uri`, …)
- **`http://localhost:8080/.well-known/jwks.json`** — RSA signing keys

---

## 12. Data Persistence (Supabase)

All data is stored in Supabase PostgreSQL. After any test:

- Verify the user exists in the `users` table
- Verify sessions appear in the `sessions` table
- Verify consent grants appear in the `consents` table
- Verify profiles appear in the `profiles` table
- Verify verification tokens appear in `verification_tokens`
- Verify magic link tokens appear in `magic_links`

Use the Supabase dashboard Table Editor to inspect the data directly.

Stop any running servers afterwards (`Ctrl+C` in the `npm run dev` terminal).
