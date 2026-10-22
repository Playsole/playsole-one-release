# Playsole One — Test Web Applications (`test-apps`)

This folder contains two completely standalone test web applications created from the perspective of an external developer with **zero internal dependencies or coupling** to Playsole One internals.

```
test-apps/
├── first-party-app/   → Simulates Playsole Arena (First-Party Client, port 5001)
├── third-party-app/   → Simulates SkyBattle Studios (Third-Party Partner Client, port 5002)
└── README.md          → Test guide and quickstart
```

---

## 1. Quick Start

### First-Party Test App (Port 5001)
```bash
cd test-apps/first-party-app
npm install
npm start
```
Open **`http://localhost:5001`** in your browser.

### Third-Party Test App (Port 5002)
```bash
cd test-apps/third-party-app
npm install
npm start
```
Open **`http://localhost:5002`** in your browser.

---

## 2. Testing Scenarios

### Scenario A: First-Party App (Port 5001)
1. Open **`http://localhost:5001`** (First-Party App).
2. Click **"Sign In with Playsole"**.
3. You are redirected to `https://one.playsole.xyz`.
4. Playsole One **prompts you with the Consent Screen** for *Playsole Arena (First Party)* requesting permissions.
5. Click **"Allow / Authorize"**.
6. You are returned to `http://localhost:5001` with tokens and profile info.
7. Click **"🔄 Rotate Refresh Token"** to test token rotation.
8. Click **"📋 Revoke Grant on Playsole"** to revoke consent from your Playsole account and test the consent prompt again!

### Scenario B: Third-Party Partner App (Port 5002)
1. Open **`http://localhost:5002`** (Third-Party App).
2. Click **"Connect Playsole Account"**.
3. Playsole One **prompts you with the Consent Screen** for *SkyBattle Arena (Third Party)*.
4. **Test Denial:** Click **"Deny"**. You will be returned to the app with `error=access_denied`, which the app displays gracefully.
5. **Test Approval:** Click **"Connect Playsole Account"** again and click **"Allow / Authorize"**.
6. Tokens and profile are displayed.
7. Click **"📋 Revoke Consent on Playsole"** to test revoking permissions.
