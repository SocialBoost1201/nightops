'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { FileClock, Filter, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UnlockRequestStatusBadge } from '@/components/approvals/UnlockRequestStatusBadge';
import {
  fetchUnlockRequests,
  formatDateTime,
  type UnlockRequestItem,
  type UnlockRequestsQuery,
  type UnlockRequestStatus,
} from '@/lib/approvalWorkflow';
import { buildAuditLogHref, getUnlockAuditAction } from '@/lib/auditNavigation';

const DEFAULT_LIMIT = 20;
const LIMIT_OPTIONS = [20, 50, 100] as const;

export default function UnlockRequestHistoryPage() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SystemAdmin';

  const [status, setStatus] = useState<'' | UnlockRequestStatus>('');
  const [month, setMonth] = useState('');
  const [requesterId, setRequesterId] = useState('');
  const [approverId, setApproverId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const query = useMemo<UnlockRequestsQuery>(() => ({
    status: status || undefined,
    month: month || undefined,
    requesterId: requesterId || undefined,
    approverId: approverId || undefined,
    from: from || undefined,
    to: to || undefined,
    tenantId: isSystemAdmin ? (tenantId || undefined) : undefined,
    page,
    limit,
  }), [approverId, from, isSystemAdmin, limit, month, page, requesterId, status, tenantId, to]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['unlock-requests', query],
    async ([, currentQuery]: [string, UnlockRequestsQuery]) => fetchUnlockRequests(currentQuery),
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

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <FileClock className="text-gold-500" size={28} />
          アンロック申請履歴
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          月次アンロック申請の履歴を検索し、承認/却下のオペレーション履歴を確認します。
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 bg-[#222] flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mr-1">
            <Filter size={14} />
            Filters
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(event) => onFilterChange(setStatus, event.target.value as '' | UnlockRequestStatus)}
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            >
              <option value="">ALL</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(event) => onFilterChange(setMonth, event.target.value)}
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Requester</label>
            <input
              type="text"
              value={requesterId}
              onChange={(event) => onFilterChange(setRequesterId, event.target.value)}
              placeholder="requester-id"
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Approver</label>
            <input
              type="text"
              value={approverId}
              onChange={(event) => onFilterChange(setApproverId, event.target.value)}
              placeholder="approver-id"
              className="bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
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
            type="button"
            onClick={() => mutate()}
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
            <p className="text-red-300 text-sm font-medium">履歴一覧の取得に失敗しました</p>
            <button
              type="button"
              onClick={() => mutate()}
              className="mt-4 px-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-200 hover:border-gold-500 transition-colors"
            >
              再試行
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            条件に一致する申請履歴はありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#2A2A2A] text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Month</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Status</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Requester</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Approver</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Rejector</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Reason</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Created At</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Approved At</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Rejected At</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">Correlation</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((item: UnlockRequestItem) => (
                  <tr key={item.id} className="hover:bg-[#222] transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-300">{item.month}</td>
                    <td className="px-6 py-4">
                      <UnlockRequestStatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.requesterId}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.approverId ?? '-'}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">{item.rejectorId ?? '-'}</td>
                    <td className="px-6 py-4 max-w-[320px] truncate text-gray-300" title={item.reason}>{item.reason}</td>
                    <td className="px-6 py-4 text-gray-400">{formatDateTime(item.createdAt)}</td>
                    <td className="px-6 py-4 text-gray-400">{formatDateTime(item.approvedAt)}</td>
                    <td className="px-6 py-4 text-gray-400">{formatDateTime(item.rejectedAt)}</td>
                    <td className="px-6 py-4 max-w-[220px]">
                      <span className="font-mono text-[11px] text-gray-500 truncate block" title={item.correlationId ?? '-'}>
                        {item.correlationId ?? '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={buildAuditLogHref({
                          requestId: item.id,
                          correlationId: item.correlationId,
                          action: getUnlockAuditAction(item.status),
                          source: 'unlock-request-history',
                        })}
                        className="text-[11px] text-sky-300 hover:text-sky-200 underline underline-offset-2"
                      >
                        監査ログを見る
                      </Link>
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
    </div>
  );
}
