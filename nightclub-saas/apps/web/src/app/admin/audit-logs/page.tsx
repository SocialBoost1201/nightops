"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type AuditLogItem = {
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

type Pagination = { page: number; limit: number; total: number };

const ACTION_SUMMARIES: Record<string, string> = {
  CREATE_ACCOUNT: "アカウント作成",
  UPDATE_ACCOUNT: "アカウント更新",
  CREATE_COMPENSATION_PLAN: "給与条件登録",
  UPDATE_COMPENSATION_PLAN: "給与条件更新",
  UPDATE_SALES_SLIP: "売上伝票修正",
  APPROVE_SALES_CHANGE_REQUEST: "売上変更申請承認",
  DAILY_CLOSE: "日次締め",
  MONTHLY_CONFIRM: "月次確定",
  REQUEST_MONTHLY_UNLOCK: "月次解除申請",
  APPROVE_MONTHLY_UNLOCK: "月次解除承認",
  REJECT_MONTHLY_UNLOCK: "月次解除却下",
  APPROVE_SHIFT_CHANGE: "シフト承認",
  REJECT_SHIFT_CHANGE: "シフト却下",
  CREATE_TENANT: "テナント作成",
  UPDATE_TENANT_STATUS_OR_PLAN: "テナント状態/プラン変更",
  UPDATE_TENANT_STATUS_FROM_BILLING: "課金起点テナント更新",
  SYNC_SUBSCRIPTION_FROM_CHECKOUT: "サブスク同期",
  UPDATE_SUBSCRIPTION_STATUS: "サブスク状態更新",
};

function getSummary(item: AuditLogItem): string {
  const label = ACTION_SUMMARIES[item.action] ?? item.action;
  if (item.resourceType && item.resourceId) {
    return `${label} (${item.resourceType})`;
  }
  return label;
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  if (data === null || data === undefined) {
    return (
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-xs text-gray-600 italic">null</p>
      </div>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 mb-1 transition-colors"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>{label}</span>
      </button>
      {open && (
        <pre className="bg-[#060a12] border border-white/5 rounded-md p-3 text-xs text-green-300 overflow-auto max-h-48 font-mono leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

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
      className="ml-2 text-xs text-gray-500 hover:text-blue-400 transition-colors"
      title="コピー"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function DetailPanel({ item, onClose }: { item: AuditLogItem; onClose: () => void }) {
  const afterData = item.afterData as Record<string, unknown> | null;
  const auditMeta = afterData?.__audit as Record<string, unknown> | undefined;
  const afterSnapshot = afterData?.snapshot;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#0d1220] border-l border-white/10 z-40 flex flex-col shadow-2xl">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-semibold text-white">監査ログ詳細</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 text-lg leading-none transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
        {/* IDs */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Correlation ID</p>
            <div className="flex items-center">
              <span className="font-mono text-xs text-blue-300 break-all">
                {item.correlationId ?? "—"}
              </span>
              {item.correlationId && <CopyButton value={item.correlationId} />}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Log ID</p>
            <div className="flex items-center">
              <span className="font-mono text-xs text-gray-400 break-all">{item.id}</span>
              <CopyButton value={item.id} />
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">日時</p>
              <p className="text-xs text-gray-300">{new Date(item.createdAt).toLocaleString("ja-JP")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">アクション</p>
              <p className="text-xs text-yellow-300 font-mono font-semibold">{item.action}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">概要</p>
              <p className="text-xs text-gray-300">{getSummary(item)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">テナント</p>
              <p className="font-mono text-xs text-gray-400 break-all">{item.tenantId}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">アクター</p>
              <p className="font-mono text-xs text-gray-400 break-all">{item.actorId ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">ロール</p>
              <p className="text-xs text-gray-300">{item.actorRole ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">リソースタイプ</p>
              <p className="text-xs text-gray-300">{item.resourceType ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">リソースID</p>
              <p className="font-mono text-xs text-gray-400 break-all">{item.resourceId ?? "—"}</p>
            </div>
          </div>
        </div>

        {(item.ipAddress || item.userAgent) && (
          <div className="border-t border-white/5 pt-4 space-y-2">
            {item.ipAddress && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">IP アドレス</p>
                <p className="font-mono text-xs text-gray-400">{item.ipAddress}</p>
              </div>
            )}
            {item.userAgent && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">User Agent</p>
                <p className="text-xs text-gray-500 break-all leading-relaxed">{item.userAgent}</p>
              </div>
            )}
          </div>
        )}

        {auditMeta && (
          <div className="border-t border-white/5 pt-4">
            <p className="text-xs text-gray-500 mb-2">監査メタ (afterData.__audit)</p>
            <div className="bg-[#060a12] border border-white/5 rounded-md p-3 space-y-1.5">
              {Object.entries(auditMeta).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-xs text-gray-500 font-mono">{k}</span>
                  <span className="text-xs text-gray-300 font-mono text-right break-all">
                    {v === null ? "null" : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/5 pt-4 space-y-3">
          <JsonViewer data={item.beforeData} label="Before スナップショット" />
          <JsonViewer data={afterSnapshot ?? item.afterData} label="After スナップショット" />
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<"Admin" | "SystemAdmin">("Admin");
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterActorId, setFilterActorId] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterRequestId, setFilterRequestId] = useState("");
  const [filterCorrelationId, setFilterCorrelationId] = useState("");
  const [filterResourceType, setFilterResourceType] = useState("");
  const [filterResourceId, setFilterResourceId] = useState("");

  const fetchData = useCallback(async (p = page) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterAction) params.set("action", filterAction);
      if (filterActorId) params.set("actorId", filterActorId);
      if (filterTenantId && role === "SystemAdmin") params.set("tenantId", filterTenantId);
      if (filterRequestId) params.set("requestId", filterRequestId);
      if (filterCorrelationId) params.set("correlationId", filterCorrelationId);
      if (filterResourceType) params.set("resourceType", filterResourceType);
      if (filterResourceId) params.set("resourceId", filterResourceId);

      const res = await fetch(`${API_URL}/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Failed to fetch");
      setItems(json.data.items);
      setPagination(json.data.pagination);
      setPage(p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterFrom, filterTo, filterAction, filterActorId, filterTenantId, filterRequestId, filterCorrelationId, filterResourceType, filterResourceId, role, page]);

  const resetFilters = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterAction("");
    setFilterActorId("");
    setFilterTenantId("");
    setFilterRequestId("");
    setFilterCorrelationId("");
    setFilterResourceType("");
    setFilterResourceId("");
  };

  const totalPages = Math.ceil(pagination.total / 20);

  return (
    <div className={`max-w-full space-y-6 transition-all ${selectedItem ? "pr-[440px]" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">監査ログ</h1>
          <p className="text-sm text-gray-400 mt-1">
            インシデント調査・財務監査・操作追跡のための監査イベント検索
          </p>
        </div>
        <button
          onClick={() => fetchData(page)}
          disabled={!token || loading}
          className="border border-white/10 hover:border-white/20 text-gray-400 hover:text-gray-200 px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-30"
        >
          更新
        </button>
      </div>

      {/* Auth + Filters */}
      <div className="bg-[#0d1220] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs text-gray-400 mb-1">Bearer Token</label>
            <input
              type="text"
              placeholder="eyJhbGci..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">ロール</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "Admin" | "SystemAdmin")}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="Admin">Admin</option>
              <option value="SystemAdmin">SystemAdmin</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="datetime-local"
              value={filterFrom}
              onChange={(e) => { setFilterFrom(e.target.value); }}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="datetime-local"
              value={filterTo}
              onChange={(e) => { setFilterTo(e.target.value); }}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">アクション</label>
            <input
              type="text"
              placeholder="APPROVE_MONTHLY_UNLOCK"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value.toUpperCase())}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-48 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">アクターID</label>
            <input
              type="text"
              placeholder="uuid..."
              value={filterActorId}
              onChange={(e) => setFilterActorId(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40"
            />
          </div>
          {role === "SystemAdmin" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">テナントID</label>
              <input
                type="text"
                placeholder="uuid..."
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
                className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Request ID</label>
            <input
              type="text"
              placeholder="exact match..."
              value={filterRequestId}
              onChange={(e) => setFilterRequestId(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Correlation ID</label>
            <input
              type="text"
              placeholder="exact match..."
              value={filterCorrelationId}
              onChange={(e) => setFilterCorrelationId(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">リソースタイプ</label>
            <input
              type="text"
              placeholder="SalesSlip..."
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-36"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">リソースID</label>
            <input
              type="text"
              placeholder="uuid..."
              value={filterResourceId}
              onChange={(e) => setFilterResourceId(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => fetchData(1)}
            disabled={!token || loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "読込中..." : "検索"}
          </button>
          <button
            onClick={resetFilters}
            className="border border-white/10 hover:border-white/20 text-gray-400 hover:text-gray-200 px-4 py-2 rounded-md text-sm transition-colors"
          >
            リセット
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#0d1220] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
            読み込み中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm">該当する監査ログがありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">日時</th>
                  <th className="px-4 py-3 text-left font-medium">アクション</th>
                  <th className="px-4 py-3 text-left font-medium">テナント</th>
                  <th className="px-4 py-3 text-left font-medium">アクター</th>
                  <th className="px-4 py-3 text-left font-medium">リソース</th>
                  <th className="px-4 py-3 text-left font-medium">Correlation</th>
                  <th className="px-4 py-3 text-left font-medium">概要</th>
                  <th className="px-4 py-3 text-center font-medium">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      selectedItem?.id === item.id ? "bg-blue-500/5 border-l-2 border-l-blue-500" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-yellow-300 font-semibold">
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-[80px] truncate">
                      {item.tenantId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-400 font-mono text-xs truncate max-w-[80px]">
                        {item.actorId ?? "—"}
                      </div>
                      {item.actorRole && (
                        <div className="text-gray-600 text-xs">{item.actorRole}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.resourceType && (
                        <div className="text-gray-300 text-xs">{item.resourceType}</div>
                      )}
                      {item.resourceId && (
                        <div className="text-gray-500 font-mono text-xs truncate max-w-[80px]">
                          {item.resourceId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-[100px] truncate">
                      {item.correlationId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs max-w-[160px]">
                      <span className="truncate block">{getSummary(item)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        詳細 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>全 {pagination.total} 件</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-white/10 hover:border-white/20 disabled:opacity-30 transition-colors"
            >
              ← 前
            </button>
            <span className="text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => fetchData(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-white/10 hover:border-white/20 disabled:opacity-30 transition-colors"
            >
              次 →
            </button>
          </div>
        </div>
      )}

      {/* Detail side panel */}
      {selectedItem && (
        <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
