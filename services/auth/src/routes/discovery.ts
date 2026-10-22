import { Router } from 'express';
import { config } from '../config';

const router = Router();

router.options('/.well-known/openid-configuration', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, DPoP, Accept');
  res.sendStatus(204);
});

router.get('/.well-known/openid-configuration', (req, res) => {
  const host = req.get('x-forwarded-host') || req.get('host');
  let issuer = config.issuer;
  if (
    process.env.BASE_URL ||
    process.env.PUBLIC_ORIGIN ||
    process.env.OIDC_ISSUER
  ) {
    issuer = (process.env.OIDC_ISSUER || process.env.BASE_URL || process.env.PUBLIC_ORIGIN)!.replace(/\/+$/, '');
  } else if (host && host.includes('playsole.xyz')) {
    issuer = 'https://one.playsole.xyz';
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, DPoP, Accept');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    revocation_endpoint: `${issuer}/revoke`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    dpop_signing_alg_values_supported: ['ES256', 'RS256'],
    claims_supported: ['sub', 'name', 'email', 'picture', 'email_verified', 'locale', 'cnf'],
    id_token_signing_alg_values_supported: ['RS256'],
    subject_types_supported: ['public'],
  });
});

export { router as discoveryRouter };
