export const AUDIT_LOGS_PATH = '/audit-logs';
export const DEFAULT_AUDIT_LOG_LIMIT = 20;

export type AuditNavigationSource = 'pending-approvals' | 'unlock-request-history';
export type UnlockAuditAction = 'REQUEST_MONTHLY_UNLOCK' | 'APPROVE_MONTHLY_UNLOCK' | 'REJECT_MONTHLY_UNLOCK';

export interface AuditLogFilterValues {
  from: string;
  to: string;
  action: string;
  actorId: string;
  tenantId: string;
  requestId: string;
  correlationId: string;
  resourceType: string;
  resourceId: string;
}

export interface AuditLogUrlState {
  filters: AuditLogFilterValues;
  page: number;
  limit: number;
  source: string;
}

interface SearchParamsLike {
  get(name: string): string | null;
}

interface BuildAuditLogHrefOptions {
  requestId?: string | null;
  correlationId?: string | null;
  actorId?: string | null;
  action?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  source?: AuditNavigationSource;
}

export function createEmptyAuditLogFilterValues(): AuditLogFilterValues {
  return {
    from: '',
    to: '',
    action: '',
    actorId: '',
    tenantId: '',
    requestId: '',
    correlationId: '',
    resourceType: '',
    resourceId: '',
  };
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function appendQueryParam(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (!value) {
    return;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return;
  }

  params.set(key, normalized);
}

export function buildAuditLogHref({
  requestId,
  correlationId,
  actorId,
  action,
  resourceType,
  resourceId,
  source,
}: BuildAuditLogHrefOptions): string {
  const params = new URLSearchParams();

  appendQueryParam(params, 'requestId', requestId);
  appendQueryParam(params, 'correlationId', correlationId);
  appendQueryParam(params, 'actorId', actorId);
  appendQueryParam(params, 'action', action);
  appendQueryParam(params, 'resourceType', resourceType);
  appendQueryParam(params, 'resourceId', resourceId);
  appendQueryParam(params, 'source', source);

  const queryString = params.toString();
  return queryString.length > 0 ? `${AUDIT_LOGS_PATH}?${queryString}` : AUDIT_LOGS_PATH;
}

export function parseAuditLogSearchParams(searchParams: SearchParamsLike): AuditLogUrlState {
  return {
    filters: {
      from: searchParams.get('from') ?? '',
      to: searchParams.get('to') ?? '',
      action: searchParams.get('action') ?? '',
      actorId: searchParams.get('actorId') ?? '',
      tenantId: searchParams.get('tenantId') ?? '',
      requestId: searchParams.get('requestId') ?? '',
      correlationId: searchParams.get('correlationId') ?? '',
      resourceType: searchParams.get('resourceType') ?? '',
      resourceId: searchParams.get('resourceId') ?? '',
    },
    page: parsePositiveInt(searchParams.get('page'), 1),
    limit: parsePositiveInt(searchParams.get('limit'), DEFAULT_AUDIT_LOG_LIMIT),
    source: searchParams.get('source') ?? '',
  };
}

export function buildAuditLogPageHref({
  filters,
  page,
  limit,
  source,
  isSystemAdmin,
}: {
  filters: AuditLogFilterValues;
  page: number;
  limit: number;
  source: string;
  isSystemAdmin: boolean;
}): string {
  const params = new URLSearchParams();

  appendQueryParam(params, 'from', filters.from);
  appendQueryParam(params, 'to', filters.to);
  appendQueryParam(params, 'action', filters.action);
  appendQueryParam(params, 'actorId', filters.actorId);
  appendQueryParam(params, 'requestId', filters.requestId);
  appendQueryParam(params, 'correlationId', filters.correlationId);
  appendQueryParam(params, 'resourceType', filters.resourceType);
  appendQueryParam(params, 'resourceId', filters.resourceId);

  if (isSystemAdmin) {
    appendQueryParam(params, 'tenantId', filters.tenantId);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  if (limit !== DEFAULT_AUDIT_LOG_LIMIT) {
    params.set('limit', String(limit));
  }

  appendQueryParam(params, 'source', source);

  const queryString = params.toString();
  return queryString.length > 0 ? `${AUDIT_LOGS_PATH}?${queryString}` : AUDIT_LOGS_PATH;
}

export function hasLinkedAuditContext(filters: AuditLogFilterValues): boolean {
  return Boolean(filters.requestId || filters.correlationId || filters.actorId || filters.action);
}

export function getTraceabilityHelperText(source: string, filters: AuditLogFilterValues): string | null {
  if (!hasLinkedAuditContext(filters)) {
    return null;
  }

  if (source === 'pending-approvals') {
    return 'この承認待ち申請に関連する監査ログを表示中です。';
  }

  if (source === 'unlock-request-history') {
    return 'このアンロック申請履歴に関連する監査ログを表示中です。';
  }

  return 'クエリで絞り込まれた監査ログを表示中です。';
}

export function getUnlockAuditAction(status: 'PENDING' | 'APPROVED' | 'REJECTED'): UnlockAuditAction {
  if (status === 'APPROVED') {
    return 'APPROVE_MONTHLY_UNLOCK';
  }

  if (status === 'REJECTED') {
    return 'REJECT_MONTHLY_UNLOCK';
  }

  return 'REQUEST_MONTHLY_UNLOCK';
}
