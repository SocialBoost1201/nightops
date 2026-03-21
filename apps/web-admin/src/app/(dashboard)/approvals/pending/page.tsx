'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ClipboardList, Filter, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { ApprovalActionDialog } from '@/components/approvals/ApprovalActionDialog';
import {
  approveUnlockRequest,
  extractApiErrorMessage,
  fetchPendingApprovals,
  formatApprovalType,
  formatDateTime,
  rejectUnlockRequest,
  type ApprovalType,
  type PendingApprovalsQuery,
  type PendingApprovalItem,
} from '@/lib/approvalWorkflow';
import { buildAuditLogHref } from '@/lib/auditNavigation';

const DEFAULT_LIMIT = 20;
const LIMIT_OPTIONS = [20, 50, 100] as const;

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const isSystemAdmin = user?.role === 'SystemAdmin';
  const [type, setType] = useState<ApprovalType>('MONTHLY_UNLOCK');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogState, setDialogState] = useState<{
    mode: 'approve' | 'reject';
    item: PendingApprovalItem;
  } | null>(null);

  const query = useMemo<PendingApprovalsQuery>(() => ({
    type,
    from: from || undefined,
    to: to || undefined,
    tenantId: isSystemAdmin ? (tenantId || undefined) : undefined,
    page,
    limit,
  }), [from, isSystemAdmin, limit, page, tenantId, to, type]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['pending-approvals', query],
    async ([, currentQuery]: [string, PendingApprovalsQuery]) => fetchPendingApprovals(currentQuery),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, limit, total: 0 };
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;

  const onFilterChange = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  const handleActionConfirm = async () => {
    if (!dialogState) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (dialogState.mode === 'approve') {
        await approveUnlockRequest({ requestId: dialogState.item.id });
        success('アンロック申請を承認しました。');
      } else {
        await rejectUnlockRequest({
          requestId: dialogState.item.id,
          reason: dialogState.item.reason || 'Rejected by management UI',
        });
        success('アンロック申請を却下しました。');
      }
      setDialogState(null);
      await mutate();
    } catch (actionError) {
      showError(extractApiErrorMessage(actionError, '申請の処理に失敗しました。'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ClipboardList className="text-gold-500" size={28} />
          承認待ち一覧
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          月次アンロック申請の承認待ちアイテムを確認し、対応状況を管理します。
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 bg-[#222] flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mr-1">
            <Filter size={14} />
            Filters
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Type</label>
            <select
              value={type}
              onChange={(event) => onFilterChange(setType, event.target.value as ApprovalType)}
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            >
              <option value="MONTHLY_UNLOCK">MONTHLY_UNLOCK</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(event) => onFilterChange(setFrom, event.target.value)}
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(event) => onFilterChange(setTo, event.target.value)}
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
          </div>

          {isSystemAdmin && (
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Tenant</label>
              <input
                type="text"
                value={tenantId}
                onChange={(event) => onFilterChange(setTenantId, event.target.value)}
                placeholder="tenant-id"
                className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Limit</label>
            <select
              value={limit}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                setLimit(nextLimit);
                setPage(1);
              }}
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => mutate()}
            type="button"
            className="ml-auto px-3 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 size={24} className="animate-spin mr-2" />
            読み込み中...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <ShieldAlert className="text-red-400 mx-auto mb-3" size={28} />
            <p className="text-red-300 text-sm font-medium">承認待ち一覧の取得に失敗しました</p>
            <button
              onClick={() => mutate()}
              type="button"
              className="mt-4 px-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-200 hover:border-gold-500 transition-colors"
            >
              再試行
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            現在、承認待ちの申請はありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#2A2A2A] text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Type</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Month</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Tenant</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Requester</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Reason</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Created At</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((item: PendingApprovalItem) => (
                  <tr key={item.id} className="hover:bg-[#222] transition-colors">
                    <td className="px-6 py-4 text-gray-200">{formatApprovalType(item.type)}</td>
                    <td className="px-6 py-4 font-mono text-gray-300">{item.month}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.tenantId}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.requesterId}</td>
                    <td className="px-6 py-4 max-w-[360px]">
                      <p className="text-gray-300 truncate" title={item.reason}>
                        {item.reason}
                      </p>
                      {item.correlationId && (
                        <p className="text-[11px] text-gray-500 mt-1 font-mono truncate" title={item.correlationId}>
                          corr: {item.correlationId}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatDateTime(item.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-2">
                          {item.requesterId === user?.accountId ? (
                            <span className="text-[11px] text-amber-500 bg-amber-900/20 border border-amber-700/40 rounded px-2 py-1">
                              自分の申請は処理不可
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setDialogState({ mode: 'approve', item })}
                                className="px-3 py-1.5 rounded border border-emerald-700/60 bg-emerald-900/20 text-emerald-300 text-xs hover:bg-emerald-900/30 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setDialogState({ mode: 'reject', item })}
                                className="px-3 py-1.5 rounded border border-red-700/60 bg-red-900/20 text-red-300 text-xs hover:bg-red-900/30 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                        <Link
                          href={buildAuditLogHref({
                            requestId: item.id,
                            correlationId: item.correlationId,
                            action: 'REQUEST_MONTHLY_UNLOCK',
                            source: 'pending-approvals',
                          })}
                          className="text-[11px] text-sky-300 hover:text-sky-200 underline underline-offset-2"
                        >
                          監査ログを見る
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-gray-800 bg-[#222] flex flex-wrap gap-3 items-center justify-between text-xs text-gray-500">
          <span>
            Total: {pagination.total} items
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="px-3 py-1.5 bg-[#111] border border-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed text-gray-300"
            >
              Prev
            </button>
            <span>
              Page {pagination.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setPage((current) => current + 1)}
              className="px-3 py-1.5 bg-[#111] border border-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ApprovalActionDialog
        mode={dialogState?.mode ?? 'approve'}
        item={dialogState?.item ?? null}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) {
            setDialogState(null);
          }
        }}
        onConfirm={handleActionConfirm}
      />
    </div>
  );
}
