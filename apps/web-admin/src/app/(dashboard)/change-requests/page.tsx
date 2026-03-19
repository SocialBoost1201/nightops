'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { FileEdit, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

interface ChangeRequest {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  diffJson: any;
  createdAt?: string;
}

const targetTypeLabel = (t: string) => {
  if (t === 'ShiftEntry') return 'シフト変更';
  if (t === 'PunchEvent') return '勤怠修正';
  if (t === 'SalesSlip') return '売上修正';
  return t;
};

export default function ChangeRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: pending, isLoading: pendingLoading, mutate: mutatePending } =
    useSWR<ChangeRequest[]>('/change-requests/pending', fetcher);

  const { data: myRequests, isLoading: myLoading } =
    useSWR<ChangeRequest[]>('/change-requests/my', fetcher);

  const allRequests = [...(pending ?? []), ...(myRequests ?? [])].filter(
    (r, i, arr) => arr.findIndex(x => x.id === r.id) === i
  );

  const filtered = statusFilter === 'ALL'
    ? allRequests
    : allRequests.filter(r => r.status.toUpperCase() === statusFilter);

  const pendingCount = (pending ?? []).length;

  const handleProcess = async (id: string, action: 'approved' | 'rejected') => {
    await apiClient.post(`/change-requests/${id}/process`, { action });
    mutatePending();
  };

  const isLoading = pendingLoading || myLoading;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <FileEdit className="text-gold-500" size={28} />
          修正申請（承認待ちタスク）
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          キャストやスタッフから提出されたシフト変更や打刻漏れの修正申請を承認・却下します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1A1A1A] p-5 rounded-xl border border-gray-800 flex flex-col justify-center">
          <span className="text-sm text-gray-400 mb-1">未承認 (Pending)</span>
          <span className="text-3xl font-bold text-amber-500">
            {isLoading ? '-' : `${pendingCount} 件`}
          </span>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 bg-[#222] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-200">申請一覧</h2>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#111] border border-gray-700 text-gray-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-gold-500"
          >
            <option value="ALL">すべてのステータス</option>
            <option value="PENDING">未承認</option>
            <option value="APPROVED">承認済み</option>
            <option value="REJECTED">却下</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 size={24} className="animate-spin mr-2" />読み込み中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">申請はありません</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map(req => (
              <div key={req.id} className="p-5 hover:bg-[#222] transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`mt-1 flex-shrink-0 ${
                    req.status === 'pending' ? 'text-amber-500' :
                    req.status === 'approved' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {req.status === 'pending' && <Clock size={20} />}
                    {req.status === 'approved' && <CheckCircle size={20} />}
                    {req.status === 'rejected' && <XCircle size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-300 text-[10px] rounded border border-gray-700">
                        {targetTypeLabel(req.targetType)}
                      </span>
                      <span className="font-medium text-gray-200 text-sm">{req.requestedBy.slice(0, 8)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">理由: {req.reason}</p>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-800 md:border-none">
                    <button
                      onClick={() => handleProcess(req.id, 'rejected')}
                      className="flex-1 md:flex-none px-4 py-2 bg-[#2A2A2A] text-gray-300 hover:text-red-400 hover:bg-[#333] border border-gray-700 rounded text-sm transition-colors"
                    >
                      却下
                    </button>
                    <button
                      onClick={() => handleProcess(req.id, 'approved')}
                      className="flex-1 md:flex-none px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white font-medium rounded text-sm transition-colors shadow-sm"
                    >
                      承認する
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
