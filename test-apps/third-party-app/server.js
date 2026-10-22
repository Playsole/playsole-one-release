import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Runtime configuration (editable from UI)
const appConfig = {
  port: parseInt(process.env.PORT || '5002', 10),
  issuer: process.env.PLAYSOLE_ISSUER || 'https://one.playsole.xyz',
  clientId: process.env.PLAYSOLE_CLIENT_ID || 'third-party-test',
  clientSecret: process.env.PLAYSOLE_CLIENT_SECRET || '',
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:5002/callback',
  scopes: process.env.SCOPES || 'openid profile email',
};

// In-memory state storage for PKCE and local session
const pendingStates = new Map(); // state -> { codeVerifier, issuer, createdAt }
let activeSession = null; // Current authenticated session
let eventLog = []; // Protocol event log

function addLog(action, status, detail) {
  eventLog.unshift({
    timestamp: new Date().toLocaleTimeString(),
    action,
    status,
    detail: typeof detail === 'object' ? JSON.stringify(detail, null, 2) : String(detail),
  });
  if (eventLog.length > 30) eventLog.pop();
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// ── Endpoints ──

// 1. Get status & session
app.get('/api/status', (req, res) => {
  res.json({
    config: appConfig,
    session: activeSession,
    logs: eventLog,
  });
});

// 2. Update config dynamically
app.post('/api/config', (req, res) => {
  const { issuer, clientId, redirectUri, scopes } = req.body;
  if (issuer) appConfig.issuer = issuer.replace(/\/+$/, '');
  if (clientId) appConfig.clientId = clientId;
  if (redirectUri) appConfig.redirectUri = redirectUri;
  if (scopes) appConfig.scopes = scopes;
  addLog('Config Updated', 'success', appConfig);
  res.json({ ok: true, config: appConfig });
});

// 3. Initiate Login (Redirect to Playsole One /authorize)
app.get('/login', (req, res) => {
  const prompt = req.query.prompt;
  
  // PKCE Code Verifier
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  
  // PKCE Code Challenge (S256)
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  const state = crypto.randomBytes(16).toString('hex');

  pendingStates.set(state, {
    codeVerifier,
    issuer: appConfig.issuer,
    clientId: appConfig.clientId,
    clientSecret: appConfig.clientSecret,
    redirectUri: appConfig.redirectUri,
    createdAt: Date.now(),
  });

  const authUrl = new URL(`${appConfig.issuer}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', appConfig.clientId);
  authUrl.searchParams.set('redirect_uri', appConfig.redirectUri);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('scope', appConfig.scopes);
  authUrl.searchParams.set('state', state);
  if (prompt) {
    authUrl.searchParams.set('prompt', prompt);
  }

  addLog('Initiate 3rd-Party Auth', 'redirect', {
    target: authUrl.toString(),
    client_id: appConfig.clientId,
    notice: 'Consent screen will be presented to user by Playsole One',
    code_challenge: codeChallenge,
    state,
  });

  res.redirect(authUrl.toString());
});

// 4. OAuth Callback Handler
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    const isConsentDenied = error === 'access_denied';
    addLog(
      isConsentDenied ? 'Consent Denied by User' : 'OAuth Error',
      'error',
      { error, description: error_description || (isConsentDenied ? 'User clicked Deny on the consent screen.' : '') }
    );
    return res.redirect(`/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`);
  }

  if (!code || !state) {
    addLog('Callback Error', 'error', 'Missing code or state in callback');
    return res.redirect('/?error=invalid_callback&error_description=Missing+code+or+state');
  }

  const stored = pendingStates.get(state);
  if (!stored) {
    addLog('State Mismatch', 'error', 'State expired or mismatched');
    return res.redirect('/?error=invalid_state&error_description=State+expired+or+mismatched');
  }
  pendingStates.delete(state);

  try {
    addLog('Token Exchange Request', 'info', `Exchanging code at ${stored.issuer}/token...`);
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      code_verifier: stored.codeVerifier,
      redirect_uri: stored.redirectUri,
      client_id: stored.clientId,
      client_secret: stored.clientSecret,
    });

    const tokenRes = await fetch(`${stored.issuer}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      addLog('Token Exchange Failed', 'error', tokenData);
      return res.redirect(`/?error=${encodeURIComponent(tokenData.error || 'token_error')}&error_description=${encodeURIComponent(tokenData.error_description || 'Token request failed')}`);
    }

    addLog('Token Exchange Success', 'success', {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      has_access_token: Boolean(tokenData.access_token),
      has_id_token: Boolean(tokenData.id_token),
      has_refresh_token: Boolean(tokenData.refresh_token),
    });

    // Fetch UserInfo with access token
    let userInfo = null;
    try {
      const userRes = await fetch(`${stored.issuer}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      if (userRes.ok) {
        userInfo = await userRes.json();
        addLog('UserInfo Fetched', 'success', userInfo);
      } else {
        addLog('UserInfo Failed', 'warning', await userRes.text());
      }
    } catch (uErr) {
      addLog('UserInfo Error', 'warning', uErr.message);
    }

    const idTokenClaims = tokenData.id_token ? parseJwt(tokenData.id_token) : null;

    activeSession = {
      tokens: tokenData,
      idTokenClaims,
      userInfo,
      authenticatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (tokenData.expires_in || 900) * 1000).toISOString(),
    };

    res.redirect('/?auth=success');
  } catch (err) {
    addLog('Token Exchange Exception', 'error', err.message);
    res.redirect(`/?error=server_error&error_description=${encodeURIComponent(err.message)}`);
  }
});

// 5. Rotate Refresh Token
app.post('/api/refresh', async (req, res) => {
  if (!activeSession || !activeSession.tokens?.refresh_token) {
    return res.status(400).json({ error: 'no_session', error_description: 'No active session or refresh token' });
  }

  try {
    addLog('Refresh Token Request', 'info', 'Rotating refresh token at /token...');
    const refreshParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: activeSession.tokens.refresh_token,
      client_id: appConfig.clientId,
      client_secret: appConfig.clientSecret,
    });

    const response = await fetch(`${appConfig.issuer}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: refreshParams.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      addLog('Token Refresh Failed', 'error', data);
      return res.status(response.status).json(data);
    }

    addLog('Token Refreshed & Rotated', 'success', {
      new_refresh_token_preview: data.refresh_token ? data.refresh_token.slice(0, 10) + '...' : 'none',
      expires_in: data.expires_in,
    });

    activeSession.tokens.access_token = data.access_token;
    activeSession.tokens.refresh_token = data.refresh_token;
    activeSession.tokens.expires_in = data.expires_in;
    activeSession.expiresAt = new Date(Date.now() + (data.expires_in || 900) * 1000).toISOString();

    res.json({ ok: true, session: activeSession });
  } catch (err) {
    addLog('Token Refresh Exception', 'error', err.message);
    res.status(500).json({ error: 'refresh_failed', error_description: err.message });
  }
});

// 6. Logout / Clear Session
app.get('/logout', (req, res) => {
  const global = req.query.global === 'true';
  activeSession = null;
  addLog('Logged Out', 'info', global ? 'Local + Global SSO Logout initiated' : 'Local 3rd-party session destroyed');

  if (global) {
    return res.redirect(`${appConfig.issuer}/logout`);
  }
  res.redirect('/?logged_out=true');
});

// Start Server
app.listen(appConfig.port, () => {
  console.log(`\n======================================================`);
  console.log(`🎮 [THIRD-PARTY TEST APP] Running at http://localhost:${appConfig.port}`);
  console.log(`🌐 Configured Playsole One Issuer: ${appConfig.issuer}`);
  console.log(`🔑 Client ID: ${appConfig.clientId} (Third-Party / Consent Required)`);
  console.log(`🎯 Redirect URI: ${appConfig.redirectUri}`);
  console.log(`======================================================\n`);
});
