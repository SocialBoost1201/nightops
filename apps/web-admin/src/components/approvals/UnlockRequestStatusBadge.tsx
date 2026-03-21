'use client';

import { formatUnlockRequestStatus, type UnlockRequestStatus } from '@/lib/approvalWorkflow';

interface UnlockRequestStatusBadgeProps {
  status: UnlockRequestStatus;
}

export function UnlockRequestStatusBadge({ status }: UnlockRequestStatusBadgeProps) {
  const toneClassName = status === 'APPROVED'
    ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40'
    : status === 'REJECTED'
      ? 'bg-red-900/30 text-red-300 border-red-700/40'
      : 'bg-amber-900/30 text-amber-300 border-amber-700/40';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold tracking-wide ${toneClassName}`}>
      {formatUnlockRequestStatus(status)}
    </span>
  );
}
