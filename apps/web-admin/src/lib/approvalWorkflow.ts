import axios from 'axios';
import { apiClient } from '@/lib/api';

export type ApprovalType = 'MONTHLY_UNLOCK';

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
}

export interface PendingApprovalSummary {
  month: string;
}

export interface PendingApprovalItem {
  id: string;
  type: ApprovalType;
  tenantId: string;
  month: string;
  requesterId: string;
  reason: string;
  status: 'PENDING';
  createdAt: string;
  correlationId: string | null;
  summary: PendingApprovalSummary;
}

export interface PendingApprovalsQuery {
  type?: ApprovalType;
  from?: string;
  to?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}

export interface WorkflowListResponse<T> {
  items: T[];
  pagination: PaginationInfo;
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

function unwrapListResponse<T>(raw: unknown): WorkflowListResponse<T> {
  const wrapped = (raw as any)?.data;
  const source = wrapped?.items ? wrapped : (raw as any);

  const items = Array.isArray(source?.items) ? (source.items as T[]) : [];
  const pagination = source?.pagination ?? DEFAULT_PAGINATION;

  return {
    items,
    pagination: {
      page: Number(pagination.page ?? DEFAULT_PAGINATION.page),
      limit: Number(pagination.limit ?? DEFAULT_PAGINATION.limit),
      total: Number(pagination.total ?? DEFAULT_PAGINATION.total),
    },
  };
}

export async function fetchPendingApprovals(query: PendingApprovalsQuery): Promise<WorkflowListResponse<PendingApprovalItem>> {
  const params = toQueryParams({
    type: query.type,
    from: query.from,
    to: query.to,
    tenantId: query.tenantId,
    page: query.page,
    limit: query.limit,
  });
  const response = await apiClient.get('/admin/approvals/pending', { params });
  return unwrapListResponse<PendingApprovalItem>(response.data);
}

export function formatApprovalType(value: ApprovalType): string {
  if (value === 'MONTHLY_UNLOCK') {
    return 'Monthly Unlock';
  }
  return value;
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

export function extractApiErrorMessage(error: unknown, fallbackMessage: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as any;
    if (typeof responseData?.message === 'string') {
      return responseData.message;
    }
    if (typeof responseData?.error === 'string') {
      return responseData.error;
    }
    if (typeof responseData?.data?.message === 'string') {
      return responseData.data.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
