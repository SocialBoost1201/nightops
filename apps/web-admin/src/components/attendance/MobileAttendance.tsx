'use client';

import { useState } from 'react';
import { useAttendance } from '@/hooks/useAttendance';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { Clock, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';

// スライドボタン (MobileSalesInputの実装を流用)
function SlideToConfirm({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [done, setDone] = useState(false);
  let startX = 0;

  const TRACK = 280;
  const HANDLE = 56;
  const max = TRACK - HANDLE - 8;

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startX = e.clientX - offset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset(Math.max(0, Math.min(e.clientX - startX, max)));
  };
  const onPointerUp = () => {
    setIsDragging(false);
    if (offset > max * 0.85) {
      setDone(true);
      if ('vibrate' in navigator) navigator.vibrate(50);
      setTimeout(() => { onConfirm(); setOffset(0); setDone(false); }, 350);
    } else {
      setOffset(0);
    }
  };

  return (
    <div
      className={`relative h-14 rounded-2xl overflow-hidden w-[${TRACK}px] mx-auto border ${done ? 'border-emerald-700 bg-emerald-800' : 'border-gray-700 bg-[#1A1A1A]'}`}
      style={{ width: TRACK }}
    >
      <div className="absolute inset-0 bg-gold-600/15 transition-none" style={{ width: `${(offset / max) * 100}%` }} />
      {!done && (
        <p className={`absolute inset-0 flex items-center justify-center text-sm text-gray-500 pointer-events-none transition-opacity ${offset > 60 ? 'opacity-0' : 'opacity-100'}`}>
          → {label}
        </p>
      )}
      {done && <p className="absolute inset-0 flex items-center justify-center text-sm text-emerald-400 font-bold">✓ 完了</p>}
      <div
        className="absolute top-1 left-1 w-12 h-12 rounded-xl bg-gold-600 flex items-center justify-center text-white text-xl cursor-grab touch-none select-none active:cursor-grabbing"
        style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <ChevronRight size={20} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function MobileAttendance() {
  const { attendance, isLoading } = useAttendance();
  const { success, error: showError } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const workingCast = attendance.filter(a => a.userType === 'cast' && a.status === 'working');
  const finishedCast = attendance.filter(a => a.userType === 'cast' && a.status !== 'working');

  const handleCheckout = async (castId: string, castName: string) => {
    setProcessingId(castId);
    try {
      await apiClient.post('/cast-checkouts/set', { castId, checkoutTime: new Date().toISOString() });
      success(`${castName} のあがりを入力しました`);
    } catch {
      showError('あがり入力に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 bg-[#0B0B0C] min-h-[calc(100dvh-56px)] px-4 py-5">
      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-0.5">
          {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Clock size={20} className="text-gold-500" />キャスト退勤入力
        </h1>
        <p className="text-xs text-gray-600 mt-0.5">在籍中のキャスト全員の退勤時刻を入力してください</p>
      </div>

      {/* Working cast list */}
      {workingCast.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
          <p className="text-gray-300 font-medium">全員のあがりが入力されました</p>
          <p className="text-xs text-gray-600 mt-1">日次締めに進めます</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-amber-400" />
            <p className="text-xs text-amber-400 font-medium">あがり未入力: {workingCast.length}名</p>
          </div>
          {workingCast.map(cast => (
            <div   key={cast.userProfileId} className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E1E1E] rounded-full flex items-center justify-center text-gold-400 font-bold">
                    {cast.displayName?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">{cast.displayName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={10} />出勤: {cast.checkInTime ?? '—'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-amber-900/20 text-amber-400 border border-amber-800/40 rounded-full font-medium">在籍中</span>
              </div>

              {processingId === cast.userProfileId ? (
                <div className="flex items-center justify-center py-2 gap-2">
                  <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">処理中...</span>
                </div>
              ) : (
                <SlideToConfirm
                  label="スライドしてあがり確定"
                  onConfirm={() => handleCheckout(cast.userProfileId, cast.displayName ?? '')}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Finished list */}
      {finishedCast.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">あがり済み</p>
          <div className="space-y-2">
            {finishedCast.map(cast => (
              <div   key={cast.userProfileId} className="flex items-center justify-between px-4 py-3 bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <p className="text-sm text-gray-400">{cast.displayName}</p>
                </div>
                <p className="text-xs text-gray-600 font-mono">{cast.checkOutTime ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
