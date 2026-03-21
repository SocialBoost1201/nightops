'use client';

import { useMemo } from 'react';
import { Copy, FileSearch2, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { AuditActionBadge } from '@/components/audit/AuditActionBadge';
import { JsonSnapshotViewer } from '@/components/audit/JsonSnapshotViewer';
import {
  buildAuditSummary,
  formatDateTime,
  getAuditMetaFromAfterData,
  type AuditLogItem,
} from '@/lib/auditWorkflow';

interface AuditLogDetailPanelProps {
  item: AuditLogItem | null;
  onClose: () => void;
}

function CopyValueButton({
  value,
  label,
  onCopy,
}: {
  value: string | null;
  label: string;
  onCopy: (value: string | null, label: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => onCopy(value, label)}
      className="px-2.5 py-1 text-xs bg-[#111] border border-gray-700 rounded text-gray-300 hover:text-white hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
    >
      <Copy size={12} />
      Copy
    </button>
  );
}

export function AuditLogDetailPanel({ item, onClose }: AuditLogDetailPanelProps) {
  const { success, warning, error } = useToast();

  const auditMeta = useMemo(() => getAuditMetaFromAfterData(item?.afterData), [item]);

  if (!item) {
    return null;
  }

  const handleCopy = async (value: string | null, label: string) => {
    if (!value) {
      warning(`${label} がありません。`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      success(`${label} をコピーしました。`);
    } catch {
      error(`${label} のコピーに失敗しました。`);
    }
  };

  const summary = buildAuditSummary(item);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="h-full w-full flex justify-end">
        <div className="h-full w-full max-w-4xl bg-[#1A1A1A] border-l border-gray-800 shadow-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch2 size={18} className="text-gold-500" />
              <h2 className="text-lg font-semibold text-gray-100">監査ログ詳細</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-200 transition-colors"
              aria-label="Close detail panel"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Correlation ID</p>
                <p className="font-mono text-xs text-gray-200 break-all mb-2">{item.correlationId ?? '-'}</p>
                <CopyValueButton value={item.correlationId} label="Correlation ID" onCopy={handleCopy} />
              </div>
              <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Request ID</p>
                <p className="font-mono text-xs text-gray-200 break-all mb-2">{item.requestId ?? '-'}</p>
                <CopyValueButton value={item.requestId} label="Request ID" onCopy={handleCopy} />
              </div>
            </div>

            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm text-gray-400">Summary</p>
                <AuditActionBadge action={item.action} />
              </div>
              <p className="text-gray-200 text-sm">{summary}</p>
            </div>

            <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created At</p>
                  <p className="text-gray-200">{formatDateTime(item.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Action</p>
                  <p className="font-mono text-xs text-gray-300 break-all">{item.action}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tenant</p>
                  <p className="font-mono text-xs text-gray-300">{item.tenantId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Actor</p>
                  <p className="font-mono text-xs text-gray-300">{item.actorId}</p>
                  <p className="text-[11px] text-gray-500 mt-1">Role: {item.actorRole}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Resource Type</p>
                  <p className="font-mono text-xs text-gray-300">{item.resourceType || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Resource ID</p>
                  <p className="font-mono text-xs text-gray-300 break-all">{item.resourceId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">IP Address</p>
                  <p className="font-mono text-xs text-gray-300">{item.ipAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">User Agent</p>
                  <p className="text-xs text-gray-300 break-all">{item.userAgent || '-'}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-1">Reason</p>
                <p className="text-sm text-gray-300 break-words">{item.reason || '-'}</p>
              </div>
            </div>

            <JsonSnapshotViewer title="Before Snapshot" data={item.beforeData} defaultExpanded={false} />
            <JsonSnapshotViewer title="After Snapshot" data={item.afterData} defaultExpanded={true} />

            {auditMeta !== null && (
              <JsonSnapshotViewer title="afterData.__audit" data={auditMeta} defaultExpanded={true} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
