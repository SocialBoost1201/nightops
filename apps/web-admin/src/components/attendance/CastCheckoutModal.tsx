'use client';

import { useState } from 'react';
import { X, Clock } from 'lucide-react';
import { AttendanceRecord } from '@/hooks/useAttendance';

interface Props {
  record: AttendanceRecord;
  onClose: () => void;
  onSubmit: (recordId: string, time: string, accountId?: string) => Promise<void>;
}

export function CastCheckoutModal({ record, onClose, onSubmit }: Props) {
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial time to current time
  useState(() => {
    const now = new Date();
    // 営業終了時刻などの都合で24時を超える場合の考慮等もここで行うのが望ましい
    setTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;
    setIsSubmitting(true);
    try {
      await onSubmit(record.id, time, record.accountId);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] w-full max-w-md rounded-xl border border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#222]">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Clock className="text-gold-500" size={20} />
            キャスト退店時間入力
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-1">対象キャスト</p>
            <p className="text-xl font-medium text-gray-100">{record.displayName}</p>
            <p className="text-xs text-gray-500 mt-1">出勤時刻: {record.checkInTime}</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              退店時刻
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-lg text-white text-lg focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !time}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isSubmitting || !time 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-gold-600 text-white hover:bg-gold-500 shadow-lg shadow-gold-500/20'
              }`}
            >
              確定する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
