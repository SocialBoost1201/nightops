'use client';

interface AuditActionBadgeProps {
  action: string;
}

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  const normalized = action.toUpperCase();

  const toneClassName = normalized.includes('REJECT') || normalized.includes('DELETE')
    ? 'bg-red-900/30 text-red-300 border-red-700/40'
    : normalized.includes('APPROVE') || normalized.includes('COMPLETE') || normalized.includes('CREATE')
      ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40'
      : normalized.includes('UNLOCK') || normalized.includes('REQUEST')
        ? 'bg-amber-900/30 text-amber-300 border-amber-700/40'
        : 'bg-slate-900/30 text-slate-300 border-slate-700/40';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded border text-[11px] font-semibold tracking-wide font-mono ${toneClassName}`}>
      {action}
    </span>
  );
}
