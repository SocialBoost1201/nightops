'use client';

import { useSales } from '@/hooks/useSales';
import { MobileSalesInput } from '@/components/sales/MobileSalesInput';
import { SalesSlipForm } from '@/components/sales/SalesSlipForm';
import { BadgeDollarSign, Clock, Users } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SalesPage() {
  const { slips, priceItems, isLoading, createSlip } = useSales();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B0B0C]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleCreateSlip = async (data: any) => {
    await createSlip(data);
  };

  const todaysTotal = slips.reduce((acc, slip) => acc + slip.subtotal, 0);

  // ── モバイル専用UI ────────────────────────────
  if (isMobile) {
    return (
      <MobileSalesInput
        priceItems={priceItems}
        onSubmit={handleCreateSlip}
        recentSlips={slips.slice(-5).map(s => ({ tableNo: s.customerName, subtotal: s.subtotal }))}
      />
    );
  }

  // ── PC / タブレット（大画面） ────────────────────────────
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <BadgeDollarSign className="text-gold-500" size={28} />
          売上伝票 入力
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          明細やドリンク杯数を同一画面内で連続・高速に入力できます。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Input Form */}
        <div className="lg:col-span-2">
          <SalesSlipForm priceItems={priceItems} onSubmit={handleCreateSlip} />
        </div>

        {/* Right Side: Summary & Recent Slips */}
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">本日の売上概算</h3>
            <p className="text-3xl font-bold text-gold-400 mb-6">¥ {(todaysTotal * 1.35).toLocaleString()}</p>

            <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-800">
              <span className="text-gray-400 flex items-center gap-2"><Users size={16}/> 接客組数</span>
              <span className="font-medium text-gray-200">{slips.length} 組</span>
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 bg-[#222]">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                直近の入力履歴
              </h3>
            </div>
            <div className="divide-y divide-gray-800">
              {slips.length === 0 ? (
                <div className="p-5 text-sm text-gray-500 text-center">本日の入力はまだありません</div>
              ) : (
                slips.slice().reverse().map(slip => (
                  <div key={slip.id} className="p-4 hover:bg-[#222] transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-200">{slip.customerName}</p>
                      <p className="text-xs text-gray-500 mt-1">{slip.primaryCastName} / {slip.headcount}名 / {slip.createdAt}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-gold-400 text-sm">¥{slip.subtotal.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase">{slip.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
