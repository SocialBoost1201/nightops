export type AuditWriteMode = 'strict' | 'best_effort';
export type AuditResult = 'success' | 'failure';

export type AuditLogSource = 'api' | 'system' | 'stripe_webhook';

export type AuditSnapshot = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type AuditLogWriteInput = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  tenantId?: string;
  actorId?: string | null;
  actorRole?: string | null;
  before?: AuditSnapshot;
  after?: AuditSnapshot;
  reason?: string | null;
  correlationId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  result?: AuditResult;
  source?: AuditLogSource;
  requireReason?: boolean;
};

export type AuditLogRequestInput = AuditLogWriteInput & {
  fallbackTenantId?: string;
};
