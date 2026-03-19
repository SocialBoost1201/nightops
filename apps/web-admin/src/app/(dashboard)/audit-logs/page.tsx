'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { ScrollText, Search, Calendar as CalendarIcon, Filter, Loader2 } from 'lucide-react';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  actionType: string;
  targetType: string;
  targetId: string;
  beforeData: any;
  afterData: any;
  reason: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (actionFilter) params.set('actionType', actionFilter);
  if (dateFilter) params.set('date', dateFilter);
  const queryStr = params.toString();

  const { data: logs, isLoading } = useSWR<AuditLog[]>(
    `/audit-logs${queryStr ? `?${queryStr}` : ''}`,
    fetcher
  );

  const handleSearch = () => {
    // SWR will automatically refetch when the key changes
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ScrollText className="text-gold-500" size={28} />
          監査ログ (操作履歴)
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          システム内で行われたデータの登録・更新・削除などの操作履歴を閲覧します。
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-800 bg-[#222] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="アクション種別で検索..."
                className="w-full pl-9 pr-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gold-500"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-gold-500 appearance-none"
              >
                <option value="">すべてのアクション</option>
                <option value="SALES">売上関連 (SALES_*)</option>
                <option value="ATTENDANCE">勤怠関連 (ATTENDANCE_*)</option>
                <option value="MASTER">マスタ設定 (MASTER_*)</option>
                <option value="SHIFT">シフト関連 (SHIFT_*)</option>
              </select>
            </div>
            <div className="relative w-full sm:w-auto">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-gold-500 appearance-none [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
              />
            </div>
          </div>
        </div>

        {/* Log Table */}
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 size={24} className="animate-spin mr-2" />
              読み込み中...
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#2A2A2A] text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">日時</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">ロール</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">アクション種別</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">対象</th>
                  <th className="px-6 py-4 font-medium border-b border-gray-700">理由</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(logs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      ログが見つかりません
                    </td>
                  </tr>
                ) : (
                  (logs ?? []).map((log) => (
                    <tr key={log.id} className="hover:bg-[#222] transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-400 text-xs">
                        {new Date(log.createdAt).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-xs">{log.actorRole}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-[#111] border border-gray-700 rounded text-xs font-mono text-gold-500">
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                        {log.targetType}
                      </td>
                      <td className="px-6 py-4 text-gray-400 max-w-xs truncate text-xs" title={log.reason ?? ''}>
                        {log.reason ?? '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#222] flex items-center justify-between text-xs text-gray-500">
          <span>{logs ? `全 ${logs.length} 件` : '読み込み中...'}</span>
        </div>
      </div>
    </div>
  );
}
