'use client';

import { Filter, RefreshCw, RotateCcw } from 'lucide-react';

export interface AuditLogFilterValues {
  from: string;
  to: string;
  action: string;
  actorId: string;
  tenantId: string;
  requestId: string;
  correlationId: string;
  resourceType: string;
  resourceId: string;
}

interface AuditLogFilterBarProps {
  values: AuditLogFilterValues;
  isSystemAdmin: boolean;
  limit: number;
  isRefreshing: boolean;
  onFilterChange: (key: keyof AuditLogFilterValues, value: string) => void;
  onLimitChange: (value: number) => void;
  onReset: () => void;
  onRefresh: () => void;
}

const LIMIT_OPTIONS = [20, 50, 100] as const;

function baseInputClassName(widthClassName: string): string {
  return `${widthClassName} bg-[#111] border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-gold-500`;
}

export function AuditLogFilterBar({
  values,
  isSystemAdmin,
  limit,
  isRefreshing,
  onFilterChange,
  onLimitChange,
  onReset,
  onRefresh,
}: AuditLogFilterBarProps) {
  return (
    <div className="p-4 border-b border-gray-800 bg-[#222] flex flex-wrap gap-3 items-end">
      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mr-1">
        <Filter size={14} />
        Filters
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">From</label>
        <input
          type="datetime-local"
          value={values.from}
          onChange={(event) => onFilterChange('from', event.target.value)}
          className={baseInputClassName('w-52')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">To</label>
        <input
          type="datetime-local"
          value={values.to}
          onChange={(event) => onFilterChange('to', event.target.value)}
          className={baseInputClassName('w-52')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Action</label>
        <input
          type="text"
          value={values.action}
          onChange={(event) => onFilterChange('action', event.target.value.toUpperCase())}
          placeholder="APPROVE_MONTHLY_UNLOCK"
          className={baseInputClassName('w-56')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Actor ID</label>
        <input
          type="text"
          value={values.actorId}
          onChange={(event) => onFilterChange('actorId', event.target.value)}
          placeholder="admin-001"
          className={baseInputClassName('w-40')}
        />
      </div>

      {isSystemAdmin && (
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Tenant ID</label>
          <input
            type="text"
            value={values.tenantId}
            onChange={(event) => onFilterChange('tenantId', event.target.value)}
            placeholder="tenant-aaa"
            className={baseInputClassName('w-40')}
          />
        </div>
      )}

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Request ID</label>
        <input
          type="text"
          value={values.requestId}
          onChange={(event) => onFilterChange('requestId', event.target.value)}
          placeholder="req-123"
          className={baseInputClassName('w-40')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Correlation ID</label>
        <input
          type="text"
          value={values.correlationId}
          onChange={(event) => onFilterChange('correlationId', event.target.value)}
          placeholder="corr-123"
          className={baseInputClassName('w-44')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Resource Type</label>
        <input
          type="text"
          value={values.resourceType}
          onChange={(event) => onFilterChange('resourceType', event.target.value)}
          placeholder="MonthlyClose"
          className={baseInputClassName('w-40')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Resource ID</label>
        <input
          type="text"
          value={values.resourceId}
          onChange={(event) => onFilterChange('resourceId', event.target.value)}
          placeholder="close-001"
          className={baseInputClassName('w-40')}
        />
      </div>

      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Limit</label>
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className={baseInputClassName('w-24')}
        >
          {LIMIT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 hover:text-white hover:border-gray-600 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </div>
  );
}
