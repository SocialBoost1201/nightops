'use client';

import { useState } from 'react';
import { useSales, SalesSlip } from '@/hooks/useSales';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { Receipt, Search, Edit2, Trash2, X, Clock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SalesSlipsPage() {
  const { slips, isLoading, mutateSlips } = useSales();
  const { success, error: showError } = useToast();
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<SalesSlip | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesSlip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editHeadcount, setEditHeadcount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const filtered = slips.filter(s =>
    s.customerName.includes(search) || s.primaryCastName?.includes(search) || false
  );

  const openEdit = (slip: SalesSlip) => {
    setEditTarget(slip);
    setEditHeadcount(slip.headcount);
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setIsSaving(true);
    try {
      await apiClient.put(`/sales/slips/${editTarget.id}`, { headcount: editHeadcount });
      success('伝票を更新しました');
      mutateSlips();
      setEditTarget(null);
    } catch {
      showError('伝票の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/sales/slips/${deleteTarget.id}`);
      success('伝票を削除しました');
      mutateSlips();
      setDeleteTarget(null);
    } catch {
      showError('伝票の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/sales" className="text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Receipt className="text-gold-500" size={26} />
              売上伝票一覧
            </h1>
          </div>
          <p className="text-sm text-gray-400">本日入力済みの伝票を確認・修正・削除できます。</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="顧客名・キャスト名で検索..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: '本日の伝票数', value: `${slips.length}件`, icon: <Receipt size={16} />, color: 'text-gray-200' },
          { label: '精算済み', value: `${slips.filter(s => s.status === 'closed').length}件`, icon: <CheckCircle2 size={16} />, color: 'text-emerald-400' },
          { label: '未精算', value: `${slips.filter(s => s.status === 'open').length}件`, icon: <AlertTriangle size={16} />, color: 'text-amber-400' },
        ].map(item => (
          <div key={item.label} className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold flex items-center gap-1.5 ${item.color}`}>
              {item.icon}{item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            {search ? '検索結果がありません' : '本日の伝票はまだありません'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-[#222] text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 font-medium">顧客名</th>
                  <th className="px-5 py-3.5 font-medium">担当キャスト</th>
                  <th className="px-5 py-3.5 font-medium text-center">人数</th>
                  <th className="px-5 py-3.5 font-medium text-right">小計</th>
                  <th className="px-5 py-3.5 font-medium text-center">状態</th>
                  <th className="px-5 py-3.5 font-medium text-right">入力時刻</th>
                  <th className="px-5 py-3.5 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(slip => (
                  <tr key={slip.id} className="hover:bg-[#222]/60 transition-colors group">
                    <td className="px-5 py-3.5 font-medium text-gray-200">{slip.customerName}</td>
                    <td className="px-5 py-3.5 text-gray-400">{slip.primaryCastName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-gray-300">{slip.headcount}名</td>
                    <td className="px-5 py-3.5 text-right font-mono text-gold-400">¥{slip.subtotal.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-center">
                      {slip.status === 'open'
                        ? <span className="px-2 py-0.5 bg-amber-900/20 text-amber-400 border border-amber-800/40 rounded text-[10px] font-medium">未精算</span>
                        : <span className="px-2 py-0.5 bg-emerald-900/20 text-emerald-400 border border-emerald-800/40 rounded text-[10px] font-medium">精算済</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-500 text-xs">
                      <span className="inline-flex items-center gap-1"><Clock size={11} />{slip.createdAt}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(slip)}
                          className="p-1.5 bg-[#2A2A2A] hover:bg-[#333] border border-gray-700 rounded text-gray-400 hover:text-gold-400 transition-colors"
                          title="修正"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(slip)}
                          className="p-1.5 bg-[#2A2A2A] hover:bg-red-900/30 border border-gray-700 hover:border-red-800/50 rounded text-gray-400 hover:text-red-400 transition-colors"
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <Edit2 size={18} className="text-gold-500" />伝票を修正
              </h2>
              <button onClick={() => setEditTarget(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222] hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-[#222] p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-0.5">顧客名</p>
                <p className="font-medium text-gray-200">{editTarget.customerName}</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">人数</label>
                <input
                  type="number"
                  min={1}
                  value={editHeadcount}
                  onChange={e => setEditHeadcount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-3 bg-[#222] border border-gray-700 text-gray-400 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-red-900/20 border border-red-800/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-100 mb-1">この伝票を削除しますか？</h3>
              <p className="text-sm text-gray-400">{deleteTarget.customerName} の伝票を削除します。この操作は元に戻せません。</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-[#222] border border-gray-700 text-gray-400 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
