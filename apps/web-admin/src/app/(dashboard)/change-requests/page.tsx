'use client';

import { useState } from 'react';
import { FileEdit, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ChangeRequestsPage() {
  const [requests] = useState([
    { id: 'cr_1', type: 'SHIFT_CHANGE', status: 'PENDING', applicant: 'あんな (Cast)', date: '2026-04-15', details: '出勤を休みに変更希望', reason: '家庭の事情のため', submittedAt: '2時間前' },
    { id: 'cr_2', type: 'ATTENDANCE_CORRECTION', status: 'PENDING', applicant: '田中 (Staff)', date: '2026-03-17', details: '退勤打刻漏れ: 正しい時間は23:30', reason: 'システムエラーにより打刻できず', submittedAt: '5時間前' },
    { id: 'cr_3', type: 'SHIFT_CHANGE', status: 'APPROVED', applicant: 'みほ (Cast)', date: '2026-04-01', details: '休みを出勤に変更希望', reason: '予定が空いたため', submittedAt: '1日前' },
    { id: 'cr_4', type: 'SALES_CORRECTION', status: 'REJECTED', applicant: '店長 (Manager)', date: '2026-03-10', details: '伝票slip_123の金額修正 45000→40000', reason: '割引適用の入力忘れ', submittedAt: '3日前' },
  ]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <FileEdit className="text-gold-500" size={28} />
          修正申請（承認待ちタスク）
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          キャストやスタッフから提出されたシフト変更や打刻漏れの修正申請を承認・却下します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1A1A1A] p-5 rounded-xl border border-gray-800 flex flex-col justify-center">
          <span className="text-sm text-gray-400 mb-1">未承認 (Pending)</span>
          <span className="text-3xl font-bold text-amber-500">2 件</span>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 bg-[#222] flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-200">申請一覧</h2>
          <select className="bg-[#111] border border-gray-700 text-gray-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-gold-500">
            <option value="ALL">すべてのステータス</option>
            <option value="PENDING">未承認</option>
            <option value="APPROVED">承認済み</option>
            <option value="REJECTED">却下</option>
          </select>
        </div>

        <div className="divide-y divide-gray-800">
          {requests.map(req => (
            <div key={req.id} className="p-5 hover:bg-[#222] transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className={`mt-1 flex-shrink-0 ${
                  req.status === 'PENDING' ? 'text-amber-500' :
                  req.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {req.status === 'PENDING' && <Clock size={20} />}
                  {req.status === 'APPROVED' && <CheckCircle size={20} />}
                  {req.status === 'REJECTED' && <XCircle size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-300 text-[10px] rounded border border-gray-700">
                      {req.type === 'SHIFT_CHANGE' ? 'シフト変更' : req.type === 'ATTENDANCE_CORRECTION' ? '勤怠修正' : '売上修正'}
                    </span>
                    <span className="font-medium text-gray-200">{req.applicant}</span>
                    <span className="text-xs text-gray-500">{req.submittedAt}</span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium">対象日: {req.date}</p>
                  <p className="text-sm text-gold-400 mt-1">{req.details}</p>
                  <p className="text-xs text-gray-500 mt-1">理由: {req.reason}</p>
                </div>
              </div>

              {req.status === 'PENDING' && (
                <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-gray-800 md:border-none">
                  <button className="flex-1 md:flex-none px-4 py-2 bg-[#2A2A2A] text-gray-300 hover:text-red-400 hover:bg-[#333] border border-gray-700 rounded text-sm transition-colors">
                    却下
                  </button>
                  <button className="flex-1 md:flex-none px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white font-medium rounded text-sm transition-colors shadow-sm">
                    承認する
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
