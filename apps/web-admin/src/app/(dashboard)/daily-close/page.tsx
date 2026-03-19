'use client';

import { useState, useEffect } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useSales } from '@/hooks/useSales';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { AlertTriangle, CheckCircle2, MoonStar, XCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DailyClosePage() {
  const { attendance, isLoading: isLoadingAttendance } = useAttendance();
  const { slips, isLoading: isLoadingSales } = useSales();
  const { success, error: showError } = useToast();
  const [isClosing, setIsClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);
  const [alreadyClosed, setAlreadyClosed] = useState(false);

  const isLoading = isLoadingAttendance || isLoadingSales;

  // 締め済み状態の確認
  useEffect(() => {
    apiClient.get('/close/daily/status')
      .then(res => { if (res.data?.isClosed) setAlreadyClosed(true); })
      .catch(() => {}); // エラーは無視（APIがない場合の graceful fallback）
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

  const unclosedSlips = slips.filter(slip => slip.status === 'open');
  const workingCast  = attendance.filter(a => a.userType === 'cast'  && a.status === 'working');
  const workingStaff = attendance.filter(a => a.userType === 'staff' && a.status === 'working');
  const canClose = unclosedSlips.length === 0 && workingCast.length === 0 && workingStaff.length === 0;

  const handleDailyClose = async () => {
    if (!canClose) return;
    setIsClosing(true);
    try {
      await apiClient.post('/close/daily');
      setCloseSuccess(true);
      success('日次締めが完了しました。お疲れ様でした。');
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? '日次締めの実行に失敗しました。';
      showError(msg);
    } finally {
      setIsClosing(false);
    }
  };

  const checks = [
    {
      label: '精算待ちの売上伝票',
      ok: unclosedSlips.length === 0,
      detail: unclosedSlips.length > 0 ? `${unclosedSlips.length}件のオープンな伝票があります。精算処理を完了してください。` : null,
      link: '/sales',
      linkLabel: '売上画面へ',
      level: 'warn' as const,
    },
    {
      label: 'キャストの退店入力',
      ok: workingCast.length === 0,
      detail: workingCast.length > 0 ? `${workingCast.length}名のキャストが退店未入力です。` : null,
      link: '/attendance',
      linkLabel: '勤怠画面へ',
      level: 'error' as const,
    },
    {
      label: 'スタッフの退勤打刻',
      ok: workingStaff.length === 0,
      detail: workingStaff.length > 0 ? `${workingStaff.length}名のスタッフが未退勤です。` : null,
      link: null,
      linkLabel: null,
      level: 'error' as const,
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-8 text-center mt-4">
        <div className="w-16 h-16 bg-gold-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold-800">
          <MoonStar size={32} className="text-gold-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100">本日の営業を終了・日次締め</h1>
        <p className="text-sm text-gray-400 mt-2">
          未処理のタスクをすべて完了すると、日次締め処理を実行できます。
        </p>
      </div>

      {alreadyClosed && !closeSuccess && (
        <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-5 text-center mb-6">
          <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-emerald-400">本日の日次締めは既に完了しています</p>
          <p className="text-xs text-gray-500 mt-1">翌日の営業開始まで再締めはできません。</p>
        </div>
      )}

      {closeSuccess ? (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-8 text-center">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-400 mb-2">日次締め完了</h2>
          <p className="text-gray-300">本日の営業データが確定・保存されました。</p>
          <p className="text-sm text-gray-500 mt-4">お疲れ様でした。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Checklist */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 bg-[#222]">
              <h2 className="font-semibold text-gray-200">締め前確認事項</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {checks.map(c => (
                <div key={c.label} className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {c.ok
                      ? <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={22} />
                      : c.level === 'error'
                        ? <XCircle    className="text-red-500 shrink-0 mt-0.5" size={22} />
                        : <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={22} />
                    }
                    <div>
                      <p className="font-medium text-gray-200 text-sm">{c.label}</p>
                      {c.detail && (
                        <p className={`text-xs mt-1 ${c.level === 'error' ? 'text-red-400/80' : 'text-amber-400/80'}`}>
                          {c.detail}
                        </p>
                      )}
                    </div>
                  </div>
                  {!c.ok && c.link && (
                    <Link
                      href={c.link}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#222] hover:bg-[#2A2A2A] border border-gray-700 text-gray-300 text-xs rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {c.linkLabel}<ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="bg-[#1A1A1A] border border-gray-800 p-6 rounded-xl text-center">
            <button
              onClick={handleDailyClose}
              disabled={!canClose || isClosing || alreadyClosed}
              className={`w-full max-w-sm mx-auto py-4 rounded-xl font-bold text-lg tracking-wider transition-all ${
                alreadyClosed
                  ? 'bg-[#111] text-gray-600 border border-gray-800 cursor-not-allowed'
                  : !canClose
                  ? 'bg-[#1A1A1A] text-gray-600 border border-gray-800 cursor-not-allowed'
                  : isClosing
                  ? 'bg-gold-800 text-gold-200 cursor-wait'
                  : 'bg-gold-600 text-white hover:bg-gold-500 shadow-lg shadow-gold-600/20 active:scale-[0.98]'
              }`}
            >
              {isClosing ? '処理中...' : alreadyClosed ? '締め済み' : canClose ? '日次締めを実行する' : '実行できません'}
            </button>
            {!canClose && !alreadyClosed && (
              <p className="text-xs text-gray-600 mt-3">すべての確認事項をクリアするとボタンが有効になります</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
