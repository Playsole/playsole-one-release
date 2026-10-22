import { Router } from 'express';
import { getJwks } from '../keys';

const router = Router();

router.options('/.well-known/jwks.json', (_req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, DPoP, Accept');
  res.sendStatus(204);
});

router.get('/.well-known/jwks.json', async (_req, res) => {
  try {
    const jwks = await getJwks();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, DPoP, Accept');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(jwks);
  } catch (err: any) {
    console.error('[JWKS Error]', err);
    res.status(500).json({ error: 'server_error', error_description: 'Failed to retrieve JWKS.' });
  }
});

export { router as jwksRouter };
