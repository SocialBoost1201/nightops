"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type UnlockRequestItem = {
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

type Pagination = { page: number; limit: number; total: number };

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-300 border-yellow-700/30",
  APPROVED: "bg-green-500/15 text-green-300 border-green-700/30",
  REJECTED: "bg-red-500/15 text-red-300 border-red-700/30",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "承認待ち",
  APPROVED: "承認済み",
  REJECTED: "却下済み",
};

export default function UnlockRequestsPage() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<"Admin" | "SystemAdmin">("Admin");
  const [items, setItems] = useState<UnlockRequestItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterRequesterId, setFilterRequesterId] = useState("");
  const [filterApproverId, setFilterApproverId] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");

  const fetchData = useCallback(async (p = page) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterMonth) params.set("month", filterMonth);
      if (filterRequesterId) params.set("requesterId", filterRequesterId);
      if (filterApproverId) params.set("approverId", filterApproverId);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterTenantId && role === "SystemAdmin") params.set("tenantId", filterTenantId);

      const res = await fetch(`${API_URL}/admin/unlock-requests?${params}`, {
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
  }, [token, filterStatus, filterMonth, filterRequesterId, filterApproverId, filterFrom, filterTo, filterTenantId, role, page]);

  const resetFilters = () => {
    setFilterStatus("");
    setFilterMonth("");
    setFilterRequesterId("");
    setFilterApproverId("");
    setFilterFrom("");
    setFilterTo("");
    setFilterTenantId("");
  };

  const totalPages = Math.ceil(pagination.total / 20);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">解除申請履歴</h1>
        <p className="text-sm text-gray-400 mt-1">
          月次ロック解除申請の全履歴を確認・フィルタリングできます。
        </p>
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
            <label className="block text-xs text-gray-400 mb-1">ステータス</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="PENDING">承認待ち</option>
              <option value="APPROVED">承認済み</option>
              <option value="REJECTED">却下済み</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">対象月 (YYYY-MM)</label>
            <input
              type="text"
              placeholder="2026-03"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">申請者ID</label>
            <input
              type="text"
              placeholder="uuid..."
              value={filterRequesterId}
              onChange={(e) => setFilterRequesterId(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-40"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">承認者ID</label>
            <input
              type="text"
              placeholder="uuid..."
              value={filterApproverId}
              onChange={(e) => setFilterApproverId(e.target.value)}
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
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="datetime-local"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="datetime-local"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
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
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">該当する申請履歴がありません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">対象月</th>
                  <th className="px-4 py-3 text-left font-medium">ステータス</th>
                  <th className="px-4 py-3 text-left font-medium">申請者</th>
                  <th className="px-4 py-3 text-left font-medium">承認者</th>
                  <th className="px-4 py-3 text-left font-medium">却下者</th>
                  <th className="px-4 py-3 text-left font-medium">理由</th>
                  <th className="px-4 py-3 text-left font-medium">申請日時</th>
                  <th className="px-4 py-3 text-left font-medium">承認日時</th>
                  <th className="px-4 py-3 text-left font-medium">却下日時</th>
                  <th className="px-4 py-3 text-left font-medium">Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-300 font-medium whitespace-nowrap">
                      {item.month}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          STATUS_STYLES[item.status] ?? "bg-gray-500/15 text-gray-300 border-gray-700/30"
                        }`}
                      >
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs max-w-[100px] truncate">
                      {item.requesterId}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs max-w-[100px] truncate">
                      {item.approverId ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs max-w-[100px] truncate">
                      {item.rejectorId ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[160px]">
                      <span className="truncate block" title={item.reason}>{item.reason}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {item.approvedAt ? new Date(item.approvedAt).toLocaleString("ja-JP") : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {item.rejectedAt ? new Date(item.rejectedAt).toLocaleString("ja-JP") : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs max-w-[120px] truncate">
                      {item.correlationId ?? <span className="text-gray-600">—</span>}
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
    </div>
  );
}
