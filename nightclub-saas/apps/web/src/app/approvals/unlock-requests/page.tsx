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
  STATUS_COLORS,
  type UnlockRequestItem,
  type ApiListResponse,
} from "@/lib/admin-api";
import { clsx } from "clsx";

const STATUSES = ["", "PENDING", "APPROVED", "REJECTED"] as const;

export default function UnlockRequestsPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<UnlockRequestItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filters
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [requesterId, setRequesterId] = useState("");
  const [approverId, setApproverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(
    async (p = page) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const q = buildQuery({
          status: status || undefined,
          month: month || undefined,
          requesterId: requesterId || undefined,
          approverId: approverId || undefined,
          from: from || undefined,
          to: to || undefined,
          page: p,
          limit,
        });
        const res = await apiFetch<ApiListResponse<UnlockRequestItem>>(
          `/admin/unlock-requests${q}`,
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
    [token, status, month, requesterId, approverId, from, to, page, limit]
  );

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchData(p);
  };

  const resetFilters = () => {
    setStatus("");
    setMonth("");
    setRequesterId("");
    setApproverId("");
    setFrom("");
    setTo("");
    setLimit(20);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">アンロック申請履歴</h1>
          <p className="text-sm text-gray-500 mt-1">
            月次確定アンロック申請の全履歴を確認します。ガバナンス審査・監査調査に使用してください。
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
              <label className="text-xs text-gray-500">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s || "すべて"}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">月 (YYYY-MM)</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">申請者ID</label>
              <input
                type="text"
                placeholder="UUID"
                value={requesterId}
                onChange={(e) => setRequesterId(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">承認者ID</label>
              <input
                type="text"
                placeholder="UUID"
                value={approverId}
                onChange={(e) => setApproverId(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 placeholder-gray-700 focus:outline-none focus:border-blue-500 w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">件数</label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}件</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => { setPage(1); fetchData(1); }}
              disabled={loading || !token}
              className="px-3 py-1.5 text-sm border border-gray-700 rounded hover:border-gray-500 text-gray-300 disabled:opacity-30 transition-colors"
            >
              検索
            </button>
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              リセット
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
            <StatePanel state="empty" message="該当する申請履歴がありません" />
          ) : items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-medium">月</th>
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
                  <tbody className="divide-y divide-gray-800/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-blue-400 font-medium whitespace-nowrap">
                          {item.month}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "text-xs px-2 py-0.5 rounded font-medium",
                              STATUS_COLORS[item.status] ?? "bg-gray-700 text-gray-300"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs" title={item.requesterId}>
                          …{item.requesterId.slice(-8)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs" title={item.approverId ?? ""}>
                          {item.approverId ? `…${item.approverId.slice(-8)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs" title={item.rejectorId ?? ""}>
                          {item.rejectorId ? `…${item.rejectorId.slice(-8)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-300 max-w-[180px]">
                          <span className="truncate block text-xs" title={item.reason}>{item.reason}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(item.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(item.approvedAt)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(item.rejectedAt)}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs" title={item.correlationId ?? ""}>
                          {item.correlationId ? `…${item.correlationId.slice(-8)}` : "—"}
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
    </AdminLayout>
  );
}
