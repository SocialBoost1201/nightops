'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { ArrowLeft, Star, Crown, Wine, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface CastDetail {
  castId: string;
  castName: string;
  yearMonth: string;
  totalSales: number;
  nominationCount: number;
  drinkCount: number;
  workDays: number;
  dailyBreakdown: { date: string; sales: number; nominations: number; drinks: number }[];
}

export default function CastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CastDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    setIsLoading(true);
    apiClient.get(`/reports/ranking/sales?castId=${id}&yearMonth=${selectedMonth}`)
      .then(res => {
        // Prepare mock detail since API returns ranking, not per-cast detail
        // TODO: Replace with dedicated /reports/cast/:id endpoint when available
        const item = Array.isArray(res.data)
          ? res.data.find((r: any) => r.castId === id) ?? res.data[0]
          : res.data;
        setData({
          castId: id,
          castName: item?.castName ?? 'キャスト',
          yearMonth: selectedMonth,
          totalSales: item?.totalSales ?? 0,
          nominationCount: item?.nominationCount ?? 0,
          drinkCount: item?.drinkCount ?? 0,
          workDays: 0,
          dailyBreakdown: [],
        });
      })
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [id, selectedMonth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>データが見つかりませんでした</p>
        <Link href="/reports" className="text-gold-400 text-sm mt-4 inline-block hover:underline">レポートへ戻る</Link>
      </div>
    );
  }

  const kpis = [
    { label: '月間売上', value: `¥${data.totalSales.toLocaleString()}`, icon: <TrendingUp size={16} />, color: 'text-gold-400' },
    { label: '指名本数', value: `${data.nominationCount}本`, icon: <Crown size={16} />, color: 'text-purple-400' },
    { label: 'ドリンク', value: `${data.drinkCount}杯`, icon: <Wine size={16} />, color: 'text-blue-400' },
    { label: '出勤日数', value: `${data.workDays}日`, icon: <Calendar size={16} />, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <button onClick={() => router.back()} className="mt-1 text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gold-700/20 border border-gold-700/40 rounded-full flex items-center justify-center text-gold-400 font-bold text-lg">
              {data.castName[0]}
            </div>
            <h1 className="text-2xl font-bold text-gray-100">{data.castName}
              <span className="ml-2 text-sm text-gray-500 font-normal">キャスト詳細</span>
            </h1>
          </div>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-[#111] border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
        >
          {[0, 1, 2].map(offset => {
            const d = new Date();
            d.setMonth(d.getMonth() - offset);
            const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
            return <option key={v} value={v}>{label}</option>;
          })}
        </select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <div key={k.label} className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              {k.icon}{k.label}
            </div>
            <p className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Daily breakdown */}
      {data.dailyBreakdown.length > 0 ? (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 bg-[#222]">
            <h2 className="text-sm font-semibold text-gray-200">日別内訳</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#1E1E1E] text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="px-5 py-3 font-medium">日付</th>
                  <th className="px-5 py-3 font-medium text-right">売上</th>
                  <th className="px-5 py-3 font-medium text-right">指名</th>
                  <th className="px-5 py-3 font-medium text-right">ドリンク</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.dailyBreakdown.map(row => (
                  <tr key={row.date} className="hover:bg-[#222]/60 transition-colors">
                    <td className="px-5 py-3 text-gray-300">{row.date}</td>
                    <td className="px-5 py-3 text-right font-mono text-gold-400">¥{row.sales.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-gray-300">{row.nominations}本</td>
                    <td className="px-5 py-3 text-right text-gray-300">{row.drinks}杯</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-8 text-center text-gray-600 text-sm">
          日別明細は現在準備中です。専用APIエンドポイントの実装後に表示されます。
        </div>
      )}
    </div>
  );
}
