'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { formatDateTime, type PendingApprovalItem } from '@/lib/approvalWorkflow';

type ApprovalActionMode = 'approve' | 'reject';

interface ApprovalActionDialogProps {
  mode: ApprovalActionMode;
  item: PendingApprovalItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ApprovalActionDialog({
  mode,
  item,
  isSubmitting,
  onClose,
  onConfirm,
}: ApprovalActionDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!item) {
      setIsConfirmed(false);
    }
  }, [item, mode]);

  if (!item) {
    return null;
  }

  const isApprove = mode === 'approve';
  const title = isApprove ? '承認の最終確認' : '却下の最終確認';
  const confirmLabel = isApprove ? '承認を実行する' : '却下を実行する';
  const warningLabel = isApprove
    ? '承認すると対象月のロック状態が解除され、財務ガバナンスに影響します。'
    : '却下すると申請は差し戻され、月次アンロックは実行されません。';

  const checkboxLabel = isApprove
    ? '財務ガバナンスへの影響を理解し、承認を実行します'
    : '申請内容を確認し、却下を実行します';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-xl bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <ShieldAlert size={18} className="text-red-400" />
            )}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-200 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
            isApprove
              ? 'border-amber-700/50 bg-amber-900/15 text-amber-200'
              : 'border-red-700/50 bg-red-900/15 text-red-200'
          }`}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{warningLabel}</p>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Request ID</p>
                <p className="font-mono text-gray-200 text-xs">{item.id}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Month</p>
                <p className="font-mono text-gray-200">{item.month}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Tenant</p>
                <p className="font-mono text-gray-300 text-xs">{item.tenantId}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Requester</p>
                <p className="font-mono text-gray-300 text-xs">{item.requesterId}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500 text-xs mb-1">Reason</p>
                <p className="text-gray-200 text-sm break-words">{item.reason}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Created At</p>
                <p className="text-gray-300">{formatDateTime(item.createdAt)}</p>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(event) => setIsConfirmed(event.target.checked)}
              className="mt-0.5"
            />
            <span>{checkboxLabel}</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-gray-800 bg-[#171717] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded border border-gray-700 text-gray-300 text-sm hover:border-gray-500 transition-colors disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={isSubmitting || !isConfirmed}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900/40'
                : 'bg-red-600 hover:bg-red-500 text-white disabled:bg-red-900/40'
            } disabled:cursor-not-allowed`}
          >
            {isSubmitting ? '処理中...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
