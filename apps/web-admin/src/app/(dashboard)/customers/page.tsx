'use client';

import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, History, Settings2, Loader2, Link as MergeIcon } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useToast } from '@/components/ui/Toast';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Debounce search query to prevent spamming the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { customers, isLoading, createCustomer, getCustomerSummary, mergeCustomers } = useCustomers(debouncedSearch);
  const { success, error: showError } = useToast();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKana, setNewKana] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newMemo, setNewMemo] = useState('');

  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const handleOpenSummary = async (customer: any) => {
    setSelectedCustomer(customer);
    setLoadingSummary(true);
    try {
      const data = await getCustomerSummary(customer.id);
      setSummaryData(data);
    } catch {
      showError('詳細の取得に失敗しました');
      setSelectedCustomer(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCreate = async () => {
    if (!newName) return;
    setIsSubmitting(true);
    try {
      await createCustomer({ name: newName, nameKana: newKana, phone: newPhone, memo: newMemo } as any);
      success('顧客を登録しました');
      setShowCreateModal(false);
      setNewName('');
      setNewKana('');
      setNewPhone('');
      setNewMemo('');
    } catch {
      showError('登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) return;
    if (mergeSourceId === mergeTargetId) {
      showError('同じ顧客同士は統合できません');
      return;
    }
    
    const sourceName = customers.find((c: any) => c.id === mergeSourceId)?.name;
    const targetName = customers.find((c: any) => c.id === mergeTargetId)?.name;
    
    if (!confirm(`「${sourceName}」の全データを「${targetName}」に統合し、元のデータを削除します。元に戻せませんがよろしいですか？`)) return;
    
    setIsMerging(true);
    try {
      await mergeCustomers(mergeSourceId, mergeTargetId);
      success('統合が完了しました');
      setShowMergeModal(false);
      setMergeSourceId('');
      setMergeTargetId('');
    } catch {
      showError('統合に失敗しました');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Users className="text-gold-500" size={28} />
            顧客管理
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            店舗の顧客リスト、来店履歴、および重複データの統合を行います。
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowMergeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] text-gray-300 font-medium rounded-lg hover:bg-[#333] transition-colors border border-gray-700"
          >
            <Settings2 size={18} />
            重複データの統合
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white font-medium rounded-lg hover:bg-gold-500 transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            顧客を新規登録
          </button>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="顧客名や電話番号で検索..." 
              className="w-full pl-10 pr-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#2A2A2A] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-gray-700">顧客名</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">連絡先</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">メモ</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">登録日</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    該当する顧客が見つかりません
                  </td>
                </tr>
              ) : customers.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-[#222] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-200">{customer.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{customer.kana || '-'}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-400">{customer.phoneNumber || '-'}</td>
                  <td className="px-6 py-4 text-gray-400 max-w-[200px] truncate" title={customer.memo}>
                    {customer.memo || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenSummary(customer)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#222] text-gray-300 hover:text-gold-400 hover:bg-[#2A2A2A] border border-gray-700 rounded transition-colors text-xs font-medium"
                    >
                      <History size={14} /> 詳細・履歴
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl relative overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-100">
                <Users className="text-gold-500" />
                顧客詳細・履歴
              </h2>
              <button 
                onClick={() => { setSelectedCustomer(null); setSummaryData(null); }} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222] hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            {loadingSummary ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gold-500" size={32} />
              </div>
            ) : summaryData ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#222] border border-gray-800 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">お名前</p>
                    <p className="font-bold text-lg text-gray-100">{summaryData.customer.name}</p>
                    <p className="text-[10px] text-gray-400">{summaryData.customer.kana}</p>
                  </div>
                  <div className="bg-[#222] border border-gray-800 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">連絡先</p>
                    <p className="font-mono text-gray-300 font-medium">{summaryData.customer.phoneNumber || '未登録'}</p>
                  </div>
                  <div className="bg-[#222] border border-gray-800 p-4 rounded-lg flex flex-col justify-center">
                    <p className="text-xs text-gray-500 mb-1">累計来店</p>
                    <div className="flex items-baseline gap-2">
                      <p className="font-bold text-xl text-gray-100">{summaryData.visitCount} <span className="text-sm font-normal text-gray-400">回</span></p>
                    </div>
                  </div>
                  <div className="bg-[#222] border border-gray-800 p-4 rounded-lg flex flex-col justify-center">
                    <p className="text-xs text-gray-500 mb-1">累計売上</p>
                    <p className="font-bold text-xl text-gold-400">¥{summaryData.totalSpent.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-[#222] border border-gray-800 p-4 rounded-lg mb-6">
                  <p className="text-xs text-gray-500 mb-1">メモ</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{summaryData.customer.memo || 'メモなし'}</p>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-800 pb-2">直近の来店履歴 (最大10件)</h3>
                  <div className="overflow-hidden border border-gray-800 rounded-lg">
                    <table className="w-full text-sm text-left bg-[#1A1A1A]">
                      <thead className="bg-[#222] text-gray-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">来店日</th>
                          <th className="px-4 py-3 font-medium text-right">売上金額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {summaryData.recentVisits.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="px-4 py-6 text-center text-gray-500">来店履歴はありません</td>
                          </tr>
                        ) : summaryData.recentVisits.map((v: any) => (
                          <tr key={v.id} className="hover:bg-[#222] transition-colors">
                            <td className="px-4 py-3 text-gray-300">{new Date(v.businessDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right text-gold-400 font-mono">
                              ¥{v.totalRounded.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex justify-end border-t border-gray-800 pt-4">
              <button 
                onClick={() => { setSelectedCustomer(null); setSummaryData(null); }}
                className="px-6 py-2.5 bg-[#2A2A2A] hover:bg-[#333] border border-gray-700 rounded-lg text-sm font-medium text-gray-300 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新規顧客登録モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-gray-100 mb-6">顧客を新規登録</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">顧客名 (必須)</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500" placeholder="例: 佐藤 健太" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">フリガナ</label>
                  <input type="text" value={newKana} onChange={e => setNewKana(e.target.value)} className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500" placeholder="サトウ ケンタ" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">連絡先 / 電話番号</label>
                  <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500" placeholder="090-0000-0000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">メモ (任意)</label>
                <textarea rows={3} value={newMemo} onChange={e => setNewMemo(e.target.value)} className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500" placeholder="好みのお酒や注意事項など" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-transparent border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition-colors" disabled={isSubmitting}>キャンセル</button>
              <button onClick={handleCreate} disabled={!newName || isSubmitting} className="flex items-center gap-2 px-6 py-2 bg-gold-600 hover:bg-gold-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                登録する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 名寄せ（統合）モーダル */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2 mb-2">
              <MergeIcon className="text-gold-500" size={24} />
              重複データの統合
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              重複して登録された顧客情報を一つにまとめます。統合元のデータは削除され、統合先の売上履歴として合算されます。
            </p>
            
            <div className="space-y-6 mb-6">
              <div className="bg-red-900/10 border border-red-900/40 p-4 rounded-lg">
                <label className="block text-sm font-medium text-red-400 mb-2">① 統合元 (消去されるデータ)</label>
                <select value={mergeSourceId} onChange={e => setMergeSourceId(e.target.value)} className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-500">
                  <option value="">顧客を選択してください...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phoneNumber ? `(${c.phoneNumber})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center -my-2 text-gray-600">
                <span>▼</span>
              </div>

              <div className="bg-emerald-900/10 border border-emerald-900/40 p-4 rounded-lg">
                <label className="block text-sm font-medium text-emerald-400 mb-2">② 統合先 (残すデータ)</label>
                <select value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                  <option value="">顧客を選択してください...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phoneNumber ? `(${c.phoneNumber})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button onClick={() => setShowMergeModal(false)} className="px-4 py-2 bg-transparent border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition-colors" disabled={isMerging}>キャンセル</button>
              <button 
                onClick={handleMerge} 
                disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId || isMerging} 
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMerging && <Loader2 size={16} className="animate-spin" />}
                実行する（元に戻せません）
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
