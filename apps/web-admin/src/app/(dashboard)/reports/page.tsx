'use client';

import { useState } from 'react';
import {
  BarChart3, TrendingUp, Users, Crown, Download,
  Star, Wine, Calendar, ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import { exportCastReportExcel, exportPayrollExcel } from '@/lib/exportReport';


// ── Mock Data ────────────────────────────────────────────
const MONTHS = ['2026年3月', '2026年2月', '2026年1月'];

const KPI_DATA: Record<string, { totalSales: number; totalGuests: number; totalNominations: number; avgPerGuest: number; prevSales: number; prevGuests: number; prevNominations: number }> = {
  '2026年3月': { totalSales: 12450000, totalGuests: 842, totalNominations: 315, avgPerGuest: 14786, prevSales: 10810000, prevGuests: 801, prevNominations: 323 },
  '2026年2月': { totalSales: 10810000, totalGuests: 801, totalNominations: 323, avgPerGuest: 13496, prevSales: 9870000, prevGuests: 750, prevNominations: 290 },
  '2026年1月': { totalSales: 9870000,  totalGuests: 750, totalNominations: 290, avgPerGuest: 13160, prevSales: 9200000, prevGuests: 720, prevNominations: 280 },
};

const CAST_DATA: Record<string, { name: string; sales: number; nominations: number; drinks: number; workdays: number; estimatedPay: number }[]> = {
  '2026年3月': [
    { name: 'あんな', sales: 1450000, nominations: 85, drinks: 310, workdays: 22, estimatedPay: 320000 },
    { name: 'れいな', sales: 1200000, nominations: 62, drinks: 241, workdays: 20, estimatedPay: 265000 },
    { name: 'みなみ', sales: 980000,  nominations: 51, drinks: 198, workdays: 19, estimatedPay: 215000 },
    { name: 'さくら', sales: 850000,  nominations: 45, drinks: 175, workdays: 18, estimatedPay: 187000 },
    { name: 'みほ',   sales: 720000,  nominations: 38, drinks: 152, workdays: 17, estimatedPay: 158000 },
    { name: 'かな',   sales: 610000,  nominations: 30, drinks: 128, workdays: 15, estimatedPay: 134000 },
    { name: 'ゆり',   sales: 540000,  nominations: 25, drinks: 105, workdays: 14, estimatedPay: 118000 },
    { name: 'はな',   sales: 420000,  nominations: 20, drinks: 88,  workdays: 12, estimatedPay:  92000 },
  ],
  '2026年2月': [
    { name: 'あんな', sales: 1280000, nominations: 78, drinks: 290, workdays: 20, estimatedPay: 285000 },
    { name: 'れいな', sales: 1050000, nominations: 58, drinks: 215, workdays: 18, estimatedPay: 232000 },
    { name: 'みなみ', sales: 890000,  nominations: 48, drinks: 180, workdays: 18, estimatedPay: 196000 },
    { name: 'さくら', sales: 770000,  nominations: 42, drinks: 158, workdays: 17, estimatedPay: 170000 },
    { name: 'みほ',   sales: 650000,  nominations: 34, drinks: 138, workdays: 16, estimatedPay: 143000 },
    { name: 'かな',   sales: 550000,  nominations: 28, drinks: 115, workdays: 14, estimatedPay: 121000 },
    { name: 'ゆり',   sales: 490000,  nominations: 22, drinks: 96,  workdays: 13, estimatedPay: 108000 },
    { name: 'はな',   sales: 380000,  nominations: 18, drinks: 79,  workdays: 11, estimatedPay:  84000 },
  ],
  '2026年1月': [
    { name: 'あんな', sales: 1100000, nominations: 70, drinks: 260, workdays: 19, estimatedPay: 245000 },
    { name: 'れいな', sales: 950000,  nominations: 55, drinks: 200, workdays: 17, estimatedPay: 210000 },
    { name: 'みなみ', sales: 800000,  nominations: 44, drinks: 165, workdays: 17, estimatedPay: 177000 },
    { name: 'さくら', sales: 700000,  nominations: 40, drinks: 145, workdays: 16, estimatedPay: 155000 },
    { name: 'みほ',   sales: 600000,  nominations: 31, drinks: 125, workdays: 15, estimatedPay: 133000 },
    { name: 'かな',   sales: 510000,  nominations: 26, drinks: 108, workdays: 13, estimatedPay: 113000 },
    { name: 'ゆり',   sales: 440000,  nominations: 20, drinks: 88,  workdays: 12, estimatedPay:  98000 },
    { name: 'はな',   sales: 350000,  nominations: 16, drinks: 72,  workdays: 10, estimatedPay:  78000 },
  ],
};

const DAILY_DATA = [
  { day: '1', sales: 310000  }, { day: '3', sales: 420000  }, { day: '5', sales: 380000  },
  { day: '7', sales: 510000  }, { day: '9', sales: 295000  }, { day: '11', sales: 450000 },
  { day: '13', sales: 620000 }, { day: '15', sales: 390000 }, { day: '17', sales: 480000 },
  { day: '19', sales: 550000 }, { day: '21', sales: 410000 }, { day: '23', sales: 590000 },
  { day: '25', sales: 470000 }, { day: '27', sales: 360000 }, { day: '29', sales: 520000 },
];

// ── Helpers ───────────────────────────────────────────────
function pct(current: number, prev: number) {
  if (prev === 0) return null;
  return ((current - prev) / prev * 100).toFixed(1);
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? 'bg-yellow-500 text-yellow-900' :
    rank === 2 ? 'bg-gray-300 text-gray-800' :
    rank === 3 ? 'bg-amber-700 text-amber-100' :
    'bg-[#222] text-gray-500';
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}>
      {rank <= 3 ? <Crown size={12} /> : rank}
    </div>
  );
}

function Delta({ current, prev }: { current: number; prev: number }) {
  const p = pct(current, prev);
  if (!p) return null;
  const up = parseFloat(p) >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
      {up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      {Math.abs(parseFloat(p))}%
    </span>
  );
}

function KpiCard({ title, value, sub, prev, icon, iconColor }: {
  title: string; value: string; sub?: string; prev?: number; icon: React.ReactNode; iconColor: string
}) {
  return (
    <div className="bg-[#1A1A1A] rounded-xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400 font-medium">{title}</p>
        <div className={`p-2 rounded-lg ${iconColor}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && prev !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <Delta current={parseFloat(value.replace(/[^0-9.-]/g, ''))} prev={prev} />
          <span className="text-[10px] text-gray-600">前月比</span>
        </div>
      )}
    </div>
  );
}

// ── Bar Chart (CSS only) ─────────────────────────────────
function BarMiniChart({ data }: { data: { day: string; sales: number }[] }) {
  const max = Math.max(...data.map(d => d.sales));
  return (
    <div className="flex items-end gap-1 h-28 mt-4">
      {data.map(d => (
        <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-sm bg-gold-600/70 hover:bg-gold-500 transition-colors"
            style={{ height: `${(d.sales / max) * 100}%` }}
            title={`${d.day}日: ¥${d.sales.toLocaleString()}`}
          />
          <span className="text-[9px] text-gray-600">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────
type Tab = 'monthly' | 'cast' | 'payroll';
type SortKey = 'sales' | 'nominations' | 'drinks' | 'workdays' | 'estimatedPay';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [sortKey, setSortKey] = useState<SortKey>('sales');
  const [sortAsc, setSortAsc] = useState(false);

  const kpi = KPI_DATA[selectedMonth];
  const castList = [...(CAST_DATA[selectedMonth] || [])].sort((a, b) =>
    sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
  );
  const prevMonth = MONTHS[MONTHS.indexOf(selectedMonth) + 1];
  const prevCastList = prevMonth ? (CAST_DATA[prevMonth] || []) : [];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <Minus size={11} className="text-gray-700" />;
    return sortAsc ? <ChevronUp size={11} className="text-gold-400" /> : <ChevronDown size={11} className="text-gold-400" />;
  };

  const ThSort = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th
      className={`px-4 py-3 font-medium text-xs cursor-pointer select-none hover:text-gold-400 transition-colors ${right ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}<SortIcon k={k} />
      </span>
    </th>
  );

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'monthly',  label: '月次集計',      icon: <BarChart3 size={14} /> },
    { id: 'cast',     label: 'キャスト別内訳', icon: <Star size={14} />      },
    { id: 'payroll',  label: '給与レポート',   icon: <Crown size={14} />     },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <BarChart3 className="text-gold-500" size={28} />
            集計・給与レポート
          </h1>
          <p className="text-sm text-gray-400 mt-1">月次の売上・ランキング・キャスト別給与明細を確認します。</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#111] border border-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
          >
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button
            onClick={() => {
              const rows = castList.map((r: typeof castList[0]) => ({
                name: r.name, sales: r.sales, nominations: r.nominations,
                drinks: r.drinks, workDays: r.workdays, estimatedPay: r.estimatedPay,
              }));
              if (activeTab === 'cast') exportCastReportExcel(rows, selectedMonth);
              else if (activeTab === 'payroll') exportPayrollExcel(rows, selectedMonth);
            }}
            disabled={activeTab === 'monthly'}
            className="flex items-center gap-2 px-4 py-2 bg-[#222] border border-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Download size={15} />Excelダウンロード
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#111] border border-gray-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-[#222] text-gold-400 border border-gold-600/20 shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
              }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: 月次集計 */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="月間総売上"
              value={`¥${(kpi.totalSales / 10000).toFixed(0)}万`}
              sub="前月比"
              icon={<TrendingUp size={16} />}
              iconColor="bg-emerald-900/30 text-emerald-400"
            />
            <KpiCard
              title="総客数"
              value={`${kpi.totalGuests}組`}
              sub="前月比"
              prev={kpi.prevGuests}
              icon={<Users size={16} />}
              iconColor="bg-blue-900/30 text-blue-400"
            />
            <KpiCard
              title="総指名本数"
              value={`${kpi.totalNominations}本`}
              sub="前月比"
              prev={kpi.prevNominations}
              icon={<Crown size={16} />}
              iconColor="bg-gold-900/30 text-gold-400"
            />
            <KpiCard
              title="客単価（平均）"
              value={`¥${kpi.avgPerGuest.toLocaleString()}`}
              icon={<Star size={16} />}
              iconColor="bg-purple-900/30 text-purple-400"
            />
          </div>

          {/* Daily trend */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-300">日別売上推移</h2>
              <span className="text-xs text-gray-500">{selectedMonth}</span>
            </div>
            <BarMiniChart data={DAILY_DATA} />
          </div>

          {/* Ranking 2-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales ranking */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-[#222]">
                <h2 className="text-sm font-semibold text-gray-200">売上ランキング</h2>
              </div>
              {castList.slice(0, 5).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 last:border-0 hover:bg-[#222]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={i + 1} />
                    <p className="text-sm font-medium text-gray-200">{c.name}</p>
                  </div>
                  <p className="font-mono text-gold-400 text-sm">¥{c.sales.toLocaleString()}</p>
                </div>
              ))}
            </div>
            {/* Nomination ranking */}
            <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 bg-[#222]">
                <h2 className="text-sm font-semibold text-gray-200">指名ランキング</h2>
              </div>
              {[...castList].sort((a, b) => b.nominations - a.nominations).slice(0, 5).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 last:border-0 hover:bg-[#222]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={i + 1} />
                    <p className="text-sm font-medium text-gray-200">{c.name}</p>
                  </div>
                  <p className="font-mono text-gold-400 text-sm">{c.nominations}本</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: キャスト別内訳 */}
      {activeTab === 'cast' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#222] text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-xs">キャスト</th>
                  <ThSort k="sales"         label="売上" right />
                  <ThSort k="nominations"   label="指名" right />
                  <ThSort k="drinks"        label="ドリンク" right />
                  <ThSort k="workdays"      label="出勤" right />
                  <th className="px-4 py-3 font-medium text-xs text-right">客単価</th>
                  <th className="px-4 py-3 font-medium text-xs text-right">前月比(売上)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {castList.map((c, i) => {
                  const prev = prevCastList.find(p => p.name === c.name);
                  const p = prev ? pct(c.sales, prev.sales) : null;
                  const up = p ? parseFloat(p) >= 0 : null;
                  return (
                    <tr key={c.name} className="hover:bg-[#222]/60 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <RankBadge rank={i + 1} />
                          <span className="font-medium text-gray-200">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gold-400 font-medium">¥{c.sales.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right text-gray-300">{c.nominations}本</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-gray-300">
                          <Wine size={12} className="text-gray-500" />{c.drinks}杯
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-gray-300">
                          <Calendar size={12} className="text-gray-500" />{c.workdays}日
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-400 text-xs">
                        ¥{c.workdays > 0 ? Math.round(c.sales / c.workdays).toLocaleString() : 0}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {p ? (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                            {up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{Math.abs(parseFloat(p))}%
                          </span>
                        ) : <span className="text-gray-700 text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: 給与レポート */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-5 py-3.5 text-sm text-amber-400 flex items-start gap-2.5">
            <Crown size={16} className="shrink-0 mt-0.5" />
            <span>以下は概算表示です。確定給与は「給与・月次確定」画面での最終締め処理後に確定します。</span>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-200">給与概算一覧（{selectedMonth}）</h2>
              <span className="text-xs text-gray-500 bg-[#333] px-2 py-1 rounded">概算・未確定</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#1E1E1E] text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-medium text-xs">キャスト</th>
                    <th className="px-4 py-3 font-medium text-xs text-right">出勤日数</th>
                    <th className="px-4 py-3 font-medium text-xs text-right">売上貢献額</th>
                    <th className="px-4 py-3 font-medium text-xs text-right">指名本数</th>
                    <th className="px-4 py-3 font-medium text-xs text-right">推定給与（概算）</th>
                    <th className="px-4 py-3 font-medium text-xs text-right">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {castList.map((c) => (
                    <tr key={c.name} className="hover:bg-[#222]/60 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-200">{c.name}</td>
                      <td className="px-4 py-3.5 text-right text-gray-300">{c.workdays}日</td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-300">¥{c.sales.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right text-gray-300">{c.nominations}本</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-mono font-bold text-gold-400">¥{c.estimatedPay.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="px-2 py-0.5 bg-amber-900/20 text-amber-400 border border-amber-800/40 rounded text-[10px] font-medium">概算</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#222] border-t border-gray-700">
                    <td className="px-4 py-3.5 font-semibold text-gray-300">合計</td>
                    <td className="px-4 py-3.5 text-right text-gray-400">—</td>
                    <td className="px-4 py-3.5 text-right font-mono text-gray-300">
                      ¥{castList.reduce((s, c) => s + c.sales, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-300">
                      {castList.reduce((s, c) => s + c.nominations, 0)}本
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-gold-400">
                      ¥{castList.reduce((s, c) => s + c.estimatedPay, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
