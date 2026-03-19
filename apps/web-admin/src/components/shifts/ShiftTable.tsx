'use client';

import { useMemo } from 'react';
import { getDaysForMonth } from '@/lib/utils/date';
import type { ShiftData } from '@/types/shift';

interface Props {
  data: ShiftData;
  period: 'firstHalf' | 'secondHalf'; // 1-15日 or 16-last
  onUpdateShift: (castId: string, date: number, newValue: string) => void;
}

export function ShiftTable({ data, period, onUpdateShift }: Props) {
  const allDays = useMemo(() => getDaysForMonth(data.year, data.month), [data.year, data.month]);
  
  // 期間による分割
  const displayDays = period === 'firstHalf' 
    ? allDays.filter(d => d.date <= 15) 
    : allDays.filter(d => d.date >= 16);

  return (
    <div className="w-full overflow-x-auto print:overflow-visible pb-4">
      {/* 
        Tailwind CSSを用いた高級感のある・夜職向けシックなデザイン
        【レスポンシブ対応】 PC/スマホ両方で閲覧性を高めるため、
        スマホではキャスト名の列（th/td）を sticky left-0 にして横スクロール時に名前を固定する。
      */}
      <table className="w-full border-collapse text-sm bg-[#1A1A1A] text-gray-200 border border-gray-700 min-w-max">
        <thead>
          <tr className="bg-[#2A2A2A] border-b border-gray-700">
            <th className="p-3 text-left w-32 border-r border-gray-700 font-semibold text-gold-500 sticky left-0 z-10 bg-[#2A2A2A]">
              キャスト名
            </th>
            {displayDays.map(day => (
              <th 
                key={day.date} 
                className={`p-2 text-center w-12 border-r border-gray-700 min-w-[3rem] ${day.isWeekend ? 'text-red-400' : ''}`}
              >
                <div>{day.date}</div>
                <div className="text-xs">({day.dayOfWeek})</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.casts.map((cast) => (
            <tr key={cast.id} className="border-b border-gray-700 hover:bg-[#333333] transition-colors group">
              <td className="p-3 font-medium border-r border-gray-700 sticky left-0 bg-[#1A1A1A] group-hover:bg-[#333333] z-10 transition-colors">
                {cast.name}
              </td>
              {displayDays.map(day => {
                const shiftValue = cast.shifts[day.date.toString()];
                return (
                  <td key={day.date} className="p-0 text-center border-r border-gray-700 min-w-[3rem]">
                    <select
                      value={shiftValue || ''}
                      onChange={(e) => onUpdateShift(cast.id, day.date, e.target.value)}
                      className={`w-full h-full min-h-[40px] p-2 bg-transparent text-center appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold-500
                        ${shiftValue === '出勤' ? 'text-green-400 font-bold' : shiftValue === '休み' ? 'text-gray-500' : 'text-gray-300'}
                      `}
                    >
                      <option value="" className="text-black"></option>
                      <option value="出勤" className="text-black font-bold">出勤</option>
                      <option value="休み" className="text-black">休み</option>
                      <option value="同伴" className="text-black text-blue-600">同伴</option>
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
