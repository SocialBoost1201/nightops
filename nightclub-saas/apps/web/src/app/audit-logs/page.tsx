"use client";

import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { TokenInput } from "@/components/admin/TokenInput";
import { Pagination } from "@/components/admin/Pagination";
import { StatePanel } from "@/components/admin/StatePanel";
import {
  apiFetch,
  buildQuery,
  fmtDate,
  type AuditLogItem,
  type ApiListResponse,
} from "@/lib/admin-api";
import { clsx } from "clsx";

// ─── Action summary helper ────────────────────────────────────────────────────
function summarizeAction(item: AuditLogItem): string {
  const after = item.afterData as Record<string, unknown> | null;
  switch (item.action) {
    case "APPROVE_MONTHLY_UNLOCK":
      return `月次アンロック承認 (${after?.month ?? "?"})`;
    case "REJECT_MONTHLY_UNLOCK":
      return `月次アンロック却下 (${after?.month ?? "?"})`;
    case "REQUEST_MONTHLY_UNLOCK":
      return `月次アンロック申請 (${after?.month ?? "?"})`;
    case "MONTHLY_CONFIRM":
      return `月次確定 (${after?.month ?? "?"})`;
    case "DAILY_CLOSE":
      return `日次締め (${after?.businessDate ?? "?"})`;
    case "UPDATE_SALES_SLIP":
      return "売上伝票更新";
    case "APPROVE_SALES_CHANGE_REQUEST":
      return "売上修正申請承認";
    case "CREATE_ACCOUNT":
      return "アカウント作成";
    case "UPDATE_ACCOUNT":
      return "アカウント更新";
    case "CREATE_COMPENSATION_PLAN":
      return "給与条件登録";
    case "UPDATE_COMPENSATION_PLAN":
      return "給与条件更新";
    case "APPROVE_SHIFT_CHANGE":
      return "シフト承認";
    case "REJECT_SHIFT_CHANGE":
      return "シフト却下";
    default:
      return item.action;
  }
}

// ─── JSON viewer ─────────────────────────────────────────────────────────────
function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(true);
  if (data === null || data === undefined) return null;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-1 transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span className="font-medium uppercase tracking-wider">{label}</span>
      </button>
      {open && (
        <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-green-400 overflow-auto max-h-48 leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-2 text-xs text-gray-600 hover:text-blue-400 transition-colors"
      title="コピー"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({ item, onClose }: { item: AuditLogItem; onClose: () => void }) {
  const after = item.afterData as Record<string, unknown> | null;
  const auditMeta = after?.__audit as Record<string, unknown> | undefined;

  return (
    <div className="w-[420px] shrink-0 border-l border-gray-800 bg-[#0d1117] flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-bold text-white">詳細</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
        {/* IDs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Correlation ID</span>
            <span className="font-mono text-xs text-gray-300 flex items-center">
              {item.correlationId ? (
                <>
                  <span title={item.correlationId}>…{item.correlationId.slice(-12)}</span>
                  <CopyButton value={item.correlationId} />
                </>
              ) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Log ID</span>
            <span className="font-mono text-xs text-gray-400 flex items-center">
              …{item.id.slice(-12)}
              <CopyButton value={item.id} />
            </span>
          </div>
        </div>

        <div className="border-t border-gray-800" />

        {/* Summary */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">サマリー</p>
          <p className="text-gray-200 font-medium">{summarizeAction(item)}</p>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <p className="text-gray-500 mb-0.5">日時</p>
            <p className="text-gray-300">{fmtDate(item.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">アクション</p>
            <p className="text-blue-400 font-mono">{item.action}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Actor</p>
            <p className="text-gray-300 font-mono" title={item.actorId ?? ""}>
              {item.actorId ? `…${item.actorId.slice(-8)}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Role</p>
            <p className="text-gray-300">{item.actorRole ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">テナント</p>
            <p className="text-gray-300 font-mono" title={item.tenantId}>
              …{item.tenantId.slice(-8)}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">リソース種別</p>
            <p className="text-gray-300">{item.resourceType ?? "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">リソースID</p>
            <p className="text-gray-300 font-mono" title={item.resourceId ?? ""}>
              {item.resourceId ? `…${item.resourceId.slice(-8)}` : "—"}
            </p>
          </div>
          {item.ipAddress && (
            <div>
              <p className="text-gray-500 mb-0.5">IP</p>
              <p className="text-gray-300 font-mono">{item.ipAddress}</p>
            </div>
          )}
        </div>

        {item.userAgent && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">User Agent</p>
            <p className="text-gray-500 text-xs break-all">{item.userAgent}</p>
          </div>
        )}

        <div className="border-t border-gray-800" />

        {/* Snapshots */}
        <JsonBlock data={item.beforeData} label="Before" />
        <JsonBlock data={item.afterData} label="After" />
        {auditMeta && <JsonBlock data={auditMeta} label="Audit Meta" />}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AuditLogsPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(
    async (p = page) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const q = buildQuery({
          from: from || undefined,
          to: to || undefined,
          action: action || undefined,
          actorId: actorId || undefined,
          tenantId: tenantId || undefined,
          requestId: requestId || undefined,
          correlationId: correlationId || undefined,
          resourceType: resourceType || undefined,
          resourceId: resourceId || undefined,
          page: p,
          limit,
        });
        const res = await apiFetch<ApiListResponse<AuditLogItem>>(
          `/admin/audit-logs${q}`,
          token
        );
        setItems(res.data.items);
        setPagination(res.data.pagination);
        setHasLoaded(true);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    },
    [token, from, to, action, actorId, tenantId, requestId, correlationId, resourceType, resourceId, page, limit]
  );

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchData(p);
  };

  const resetFilters = () => {
    setFrom(""); setTo(""); setAction(""); setActorId(""); setTenantId("");
    setRequestId(""); setCorrelationId(""); setResourceType(""); setResourceId("");
    setLimit(20); setPage(1);
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left: main content */}
        <div className={clsx("flex flex-col flex-1 min-w-0 overflow-hidden", selected ? "border-r border-gray-800" : "")}>
          <div className="overflow-y-auto flex-1">
            <div className="max-w-full px-6 py-8">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">監査ログ</h1>
                <p className="text-sm text-gray-500 mt-1">
                  操作履歴の検索・調査。correlationId / requestId でインシデントをトレースできます。
                </p>
              </div>

              {/* Auth + Filters */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 mb-6 space-y-4">
                <TokenInput
                  token={token}
                  onChange={setToken}
                  onSubmit={() => { setPage(1); fetchData(1); }}
                  loading={loading}
                />
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">From</label>
                    <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">To</label>
                    <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Action</label>
                    <input type="text" placeholder="APPROVE_MONTHLY_UNLOCK" value={action} onChange={(e) => setAction(e.target.value.toUpperCase())}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-44" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Actor ID</label>
                    <input type="text" placeholder="UUID" value={actorId} onChange={(e) => setActorId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-32" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Tenant ID</label>
                    <input type="text" placeholder="UUID" value={tenantId} onChange={(e) => setTenantId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-32" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Correlation ID</label>
                    <input type="text" placeholder="exact match" value={correlationId} onChange={(e) => setCorrelationId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-36" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Request ID</label>
                    <input type="text" placeholder="exact match" value={requestId} onChange={(e) => setRequestId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-36" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Resource Type</label>
                    <input type="text" placeholder="SalesSlip" value={resourceType} onChange={(e) => setResourceType(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-28" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Resource ID</label>
                    <input type="text" placeholder="UUID" value={resourceId} onChange={(e) => setResourceId(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-32" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">件数</label>
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                      className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500">
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}件</option>)}
                    </select>
                  </div>
                  <button onClick={() => { setPage(1); fetchData(1); }} disabled={loading || !token}
                    className="px-3 py-1.5 text-sm border border-gray-700 rounded hover:border-gray-500 text-gray-300 disabled:opacity-30 transition-colors">
                    検索
                  </button>
                  <button onClick={resetFilters}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    リセット
                  </button>
                  <button onClick={() => fetchData(page)}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    更新
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-lg overflow-hidden">
                {loading ? (
                  <StatePanel state="loading" />
                ) : error ? (
                  <StatePanel state="error" message={error} onRetry={() => fetchData(page)} />
                ) : hasLoaded && items.length === 0 ? (
                  <StatePanel state="empty" message="該当する監査ログがありません" />
                ) : items.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                            <th className="px-4 py-3 text-left font-medium whitespace-nowrap">日時</th>
                            <th className="px-4 py-3 text-left font-medium">Action</th>
                            <th className="px-4 py-3 text-left font-medium">テナント</th>
                            <th className="px-4 py-3 text-left font-medium">Actor</th>
                            <th className="px-4 py-3 text-left font-medium">Resource</th>
                            <th className="px-4 py-3 text-left font-medium">Correlation</th>
                            <th className="px-4 py-3 text-left font-medium">サマリー</th>
                            <th className="px-4 py-3 text-center font-medium">詳細</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                          {items.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelected(item)}
                              className={clsx(
                                "hover:bg-gray-800/40 transition-colors cursor-pointer",
                                selected?.id === item.id && "bg-blue-900/20 border-l-2 border-blue-500"
                              )}
                            >
                              <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                {fmtDate(item.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-blue-400">{item.action}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 font-mono text-xs" title={item.tenantId}>
                                …{item.tenantId.slice(-8)}
                              </td>
                              <td className="px-4 py-3 text-gray-400 font-mono text-xs" title={item.actorId ?? ""}>
                                {item.actorId ? `…${item.actorId.slice(-8)}` : "—"}
                                {item.actorRole && (
                                  <span className="ml-1 text-gray-600">({item.actorRole})</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">
                                {item.resourceType && (
                                  <span>{item.resourceType}</span>
                                )}
                                {item.resourceId && (
                                  <span className="text-gray-600 font-mono ml-1">…{item.resourceId.slice(-6)}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-xs" title={item.correlationId ?? ""}>
                                {item.correlationId ? `…${item.correlationId.slice(-8)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-gray-300 text-xs max-w-[160px]">
                                <span className="truncate block">{summarizeAction(item)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelected(item); }}
                                  className="text-xs text-gray-500 hover:text-blue-400 transition-colors px-2 py-0.5 border border-gray-700 rounded hover:border-blue-500"
                                >
                                  詳細
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={pagination.page}
                      total={pagination.total}
                      limit={pagination.limit}
                      onChange={handlePageChange}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <DetailPanel item={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </AdminLayout>
  );
}
