'use client';

import { useState } from 'react';
import { Calculator, Download, CheckCircle, Mail, AlertTriangle } from 'lucide-react';

export default function PayrollPage() {
  const [targetMonth, setTargetMonth] = useState('2026-03');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // モックデータ
  const [payrollData] = useState([
    { id: 'pay_1', name: 'あんな', type: 'Cast', baseHourlyRules: 65, basePay: 162500, pointPay: 290000, penalty: 0, deduction: 15000, finalPay: 437500 },
    { id: 'pay_2', name: 'みほ', type: 'Cast', baseHourlyRules: 50, basePay: 125000, pointPay: 144000, penalty: 5000, deduction: 10000, finalPay: 254000 },
    { id: 'pay_3', name: 'れいな', type: 'Cast', baseHourlyRules: 80, basePay: 200000, pointPay: 240000, penalty: 0, deduction: 20000, finalPay: 420000 },
    { id: 'pay_4', name: '田中', type: 'Staff', baseHourlyRules: 160, basePay: 200000, pointPay: 0, penalty: 0, deduction: 25000, finalPay: 175000 },
  ]);

  const totalPay = payrollData.reduce((acc, curr) => acc + curr.finalPay, 0);

  const handleFinalize = async () => {
    if(!confirm(`${targetMonth}月分の給与データを確定し、ロックしますか？`)) return;
    setIsFinalizing(true);
    // モックネットワーク遅延
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsFinalized(true);
    setIsFinalizing(false);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Calculator className="text-gold-500" size={28} />
            給与明細・月次確定
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            勤怠と売上から算出された月間給与の集計・確認および確定処理を行います。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="month" 
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            disabled={isFinalized}
            className="bg-[#111] border border-gray-700 text-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      {isFinalized ? (
        <div className="bg-green-900/10 border border-green-800 rounded-xl p-6 mb-8 flex items-start gap-4 animate-in fade-in">
          <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-lg font-bold text-green-400 mb-1">{targetMonth}月度の給与データは確定済みです</h3>
            <p className="text-sm text-gray-400">データはロックされ、キャスト/スタッフのマイページに公開されました。</p>
            <div className="flex gap-3 mt-4">
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded text-sm transition-colors flex items-center gap-2">
                <Download size={16} /> 給与振込用CSV出力
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded text-sm transition-colors flex items-center gap-2">
                <Mail size={16} /> 全体へ追加通知
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-900/10 border border-amber-800/50 rounded-xl p-6 mb-8 flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={24} />
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-amber-500 mb-1">未確定のデータがあります</h3>
              <p className="text-sm text-gray-400">内容を確認し、問題がなければ「月次給与を確定」ボタンを押してください。</p>
            </div>
            <button 
              onClick={handleFinalize}
              disabled={isFinalizing}
              className={`px-6 py-3 font-semibold rounded-lg shadow-lg transition-all whitespace-nowrap ${
                isFinalizing 
                  ? 'bg-gold-800 text-gold-200 cursor-wait'
                  : 'bg-gold-600 text-white hover:bg-gold-500 shadow-gold-600/20 hover:scale-[1.02]'
              }`}
            >
              {isFinalizing ? '確定処理中...' : `${targetMonth}月の給与を確定(ロック)`}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">給与算出結果サマリ</h2>
          <span className="text-sm text-gray-400">総支給予定額: <span className="font-mono font-bold text-gold-400 text-lg ml-2">¥{totalPay.toLocaleString()}</span></span>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#2A2A2A] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-gray-700">対象者</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">労働時間</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">基本給(時給)</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">歩合・ポイント分</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">ペナルティ・控除</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">差引支給額</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-center">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {payrollData.map((data) => (
                <tr key={data.id} className="hover:bg-[#222] transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-200">{data.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{data.type}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-400 text-right">{data.baseHourlyRules}h</td>
                  <td className="px-6 py-4 font-mono text-gray-300 text-right">¥{data.basePay.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-green-400 text-right">+ ¥{data.pointPay.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-red-400 text-right">- ¥{(data.penalty + data.deduction).toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono font-bold text-gold-400 text-right">¥{data.finalPay.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-xs text-blue-400 hover:text-blue-300 underline">明細書</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-[#222] text-xs text-gray-500 flex justify-between">
          <p>※端数処理はマスタ設定の給与丸め規定に従い計算済です。</p>
        </div>
      </div>
    </div>
  );
}
