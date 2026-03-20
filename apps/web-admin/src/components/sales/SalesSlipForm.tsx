'use client';

import { useState, useMemo } from 'react';
import { PriceItem } from '@/hooks/useSales';
import { useStoreSettings, calcSlip } from '@/hooks/useStoreSettings';
import { Plus, Trash2, Calculator, FileText } from 'lucide-react';

interface Props {
  priceItems: PriceItem[];
  onSubmit: (data: any) => Promise<void>;
}

export function SalesSlipForm({ priceItems, onSubmit }: Props) {
  const { settings } = useStoreSettings();

  const [customerName, setCustomerName] = useState('');
  const [headcount, setHeadcount] = useState(1);
  const [primaryCastId, setPrimaryCastId] = useState('cast_1');
  const [lines, setLines] = useState<{ id: string; itemId: string; quantity: number; amount: number }[]>([
    { id: 'initial_1', itemId: '', quantity: 1, amount: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Doc-23 準拠の計算 ─────────────────────────────────────
  const subtotal = useMemo(
    () => lines.reduce((acc, line) => acc + line.amount * line.quantity, 0),
    [lines]
  );

  const { rawTotal, totalRounded } = useMemo(
    () => calcSlip(subtotal, settings),
    [subtotal, settings]
  );

  const serviceCharge = rawTotal - subtotal; // 奉仕料 + 税
  // ──────────────────────────────────────────────────────────

  const handleAddItem = () =>
    setLines([...lines, { id: Math.random().toString(), itemId: '', quantity: 1, amount: 0 }]);

  const handleRemoveItem = (id: string) => {
    if (lines.length > 1) setLines(lines.filter(l => l.id !== id));
  };

  const handleItemSelect = (id: string, itemId: string) => {
    const item = priceItems.find(p => p.id === itemId);
    setLines(lines.map(l => l.id === id ? { ...l, itemId, amount: item?.unitPrice ?? 0 } : l));
  };

  const handleQuantityChange = (id: string, qty: number) =>
    setLines(lines.map(l => l.id === id ? { ...l, quantity: Math.max(1, qty) } : l));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || lines.some(l => !l.itemId)) return;
    setIsSubmitting(true);
    await onSubmit({
      customerName,
      headcount,
      primaryCastId,
      subtotal,
      totalRounded,
      lines: lines.map(l => ({ itemId: l.itemId, quantity: l.quantity, amount: l.amount })),
    });
    setCustomerName('');
    setHeadcount(1);
    setLines([{ id: Math.random().toString(), itemId: '', quantity: 1, amount: 0 }]);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-gray-800 bg-[#222] flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <Calculator className="text-gold-500" size={18} />
          新規伝票入力
        </h3>
        <span className="text-[10px] text-gray-600 bg-[#1A1A1A] border border-gray-800 px-2 py-0.5 rounded">
          SC {Math.round(settings.serviceRate * 100)}% + 税 {Math.round(settings.taxRate * 100)}%
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* 基本情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">顧客名</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="顧客名を入力..."
              className="w-full px-3 py-2.5 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">人数</label>
            <input
              type="number"
              min="1"
              required
              value={headcount}
              onChange={e => setHeadcount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">担当キャスト</label>
            <select
              value={primaryCastId}
              onChange={e => setPrimaryCastId(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            >
              <option value="cast_1">あんな</option>
              <option value="cast_2">みほ</option>
              <option value="cast_3">れいな</option>
            </select>
          </div>
        </div>

        {/* 明細 */}
        <div className="border-t border-gray-800 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">明細・ドリンク</h4>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A2A2A] hover:bg-[#333] border border-gray-700 text-xs text-gray-300 rounded-lg transition-colors"
            >
              <Plus size={13} />行を追加
            </button>
          </div>

          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={line.id} className="flex flex-col sm:flex-row gap-2 items-end p-3 bg-[#111] border border-gray-800 rounded-lg group">
                <div className="flex-1 w-full">
                  {index === 0 && <label className="block text-[10px] text-gray-600 uppercase mb-1">項目</label>}
                  <select
                    required
                    value={line.itemId}
                    onChange={e => handleItemSelect(line.id, e.target.value)}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500"
                  >
                    <option value="">選択...</option>
                    {priceItems.map(item => (
                      <option key={item.id} value={item.id}>{item.itemName} (¥{item.unitPrice.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-20">
                  {index === 0 && <label className="block text-[10px] text-gray-600 uppercase mb-1">数量</label>}
                  <input
                    type="number"
                    min="1"
                    required
                    value={line.quantity}
                    onChange={e => handleQuantityChange(line.id, parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-sm text-center text-gray-200 focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div className="w-full sm:w-28 text-right">
                  {index === 0 && <label className="block text-[10px] text-gray-600 uppercase mb-1">金額</label>}
                  <div className="py-2 px-3 bg-black/40 border border-gray-800 rounded-lg text-sm text-gray-300 font-mono">
                    ¥{(line.amount * line.quantity).toLocaleString()}
                  </div>
                </div>
                <div className="sm:w-8 flex justify-end">
                  {index === 0 && <div className="hidden sm:block text-[10px] mb-1">&nbsp;</div>}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(line.id)}
                    disabled={lines.length === 1}
                    className="p-2 text-gray-600 hover:text-red-400 disabled:opacity-20 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 計算パネル（Doc-23準拠） */}
        <div className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
          <div className="divide-y divide-gray-800">
            <div className="flex justify-between items-center px-5 py-3 text-sm">
              <span className="text-gray-400">小計</span>
              <span className="font-mono text-gray-300">¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3 text-sm">
              <span className="text-gray-400">奉仕料・消費税 ({Math.round((settings.serviceRate + settings.taxRate) * 100)}%)</span>
              <span className="font-mono text-gray-400">¥{serviceCharge.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3 text-sm">
              <span className="text-gray-400">税込合計（端数前）</span>
              <span className="font-mono text-gray-300">¥{rawTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-3.5 bg-[#1A1A1A]">
              <span className="font-semibold text-gray-200">お会計（{settings.roundingUnit.toLocaleString()}円単位丸め）</span>
              <span className="font-mono font-bold text-xl text-gold-400">¥{totalRounded.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-800 bg-[#1A1A1A] flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-7 py-2.5 rounded-lg font-semibold tracking-wide transition-all text-sm ${
            isSubmitting
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gold-600 text-white hover:bg-gold-500 shadow-lg shadow-gold-600/20 active:scale-[0.98]'
          }`}
        >
          <FileText size={15} />
          {isSubmitting ? '保存中...' : '伝票を作成する'}
        </button>
      </div>
    </form>
  );
}
