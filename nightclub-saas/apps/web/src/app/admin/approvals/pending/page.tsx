"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PendingItem = {
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

type Pagination = { page: number; limit: number; total: number };

type ModalState =
  | { kind: "approve"; item: PendingItem }
  | { kind: "reject"; item: PendingItem }
  | null;

type Toast = { id: number; message: string; ok: boolean };

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, ok: boolean) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, ok }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);
  return { toasts, push };
}

export default function PendingApprovalsPage() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<"Admin" | "SystemAdmin">("Admin");
  const [items, setItems] = useState<PendingItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toasts, push } = useToast();

  // Filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchData = useCallback(async (p = page) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterTenantId && role === "SystemAdmin") params.set("tenantId", filterTenantId);

      const res = await fetch(`${API_URL}/admin/approvals/pending?${params}`, {
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
  }, [token, filterFrom, filterTo, filterTenantId, role, page, limit]);

  const handleApprove = async () => {
    if (!modal || modal.kind !== "approve") return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/reports/close/monthly/unlock/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: modal.item.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Approve failed");
      push("月次ロック解除を承認しました", true);
      setModal(null);
      setConfirmed(false);
      fetchData(page);
    } catch (err: any) {
      push(err.message, false);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!modal || modal.kind !== "reject") return;
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/reports/close/monthly/unlock/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: modal.item.id, reason: rejectReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Reject failed");
      push("申請を却下しました", true);
      setModal(null);
      setConfirmed(false);
      setRejectReason("");
      fetchData(page);
    } catch (err: any) {
      push(err.message, false);
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (kind: "approve" | "reject", item: PendingItem) => {
    setModal({ kind, item } as ModalState);
    setConfirmed(false);
    setRejectReason("");
  };

  const totalPages = Math.ceil(pagination.total / limit);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm font-medium shadow-lg border ${
              t.ok
                ? "bg-green-900/90 border-green-700 text-green-200"
                : "bg-red-900/90 border-red-700 text-red-200"
            }`}
          >
            {t.ok ? "✓ " : "✗ "}{t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">承認待ち</h1>
        <p className="text-sm text-gray-400 mt-1">
          月次ロック解除申請など、対応が必要な承認アイテムを表示します。
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
          {role === "SystemAdmin" && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">テナントID</label>
              <input
                type="text"
                placeholder="uuid..."
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
                className="bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 w-48"
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
            <div className="text-3xl mb-2">✓</div>
            <p className="text-sm">承認待ちのアイテムはありません</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">タイプ</th>
                <th className="px-4 py-3 text-left font-medium">対象月</th>
                <th className="px-4 py-3 text-left font-medium">テナント</th>
                <th className="px-4 py-3 text-left font-medium">申請者</th>
                <th className="px-4 py-3 text-left font-medium">理由</th>
                <th className="px-4 py-3 text-left font-medium">申請日時</th>
                <th className="px-4 py-3 text-center font-medium">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-purple-500/15 text-purple-300 text-xs font-semibold px-2 py-0.5 rounded">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-300 font-medium">{item.month}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]">
                    {item.tenantId}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[120px]">
                    {item.requesterId}
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-[200px]">
                    <span className="truncate block" title={item.reason}>{item.reason}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openModal("approve", item)}
                        className="bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-700/40 px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => openModal("reject", item)}
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-700/40 px-3 py-1 rounded text-xs font-medium transition-colors"
                      >
                        却下
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1220] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {modal.kind === "approve" ? (
              <>
                <h2 className="text-lg font-bold text-white mb-1">月次ロック解除を承認</h2>
                <p className="text-sm text-gray-400 mb-4">
                  この操作は取り消せません。4-eyes 承認ルールに従い、申請者とは別の担当者が承認してください。
                </p>
                <div className="bg-[#0A0E17] rounded-lg p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">対象月</span>
                    <span className="text-blue-300 font-mono font-semibold">{modal.item.month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">申請者</span>
                    <span className="text-gray-300 font-mono text-xs">{modal.item.requesterId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">理由</span>
                    <span className="text-gray-300 text-right max-w-[200px]">{modal.item.reason}</span>
                  </div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 mb-4">
                  <p className="text-yellow-300 text-xs font-medium">
                    ⚠️ 月次確定済みデータのロックが解除されます。財務データの変更が可能になります。
                  </p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer mb-5">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">
                    内容を確認し、承認することに同意します
                  </span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setModal(null); setConfirmed(false); }}
                    disabled={processing}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 text-sm transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={!confirmed || processing}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  >
                    {processing ? "処理中..." : "承認する"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">申請を却下</h2>
                <p className="text-sm text-gray-400 mb-4">
                  却下理由を入力してください（10文字以上）。
                </p>
                <div className="bg-[#0A0E17] rounded-lg p-4 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">対象月</span>
                    <span className="text-blue-300 font-mono font-semibold">{modal.item.month}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">申請理由</span>
                    <span className="text-gray-300 text-right max-w-[200px]">{modal.item.reason}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-gray-400 mb-1">却下理由 *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="却下理由を10文字以上で入力してください..."
                    className="w-full bg-[#0A0E17] border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-600 mt-1">{rejectReason.length} / 10文字以上必要</p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer mb-5">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">内容を確認し、却下することに同意します</span>
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setModal(null); setConfirmed(false); setRejectReason(""); }}
                    disabled={processing}
                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 text-sm transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!confirmed || rejectReason.length < 10 || processing}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  >
                    {processing ? "処理中..." : "却下する"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
