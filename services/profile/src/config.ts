export const config = {
  port: parseInt(process.env.PROFILE_PORT ?? '3002', 10),
  issuer:
    process.env.OIDC_ISSUER ||
    process.env.BASE_URL ||
    process.env.PUBLIC_ORIGIN ||
    process.env.PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === 'production' || process.env.CLOUDFLARE_WORKER === 'true'
      ? 'https://one.playsole.xyz'
      : 'http://localhost:8080'),
};
