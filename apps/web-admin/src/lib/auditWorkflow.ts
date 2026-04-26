import { apiClient } from '@/lib/api';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

export interface WorkflowListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actorId: string;
  actorRole: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  beforeData: unknown | null;
  afterData: unknown | null;
  correlationId: string | null;
  requestId: string | null;
  reason: string | null;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditLogQuery {
  from?: string;
  to?: string;
  action?: string;
  actorId?: string;
  tenantId?: string;
  requestId?: string;
  correlationId?: string;
  resourceType?: string;
  resourceId?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
};

function toQueryParams(input: Record<string, string | number | undefined>): Record<string, string | number> {
  const output: Record<string, string | number> = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }
    output[key] = value;
  });

  return output;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function unwrapListResponse<T>(raw: unknown): WorkflowListResponse<T> {
  const responseBody = raw as Record<string, unknown> | undefined;
  const envelopeData = responseBody?.data;

  if (Array.isArray(envelopeData)) {
    const meta = (responseBody?.meta as Record<string, unknown> | undefined) ?? {};
    return {
      items: envelopeData as T[],
      pagination: {
        page: toNumber(meta.page, DEFAULT_PAGINATION.page),
        limit: toNumber(meta.pageSize, DEFAULT_PAGINATION.limit),
        total: toNumber(meta.total, envelopeData.length),
      },
    };
  }

  const source = (envelopeData as Record<string, unknown> | undefined) ?? responseBody ?? {};
  const items = Array.isArray(source.items) ? (source.items as T[]) : [];

  const paginationSource =
    (source.pagination as Record<string, unknown> | undefined) ??
    (source.meta as Record<string, unknown> | undefined) ??
    {};

  const resolvedLimit = toNumber(
    paginationSource.limit ?? paginationSource.pageSize,
    DEFAULT_PAGINATION.limit,
  );

  return {
    items,
    pagination: {
      page: toNumber(paginationSource.page, DEFAULT_PAGINATION.page),
      limit: resolvedLimit,
      total: toNumber(paginationSource.total, DEFAULT_PAGINATION.total),
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(record: Record<string, unknown> | null, keys: string[]): string | undefined {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const current = record[key];
    if (typeof current === 'string' && current.trim().length > 0) {
      return current;
    }
  }

  return undefined;
}

function deriveMonth(item: AuditLogItem): string | undefined {
  const sources = [item.afterData, item.beforeData];

  for (const source of sources) {
    const record = asRecord(source);
    const directMonth = pickString(record, ['month', 'targetMonth']);
    if (directMonth) {
      return directMonth;
    }

    const summaryRecord = asRecord(record?.summary);
    const summaryMonth = pickString(summaryRecord, ['month']);
    if (summaryMonth) {
      return summaryMonth;
    }

    const snapshotRecord = asRecord(record?.snapshot);
    const snapshotMonth = pickString(snapshotRecord, ['month']);
    if (snapshotMonth) {
      return snapshotMonth;
    }
  }

  return undefined;
}

function toTitleCaseFromSnakeCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export function buildAuditSummary(item: AuditLogItem): string {
  const action = item.action.toUpperCase();
  const month = deriveMonth(item);

  if (action.includes('MONTHLY_UNLOCK')) {
    if (action.includes('APPROVE')) {
      return `Monthly unlock approved${month ? ` for ${month}` : ''}`;
    }
    if (action.includes('REJECT')) {
      return `Monthly unlock rejected${month ? ` for ${month}` : ''}`;
    }
    if (action.includes('REQUEST')) {
      return `Monthly unlock requested${month ? ` for ${month}` : ''}`;
    }
  }

  if (action.includes('DAILY_CLOSE') && (action.includes('COMPLETE') || action.includes('CLOSE'))) {
    return 'Daily close completed';
  }

  if (action.includes('SALES') && (action.includes('UPDATE') || action.includes('EDIT'))) {
    return 'Sales slip updated';
  }

  if (action.includes('COMPENSATION') && action.includes('UPDATE')) {
    return 'Compensation plan updated';
  }

  const fallbackAction = toTitleCaseFromSnakeCase(item.action);
  if (item.resourceType && item.resourceId) {
    return `${fallbackAction} on ${item.resourceType} (${item.resourceId})`;
  }

  if (item.resourceType) {
    return `${fallbackAction} on ${item.resourceType}`;
  }

  return fallbackAction;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ja-JP');
}

export function getAuditMetaFromAfterData(afterData: unknown): unknown | null {
  const afterRecord = asRecord(afterData);
  if (!afterRecord) {
    return null;
  }

  const auditMeta = afterRecord.__audit;
  return auditMeta === undefined ? null : auditMeta;
}

export async function fetchAuditLogs(query: AuditLogQuery): Promise<WorkflowListResponse<AuditLogItem>> {
  const params = toQueryParams({
    from: query.from,
    to: query.to,
    action: query.action,
    actorId: query.actorId,
    tenantId: query.tenantId,
    requestId: query.requestId,
    correlationId: query.correlationId,
    resourceType: query.resourceType,
    resourceId: query.resourceId,
    page: query.page,
    limit: query.limit,
  });

  const response = await apiClient.get('/admin/audit-logs', { params });
  return unwrapListResponse<AuditLogItem>(response.data);
}
