export interface User {
  id: string;
  tenantId: string;
  primaryEmail: string;
  primaryPhone?: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  mfaEnabled: boolean;
  status: 'active' | 'suspended' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  clientId: string;
  tokenType: 'bearer' | 'dpop';
  deviceInfo?: Record<string, unknown>;
  ipAddress: string;
  expiresAt: string;
}

export interface ConsentGrant {
  id: string;
  userId: string;
  tenantId: string;
  clientId: string;
  scopes: string[];
  grantedAt: string;
  revokedAt?: string;
}

export interface Profile {
  id: string;
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  userId?: string;
  clientId?: string;
  ipAddress: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
