# Playsole Arena — First-Party Test App

A standalone sample web application that simulates an official Playsole First-Party ecosystem service.

## Purpose

To verify **Playsole One First-Party Authentication flow**:
- Explicit user consent prompt showing requested scopes (`first_party: false` for testing).
- OpenID Connect PKCE authorization code flow (`S256`).
- Refresh token rotation with family revocation support.
- Account chooser (`prompt=select_account`).
- Global SSO and local application logout.

## Setup & Running

```bash
cd test-apps/first-party-app
npm install
npm start
```

The app will start at `http://localhost:5001`.

## Configuration

By default, the app points to the deployed Playsole One instance:
- **Issuer**: `https://one.playsole.xyz`
- **Client ID**: `first-party-test`
- **Redirect URI**: `http://localhost:5001/callback`

You can change these via `.env` or live in the UI using the **Config** button.
