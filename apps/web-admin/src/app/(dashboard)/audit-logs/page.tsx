'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ScrollText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AuditLogFilterBar,
  type AuditLogFilterValues,
} from '@/components/audit/AuditLogFilterBar';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { AuditLogDetailPanel } from '@/components/audit/AuditLogDetailPanel';
import {
  fetchAuditLogs,
  type AuditLogItem,
  type AuditLogQuery,
} from '@/lib/auditWorkflow';

const DEFAULT_LIMIT = 20;
const INITIAL_FILTERS: AuditLogFilterValues = {
  from: '',
  to: '',
  action: '',
  actorId: '',
  tenantId: '',
  requestId: '',
  correlationId: '',
  resourceType: '',
  resourceId: '',
};

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SystemAdmin';

  const [filters, setFilters] = useState<AuditLogFilterValues>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

  const query = useMemo<AuditLogQuery>(() => ({
    from: filters.from || undefined,
    to: filters.to || undefined,
    action: filters.action || undefined,
    actorId: filters.actorId || undefined,
    tenantId: isSystemAdmin ? (filters.tenantId || undefined) : undefined,
    requestId: filters.requestId || undefined,
    correlationId: filters.correlationId || undefined,
    resourceType: filters.resourceType || undefined,
    resourceId: filters.resourceId || undefined,
    page,
    limit,
  }), [filters, isSystemAdmin, limit, page]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['audit-logs', query],
    async ([, currentQuery]: [string, AuditLogQuery]) => fetchAuditLogs(currentQuery),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, limit, total: 0 };
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;

  const handleFilterChange = (key: keyof AuditLogFilterValues, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setPage(1);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ScrollText className="text-gold-500" size={28} />
          監査ログ
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          監査イベントを検索し、相関IDやリクエストIDを軸にインシデントと財務操作を調査します。
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <AuditLogFilterBar
          values={filters}
          isSystemAdmin={isSystemAdmin}
          limit={limit}
          isRefreshing={isValidating}
          onFilterChange={handleFilterChange}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
          onReset={handleResetFilters}
          onRefresh={() => {
            mutate();
          }}
        />

        <AuditLogTable
          items={items}
          isLoading={isLoading}
          isError={Boolean(error)}
          pagination={pagination}
          canPrev={canPrev}
          canNext={canNext}
          onRetry={() => mutate()}
          onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
          onOpenDetail={(item) => setSelectedItem(item)}
        />
      </div>

      <AuditLogDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
