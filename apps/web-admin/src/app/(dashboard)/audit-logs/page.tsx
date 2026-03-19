'use client';

import { useState } from 'react';
import { ScrollText, Search, Calendar as CalendarIcon, Filter } from 'lucide-react';

export default function AuditLogsPage() {
  // モックデータ
  const [logs] = useState([
    { id: 'log_1', timestamp: '2026-03-18 11:45:21', user: '店長 (anim-0002)', action: 'SALES_SLIP_CREATED', target: 'slip_1234', details: '顧客名: 佐藤 様, 合計: 45,000円' },
    { id: 'log_2', timestamp: '2026-03-18 10:15:00', user: '管理者 (anim-0001)', action: 'MASTER_PRICE_UPDATED', target: 'pi_2', details: '本指名料を2,500円から3,000円に変更' },
    { id: 'log_3', timestamp: '2026-03-17 23:55:12', user: '店長 (anim-0002)', action: 'ATTENDANCE_CAST_CHECKOUT', target: 'att_567', details: 'あんな の退勤時刻を 23:50 に記録' },
    { id: 'log_4', timestamp: '2026-03-17 19:30:05', user: '田中 (staff_01)', action: 'USER_LOGIN', target: 'usr_3', details: 'IP: 192.168.1.15' },
    { id: 'log_5', timestamp: '2026-03-17 19:25:00', user: '店長 (anim-0002)', action: 'SHIFT_APPROVED', target: 'shift_req_8', details: 'みほ の 4/1 休業申請を承認' },
  ]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ScrollText className="text-gold-500" size={28} />
          監査ログ (操作履歴)
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          システム内で行われたデータの登録・更新・削除などの操作履歴を閲覧します。
        </p>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-800 bg-[#222] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="ユーザー名や詳細で検索..." 
                className="w-full pl-9 pr-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-gold-500"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <select className="w-full pl-9 pr-8 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-gold-500 appearance-none">
                <option value="">すべてのアクション</option>
                <option value="SALES">売上関連 (SALES_*) </option>
                <option value="ATTENDANCE">勤怠関連 (ATTENDANCE_*)</option>
                <option value="MASTER">マスタ設定 (MASTER_*)</option>
                <option value="SYSTEM">システム (USER_LOGIN等)</option>
              </select>
            </div>
            <div className="relative w-full sm:w-auto">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="date" 
                className="w-full pl-9 pr-4 py-2 bg-[#111] border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:border-gold-500 appearance-none [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
              />
            </div>
          </div>
          <button className="px-4 py-2 bg-[#333] hover:bg-[#444] text-gray-200 border border-gray-600 rounded text-sm transition-colors shadow-sm">
            検索実行
          </button>
        </div>

        {/* Log Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#2A2A2A] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-gray-700">日時</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">操作ユーザー</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">アクション種別</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">詳細情報</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#222] transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-400">{log.timestamp}</td>
                  <td className="px-6 py-4 font-medium text-gray-300">{log.user}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-[#111] border border-gray-700 rounded text-xs font-mono text-gold-500">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 max-w-md truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-gray-800 bg-[#222] flex items-center justify-between text-xs text-gray-500">
          <span>全 142 件中 1-5 件を表示</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-gray-700 rounded hover:bg-[#333] disabled:opacity-50" disabled>前へ</button>
            <button className="px-3 py-1.5 border border-gray-700 rounded hover:bg-[#333]">次へ</button>
          </div>
        </div>
      </div>
    </div>
  );
}
