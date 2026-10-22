export const config = {
  port: parseInt(process.env.SECURITY_PORT ?? '3005', 10),
  // WebAuthn / passkeys rely-party settings (dev: localhost over http://localhost:8080)
  rpId: process.env.MFA_RP_ID ?? 'localhost',
  rpName: process.env.MFA_RP_NAME ?? 'Playsole One',
  rpOrigin: process.env.MFA_RP_ORIGIN ?? 'http://localhost:8080',
  backupCodeCount: parseInt(process.env.BACKUP_CODE_COUNT ?? '10', 10),
  // Suspicious-activity thresholds
  newLocationWindowMs: parseInt(process.env.RISK_NEW_LOCATION_WINDOW_MS ?? '7200000', 10), // 2h
  impossibleTravelMinMs: parseInt(process.env.RISK_IMPOSSIBLE_TRAVEL_MS ?? '900000', 10), // 15 min
  // Recovery link TTL
  recoveryTokenTtlMs: parseInt(process.env.RECOVERY_TOKEN_TTL_MS ?? '1800000', 10), // 30 min
};