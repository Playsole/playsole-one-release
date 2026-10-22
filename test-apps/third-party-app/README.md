# SkyBattle Arena — Third-Party Partner Test App

A standalone sample web application that simulates an external third-party partner or game studio integrating Playsole One.

## Purpose

To verify **Playsole One Third-Party OAuth & Consent behavior**:
- Enforces the **OAuth 2.0 Consent Screen** showing requested scopes.
- Handles user approval vs. user denial (`error=access_denied`).
- Demonstrates grant revocation via Playsole One's security dashboard (`/dashboard?tab=security`).
- OpenID Connect PKCE authorization code flow (`S256`).
- Refresh token rotation.

## Setup & Running

```bash
cd test-apps/third-party-app
npm install
npm start
```

The app will start at `http://localhost:5002`.

## Configuration

By default, the app points to the deployed Playsole One instance:
- **Issuer**: `https://one.playsole.xyz`
- **Client ID**: `third-party-test`
- **Redirect URI**: `http://localhost:5002/callback`

You can change these via `.env` or live in the UI using the **Config** button.
