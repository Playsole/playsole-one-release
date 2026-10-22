export const config = {
  gatewayPort: parseInt(process.env.PORT ?? '8080', 10),
  ports: {
    auth: parseInt(process.env.AUTH_PORT ?? '3001', 10),
    profile: parseInt(process.env.PROFILE_PORT ?? '3002', 10),
    consent: parseInt(process.env.CONSENT_PORT ?? '3003', 10),
    session: parseInt(process.env.SESSION_PORT ?? '3004', 10),
    security: parseInt(process.env.SECURITY_PORT ?? '3005', 10),
  },
  tls: {
    enabled: process.env.TLS_ENABLED === 'true',
    certPath: process.env.TLS_CERT_PATH,
    keyPath: process.env.TLS_KEY_PATH,
  },
};