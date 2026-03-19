import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import type { ShiftData, CastShift } from '@/types/shift';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

interface ShiftEntryRaw {
  id: string;
  accountId: string;
  displayName: string;
  periodStart: string;
  periodEnd: string;
  date: string; // ISO String
  plannedStart: string | null;
  plannedEnd: string | null;
  memo: string | null;
  status: string;
}

export function useShifts(year: number, month: number) {
  // 月初と月末を計算
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // 月末
  
  const periodStart = startDate.toISOString().split('T')[0];
  const periodEnd   = endDate.toISOString().split('T')[0];

  const url = `/shifts/period?periodStart=${periodStart}&periodEnd=${periodEnd}`;
  const { data, error, isLoading, mutate } = useSWR<ShiftEntryRaw[]>(url, fetcher);

  // バックエンドのフラットなShiftEntry配列を、UI表示用のShiftData構造に変換する
  const shiftData: ShiftData = {
    year,
    month,
    casts: []
  };

  if (data) {
    const castMap = new Map<string, CastShift>();

    data.forEach(entry => {
      if (!castMap.has(entry.accountId)) {
        castMap.set(entry.accountId, {
          id: entry.accountId,
          name: entry.displayName || 'Unknown',
          shifts: {}
        });
      }

      const castData = castMap.get(entry.accountId)!;
      const day = new Date(entry.date).getDate().toString();
      
      // status が 'approved' か 'submitted' の場合、シフトがあるとみなす
      // memo に "同伴" と入っていれば "同伴"、plannedStart があれば "出勤"、そうでなければ空文字とする（MVP用の簡易マッピング）
      let shiftVal = '';
      if (entry.status === 'approved' || entry.status === 'submitted') {
        if (entry.memo?.includes('同伴')) {
          shiftVal = '同伴';
        } else if (entry.plannedStart) {
          shiftVal = '出勤'; // 時間ではなく文字を入れる
        } else {
          shiftVal = '休み';
        }
      } else if (entry.status === 'rejected') {
         shiftVal = '休み';
      }

      castData.shifts[day] = shiftVal;
    });

    shiftData.casts = Array.from(castMap.values());
  }

  return {
    shiftData,
    isLoading,
    isError: error,
    mutate
  };
}
