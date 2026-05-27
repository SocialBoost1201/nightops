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
  type PendingApprovalItem,
  type ApiListResponse,
} from "@/lib/admin-api";
import { clsx } from "clsx";

const API_APPROVE = "/reports/close/monthly/unlock/approve";
const API_REJECT = "/reports/close/monthly/unlock/reject";

type ModalState =
  | { type: "approve"; item: PendingApprovalItem }
  | { type: "reject"; item: PendingApprovalItem }
  | null;

export default function PendingApprovalsPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  // Modal
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(
    async (p = page) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const q = buildQuery({ type: "MONTHLY_UNLOCK", from, to, page: p, limit });
        const res = await apiFetch<ApiListResponse<PendingApprovalItem>>(
          `/admin/approvals/pending${q}`,
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
    [token, from, to, page, limit]
  );

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchData(p);
  };

  const openModal = (type: "approve" | "reject", item: PendingApprovalItem) => {
    setModal({ type, item });
    setConfirmed(false);
    setActionError(null);
  };

  const closeModal = () => {
    if (actionLoading) return;
    setModal(null);
    setConfirmed(false);
    setActionError(null);
  };

  const handleAction = async () => {
    if (!modal || !confirmed) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (modal.type === "approve") {
        await apiFetch(API_APPROVE, token, {
          method: "POST",
          body: JSON.stringify({ requestId: modal.item.id }),
        });
        showToast(`${modal.item.month} のアンロックを承認しました`, true);
      } else {
        await apiFetch(API_REJECT, token, {
          method: "POST",
          body: JSON.stringify({ requestId: modal.item.id, reason: modal.item.reason }),
        });
        showToast(`${modal.item.month} のアンロックを却下しました`, false);
      }
      closeModal();
      fetchData(page);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "操作に失敗しました");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">承認待ち</h1>
          <p className="text-sm text-gray-500 mt-1">
            月次アンロック申請の承認・却下を行います。承認者は申請者と異なるユーザーである必要があります。
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
              onClick={() => { setFrom(""); setTo(""); setLimit(20); setPage(1); }}
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
            <StatePanel state="empty" message="承認待ちの申請はありません" />
          ) : items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-medium">種別</th>
                      <th className="px-4 py-3 text-left font-medium">月</th>
                      <th className="px-4 py-3 text-left font-medium">テナント</th>
                      <th className="px-4 py-3 text-left font-medium">申請者</th>
                      <th className="px-4 py-3 text-left font-medium">理由</th>
                      <th className="px-4 py-3 text-left font-medium">申請日時</th>
                      <th className="px-4 py-3 text-center font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={clsx("text-xs px-2 py-0.5 rounded font-medium", STATUS_COLORS.PENDING)}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-blue-400 font-medium">{item.month}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]" title={item.tenantId}>
                          …{item.tenantId.slice(-8)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]" title={item.requesterId}>
                          …{item.requesterId.slice(-8)}
                        </td>
                        <td className="px-4 py-3 text-gray-300 max-w-[200px]">
                          <span className="truncate block" title={item.reason}>{item.reason}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(item.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openModal("approve", item)}
                              className="px-3 py-1 text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:bg-green-600/30 transition-colors"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => openModal("reject", item)}
                              className="px-3 py-1 text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 transition-colors"
                            >
                              却下
                            </button>
                          </div>
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

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-700 rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-1">
                {modal.type === "approve" ? "月次アンロックを承認" : "月次アンロックを却下"}
              </h2>
              <p className="text-sm text-gray-400 mb-5">
                {modal.type === "approve"
                  ? "この操作は月次確定を解除します。4-eyes承認フローが適用されます。"
                  : "申請を却下します。月次確定は維持されます。"}
              </p>

              {/* Request details */}
              <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">対象月</span>
                  <span className="text-blue-400 font-mono font-medium">{modal.item.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">申請者ID</span>
                  <span className="text-gray-300 font-mono text-xs">…{modal.item.requesterId.slice(-12)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500">申請理由</span>
                  <span className="text-gray-200 text-xs leading-relaxed">{modal.item.reason}</span>
                </div>
              </div>

              {modal.type === "approve" && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-5">
                  <p className="text-yellow-400 text-xs leading-relaxed">
                    ⚠️ この操作は財務データに影響します。承認後、月次確定が解除され売上データの修正が可能になります。
                  </p>
                </div>
              )}

              {actionError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-xs">{actionError}</p>
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 accent-blue-500"
                />
                <span className="text-sm text-gray-300">
                  内容を確認し、この操作を実行することに同意します
                </span>
              </label>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeModal}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg transition-colors disabled:opacity-40"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAction}
                  disabled={!confirmed || actionLoading}
                  className={clsx(
                    "px-5 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    modal.type === "approve"
                      ? "bg-green-600 hover:bg-green-500 text-white"
                      : "bg-red-600 hover:bg-red-500 text-white"
                  )}
                >
                  {actionLoading
                    ? "処理中…"
                    : modal.type === "approve"
                    ? "承認する"
                    : "却下する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all",
            toast.ok
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-200 border border-gray-700"
          )}
        >
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  );
}
