'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { ScrollText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AuditLogFilterBar,
  AuditLogTable,
  AuditLogDetailPanel,
  type AuditLogFilterValues,
} from '@/components/audit';
import {
  fetchAuditLogs,
  type AuditLogItem,
  type AuditLogQuery,
} from '@/lib/auditWorkflow';
import {
  buildAuditLogPageHref,
  createEmptyAuditLogFilterValues,
  DEFAULT_AUDIT_LOG_LIMIT,
  getTraceabilityHelperText,
  hasLinkedAuditContext,
  parseAuditLogSearchParams,
} from '@/lib/auditNavigation';

const DEFAULT_LIMIT = DEFAULT_AUDIT_LOG_LIMIT;

export default function AuditLogsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'SystemAdmin';

  const initialUrlState = useMemo(
    () => parseAuditLogSearchParams(searchParams),
    [searchParams],
  );

  const [filters, setFilters] = useState<AuditLogFilterValues>(initialUrlState.filters);
  const [page, setPage] = useState(initialUrlState.page);
  const [limit, setLimit] = useState(initialUrlState.limit);
  const [sourceContext, setSourceContext] = useState(initialUrlState.source);
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

  const desiredHref = useMemo(
    () => buildAuditLogPageHref({
      filters,
      page,
      limit,
      source: sourceContext,
      isSystemAdmin,
    }),
    [filters, isSystemAdmin, limit, page, sourceContext],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['audit-logs', query],
    async ([, currentQuery]: [string, AuditLogQuery]) => fetchAuditLogs(currentQuery),
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, limit, total: 0 };
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;
  const linkedHelperText = getTraceabilityHelperText(sourceContext, filters);

  const handleFilterChange = (key: keyof AuditLogFilterValues, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(createEmptyAuditLogFilterValues());
    setPage(1);
    setLimit(DEFAULT_LIMIT);
    setSourceContext('');
    setSelectedItem(null);
  };

  useEffect(() => {
    const nextUrlState = parseAuditLogSearchParams(searchParams);

    setFilters((current) => {
      const currentSerialized = JSON.stringify(current);
      const nextSerialized = JSON.stringify(nextUrlState.filters);
      return currentSerialized === nextSerialized ? current : nextUrlState.filters;
    });
    setPage((current) => (current === nextUrlState.page ? current : nextUrlState.page));
    setLimit((current) => (current === nextUrlState.limit ? current : nextUrlState.limit));
    setSourceContext((current) => (current === nextUrlState.source ? current : nextUrlState.source));
  }, [searchParams]);

  useEffect(() => {
    const currentQueryString = searchParams.toString();
    const nextQueryString = desiredHref.replace(`${pathname}?`, '').replace(pathname, '');

    if (currentQueryString === nextQueryString) {
      return;
    }

    router.replace(desiredHref, { scroll: false });
  }, [desiredHref, pathname, router, searchParams]);

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

      {hasLinkedAuditContext(filters) && linkedHelperText && (
        <div className="mb-4 rounded-xl border border-sky-800/50 bg-sky-950/30 px-4 py-3">
          <p className="text-sm text-sky-200">{linkedHelperText}</p>
          <p className="text-[11px] text-sky-300/70 mt-1">
            Reset filters で全件表示に戻せます。
          </p>
        </div>
      )}

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
