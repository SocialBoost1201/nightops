export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PendingApprovalItem = {
  id: string;
  type: string;
  tenantId: string;
  month: string;
  requesterId: string;
  reason: string;
  status: string;
  createdAt: string;
  correlationId: string | null;
  summary: { month: string };
};

export type UnlockRequestItem = {
  id: string;
  tenantId: string;
  month: string;
  requesterId: string;
  approverId: string | null;
  rejectorId: string | null;
  reason: string;
  status: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  correlationId: string | null;
};

export type AuditLogItem = {
  id: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  tenantId: string;
  resourceType: string | null;
  resourceId: string | null;
  beforeData: unknown;
  afterData: unknown;
  correlationId: string | null;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
};

export type ApiListResponse<T> = {
  success: true;
  data: { items: T[]; pagination: Pagination };
  meta: { correlationId: string };
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    correlationId: string;
    field?: string;
  };
};

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const json = await res.json();

  if (!res.ok) {
    const errBody = json as ApiErrorResponse;
    throw new Error(errBody?.error?.message ?? `HTTP ${res.status}`);
  }

  return json as T;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP");
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  APPROVED: "bg-green-500/15 text-green-400 border border-green-500/30",
  REJECTED: "bg-red-500/15 text-red-400 border border-red-500/30",
};
