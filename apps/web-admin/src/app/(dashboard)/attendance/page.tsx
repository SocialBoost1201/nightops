'use client';

import { useState, useEffect } from 'react';
import { useAttendance, AttendanceRecord } from '@/hooks/useAttendance';
import { Clock, AlertCircle, CheckCircle2, Smartphone, Monitor } from 'lucide-react';
import { CastCheckoutModal } from '@/components/attendance/CastCheckoutModal';
import { MobileAttendance } from '@/components/attendance/MobileAttendance';


export default function AttendancePage() {
  const { attendance, isLoading, setCastCheckout } = useAttendance();
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [forceMobile, setForceMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showMobile = forceMobile !== null ? forceMobile : isMobile;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showMobile) {
    return (
      <div>
        <div className="flex justify-end px-4 pt-3">
          <button onClick={() => setForceMobile(false)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <Monitor size={13} />PC表示に切替
          </button>
        </div>
        <MobileAttendance />
      </div>
    );
  }

  const workingStaffCount = attendance.filter(a => a.userType === 'staff' && a.status === 'working').length;
  const workingCastCount = attendance.filter(a => a.userType === 'cast' && a.status === 'working').length;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">当日勤怠</h1>
          <p className="text-sm text-gray-400 mt-2">
            本日の出勤状況の確認と、キャストの退店（退勤）時間の入力を行います。
          </p>
        </div>
        <button
          onClick={() => setForceMobile(true)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 rounded-lg px-3 py-2 transition-colors shrink-0"
        >
          <Smartphone size={13} />キャスト退勤入力
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 font-medium">出勤中キャスト</p>
            <p className="text-3xl font-bold text-gray-100 mt-1">{workingCastCount}名</p>
          </div>
          <div className={`p-3 rounded-lg ${workingCastCount > 0 ? 'bg-amber-900/40 text-amber-500' : 'bg-green-900/20 text-green-500'}`}>
            <Clock size={28} />
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 font-medium">未退勤スタッフ</p>
            <p className="text-3xl font-bold text-gray-100 mt-1">{workingStaffCount}名</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-900/20 text-blue-500">
            <AlertCircle size={28} />
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#2A2A2A] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-gray-700">名前</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">種別</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">出勤</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">退店・退勤</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">ステータス</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    本日の出勤記録はありません
                  </td>
                </tr>
              ) : attendance.map((record) => (
                <tr key={record.id} className="hover:bg-[#222] transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-200">{record.displayName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium ${
                      record.userType === 'cast' ? 'bg-pink-900/30 text-pink-400 border border-pink-900' : 'bg-blue-900/30 text-blue-400 border border-blue-900'
                    }`}>
                      {record.userType === 'cast' ? 'キャスト' : 'スタッフ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-300">{record.checkInTime}</td>
                  <td className="px-6 py-4 font-mono text-gray-300">
                    {record.checkOutTime || <span className="text-gray-600">未入力</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {record.status === 'working' ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                          </span>
                          <span className="text-amber-400 font-medium">勤務中</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="text-green-500" />
                          <span className="text-green-500 font-medium">退勤済</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {record.userType === 'cast' && record.status === 'working' ? (
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="px-4 py-1.5 bg-gold-600/20 text-gold-500 hover:bg-gold-600 hover:text-white border border-gold-600/50 rounded transition-colors text-xs font-medium"
                      >
                        退店入力
                      </button>
                    ) : record.userType === 'staff' && record.status === 'working' ? (
                      <span className="text-xs text-gray-500">本人が打刻します</span>
                    ) : (
                      <span className="text-xs text-gray-600 pl-4">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <CastCheckoutModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSubmit={setCastCheckout}
        />
      )}
    </div>
  );
}
