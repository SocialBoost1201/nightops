'use client';

import { Loader2, SearchX, ShieldAlert } from 'lucide-react';
import { AuditActionBadge } from '@/components/audit/AuditActionBadge';
import { buildAuditSummary, formatDateTime, type AuditLogItem } from '@/lib/auditWorkflow';

interface AuditLogTableProps {
  items: AuditLogItem[];
  isLoading: boolean;
  isError: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  canPrev: boolean;
  canNext: boolean;
  onRetry: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenDetail: (item: AuditLogItem) => void;
}

export function AuditLogTable({
  items,
  isLoading,
  isError,
  pagination,
  canPrev,
  canNext,
  onRetry,
  onPrevPage,
  onNextPage,
  onOpenDetail,
}: AuditLogTableProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 size={24} className="animate-spin mr-2" />
          読み込み中...
        </div>
      ) : isError ? (
        <div className="p-8 text-center">
          <ShieldAlert className="text-red-400 mx-auto mb-3" size={28} />
          <p className="text-red-300 text-sm font-medium">監査ログの取得に失敗しました</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 px-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-200 hover:border-gold-500 transition-colors"
          >
            再試行
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-sm">
          <SearchX className="mx-auto mb-3" size={22} />
          条件に一致する監査ログはありません。
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#2A2A2A] text-gray-400">
              <tr>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Created At</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Action</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Tenant</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Actor</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Resource Type</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Resource ID</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Correlation ID</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Request ID</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700">Summary</th>
                <th className="px-4 py-4 font-medium border-b border-gray-700 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-[#222] transition-colors cursor-pointer"
                  onClick={() => onOpenDetail(item)}
                >
                  <td className="px-4 py-4 text-gray-400">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-4">
                    <AuditActionBadge action={item.action} />
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-400">{item.tenantId}</td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <p className="font-mono text-xs text-gray-300 truncate" title={item.actorId}>{item.actorId}</p>
                    <p className="text-[11px] text-gray-500 truncate" title={item.actorRole}>{item.actorRole}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-300">{item.resourceType || '-'}</td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-400">{item.resourceId || '-'}</td>
                  <td className="px-4 py-4 max-w-[200px]">
                    <span className="font-mono text-[11px] text-gray-400 truncate block" title={item.correlationId ?? '-'}>
                      {item.correlationId ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 max-w-[160px]">
                    <span className="font-mono text-[11px] text-gray-400 truncate block" title={item.requestId ?? '-'}>
                      {item.requestId ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 max-w-[360px]">
                    <p className="text-gray-300 truncate" title={buildAuditSummary(item)}>
                      {buildAuditSummary(item)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenDetail(item);
                      }}
                      className="px-3 py-1.5 bg-[#111] border border-gray-700 rounded text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t border-gray-800 bg-[#222] flex flex-wrap gap-3 items-center justify-between text-xs text-gray-500">
        <span>Total: {pagination.total} items</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={onPrevPage}
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
            onClick={onNextPage}
            className="px-3 py-1.5 bg-[#111] border border-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed text-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
