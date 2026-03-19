'use client';

import { useState } from 'react';
import { ShiftTable } from '@/components/shifts/ShiftTable';
import { exportToExcel, printShifts } from '@/lib/utils/export';
import { Download, Printer, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShifts } from '@/hooks/useShifts';
import { useToast } from '@/components/ui/Toast';

export default function ShiftsPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    // デモ用に見栄えのよい2026年4月に固定せず、現在月に設定
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { shiftData, isLoading, isError } = useShifts(year, month);
  const { warning } = useToast();

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Handle immediate shift changes
  const handleUpdateShift = (castId: string, date: number, newValue: string) => {
    // 1. 今回のMVP要件では、キャスト・スタッフが各自モバイル画面からシフトを提出(POST /shifts/submit)する。
    // 管理者画面からのセルの直接編集(代理作成など)はAPIの仕様外(user.id強制)のため、UI上で警告を出すに留める。
    warning('シフトの作成・変更はキャスト各自のモバイル画面より行ってください。(管理者代行入力は未実装です)');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
          <p className="text-sm text-gray-500">シフトデータを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-400">
        シフトデータの読み込みに失敗しました。
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-background min-h-screen text-foreground">
      {/* Control Panel (Hidden during printing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            シフト管理 
            <span className="text-gold-500 font-medium">({year}年 {month}月)</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            各キャストがモバイルより提出・申請したシフト状況を一覧で確認します。
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* 月切替ナビゲーション */}
          <div className="flex items-center bg-[#1A1A1A] border border-gray-700 rounded-lg overflow-hidden mr-2">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 py-1 text-sm font-medium text-gray-200">
              {year}年{month}月
            </span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-[#2A2A2A] text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          <button 
            onClick={() => exportToExcel(shiftData)} 
            className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] border border-gray-600 text-gray-200 rounded-lg hover:bg-[#333] transition-colors shadow-sm text-sm"
          >
            <Download size={18} />
            Excel連携
          </button>
          <button 
            onClick={printShifts} 
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white font-medium rounded-lg hover:bg-gold-500 transition-colors shadow-sm text-sm"
          >
            <Printer size={18} />
            印刷する (A4ヨコ)
          </button>
        </div>
      </div>

      {/* 
        A4横 (Landscape) 印刷対応コンテナ
        print:block 等を用いて、印刷時にのみ表示を最適化する
      */}
      <div className="bg-[#1a1a1a] md:bg-[#111] md:p-6 rounded-lg md:border border-gray-800 print:bg-white print:border-none print:p-0">
        
        {shiftData.casts.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            当月のシフトデータはまだ登録されていません。
          </div>
        ) : (
          <>
            {/* 前半 (1〜15日) - 印刷時はここで改ページ */}
            <div className="mb-12 page-break">
              <h2 className="text-xl mb-4 font-semibold text-gray-200 print:text-black">
                {year}年 {month}月 シフト表 (1〜15日)
              </h2>
              <ShiftTable 
                data={shiftData} 
                period="firstHalf" 
                onUpdateShift={handleUpdateShift} 
              />
            </div>

            {/* 後半 (16〜末日) */}
            <div className="mb-8">
              <h2 className="text-xl mb-4 font-semibold text-gray-200 print:text-black">
                {year}年 {month}月 シフト表 (16〜末日)
              </h2>
              <ShiftTable 
                data={shiftData} 
                period="secondHalf" 
                onUpdateShift={handleUpdateShift} 
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
