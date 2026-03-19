'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Receipt, CalendarClock } from 'lucide-react';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: attendance } = useSWR<any[]>(`/punches/today?businessDate=${today}`, fetcher);
  const { data: pending } = useSWR<any[]>('/change-requests/pending', fetcher);

  const stats = [
    {
      title: '本日出勤 (Cast)',
      value: attendance ? `${attendance.length}名` : '-',
      icon: CalendarClock,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      title: '未処理の申請',
      value: pending ? `${pending.length}件` : '-',
      icon: Receipt,
      color: 'text-gold-400',
      bg: 'bg-gold-400/10',
    },
    {
      title: '本日の日付',
      value: today,
      icon: Users,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
  ];


  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">ダッシュボード</h1>
        <p className="text-sm text-gray-400 mt-2">
          {user?.displayName || '管理者'} さん、お疲れ様です。本日の営業状況サマリです。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] p-6 rounded-xl border border-gray-800 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <Icon size={24} className={stat.color} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-gray-200">未処理のアラート</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">

              
              <div className="flex items-center justify-between p-4 bg-gold-900/10 border border-gold-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Receipt size={20} className="text-gold-500" />
                  <div>
                    <p className="text-sm font-medium text-gold-200">未承認のシフト変更申請</p>
                    <p className="text-xs text-gold-500/70">あんな さんから4/16の休日申請が届いています</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-gold-950 text-gold-400 text-xs rounded hover:bg-gold-900 transition-colors">
                  承認画面へ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-gray-200">本日のアクション</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 bg-[#222] hover:bg-[#2A2A2A] border border-gray-700 rounded-lg text-left transition-colors group">
                <Receipt className="text-gray-400 group-hover:text-gold-400 mb-2" size={24} />
                <span className="block text-sm font-medium text-gray-200">売上伝票の入力</span>
              </button>

              <button className="p-4 bg-[#222] hover:bg-[#2A2A2A] border border-gray-700 rounded-lg text-left transition-colors group col-span-2 flex items-center justify-between">
                <div>
                  <span className="block text-sm font-medium text-gray-200">本日の営業を締める</span>
                  <span className="block text-xs text-gray-500 mt-1">未処理アラートゼロの場合のみ実行可能</span>
                </div>
                <div className="h-8 px-4 bg-gray-800 text-gray-400 flex items-center justify-center rounded text-sm font-medium cursor-not-allowed">
                  日次締め
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
