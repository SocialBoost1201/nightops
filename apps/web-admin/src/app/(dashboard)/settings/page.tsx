'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Save, Trash2, Percent, Calculator, Info } from 'lucide-react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';

type Tab = 'accounting' | 'price' | 'compensation';

export default function MasterSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('accounting');
  const { settings, isLoading } = useStoreSettings();
  const { success, error: showError } = useToast();

  // 会計設定フォームのローカルstate
  const [taxRate, setTaxRate] = useState(10);          // 表示用: % 整数
  const [serviceRate, setServiceRate] = useState(20);   // 表示用: % 整数
  const [roundingUnit, setRoundingUnit] = useState(1000);
  const [roundingThreshold, setRoundingThreshold] = useState(500);
  const [isSaving, setIsSaving] = useState(false);

  // StoreSettingsがロードされたらフォームに反映
  useEffect(() => {
    if (!isLoading) {
      setTaxRate(Math.round(settings.taxRate * 100));
      setServiceRate(Math.round(settings.serviceRate * 100));
      setRoundingUnit(settings.roundingUnit);
      setRoundingThreshold(settings.roundingThreshold);
    }
  }, [isLoading, settings]);

  const totalRate = taxRate + serviceRate;
  const previewSubtotal = 10000;
  const previewRaw = Math.floor(previewSubtotal * (1 + taxRate / 100 + serviceRate / 100));
  const previewRounded = Math.floor((previewRaw + (roundingUnit - roundingThreshold)) / roundingUnit) * roundingUnit;

  const handleSaveAccounting = async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/master/settings', {
        taxRate: taxRate / 100,
        serviceRate: serviceRate / 100,
        roundingUnit,
        roundingThreshold,
      });
      success('会計設定を保存しました');
    } catch {
      showError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 仮のステート (MVP用)
  const [priceItems, setPriceItems] = useState([
    { id: '1', name: 'SET 60分', type: 'hourly', amount: 8000 },
    { id: '2', name: '本指名', type: 'fixed', amount: 3000 },
    { id: '3', name: 'キャストドリンク', type: 'item', amount: 1000 },
  ]);

  const [compPlans] = useState([
    { id: '1', name: '基本 キャスト給与', baseHourlyRate: 2500, pointRate: 0.1 },
    { id: '2', name: '幹部 キャスト給与', baseHourlyRate: 3500, pointRate: 0.15 },
  ]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'accounting',    label: '会計設定' },
    { id: 'price',         label: 'メニュー・料金表' },
    { id: 'compensation',  label: '給与ルール' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Settings className="text-gold-500" size={28} />
          マスタ設定
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          店舗の会計ルール・メニュー料金・キャスト給与計算ルールを設定します。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#222]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 会計設定タブ ── */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 bg-[#222] flex items-center gap-2">
              <Percent size={16} className="text-gold-400" />
              <h2 className="font-semibold text-gray-200">消費税・サービスチャージ設定</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 消費税 */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    消費税率（%）
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={taxRate}
                      onChange={e => setTaxRate(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-xl text-gray-200 text-lg font-mono focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">日本の標準消費税率は 10%</p>
                </div>

                {/* サービスチャージ */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    サービスチャージ（%）
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={serviceRate}
                      onChange={e => setServiceRate(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-xl text-gray-200 text-lg font-mono focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 pr-10"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">アニモの場合: 20%（店舗ごとに設定）</p>
                </div>
              </div>

              {/* 合算表示 */}
              <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  合計課税率（消費税 + SC）
                </div>
                <div className="text-xl font-bold font-mono text-gold-400">
                  {totalRate}%
                </div>
              </div>
            </div>
          </div>

          {/* 丸め設定 */}
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 bg-[#222] flex items-center gap-2">
              <Calculator size={16} className="text-gold-400" />
              <h2 className="font-semibold text-gray-200">丸め設定</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    丸め単位（円）
                  </label>
                  <select
                    value={roundingUnit}
                    onChange={e => setRoundingUnit(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-xl text-gray-200 focus:outline-none focus:border-gold-500"
                  >
                    <option value={100}>100円単位</option>
                    <option value={500}>500円単位</option>
                    <option value={1000}>1,000円単位</option>
                    <option value={5000}>5,000円単位</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-1">計算後の金額を切り上げる単位</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    切り上げ閾値（円）
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={roundingUnit}
                    step={1}
                    value={roundingThreshold}
                    onChange={e => setRoundingThreshold(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#111] border border-gray-700 rounded-xl text-gray-200 font-mono focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30"
                  />
                  <p className="text-xs text-gray-600 mt-1">この値以上で次の単位に切り上げ（通常は単位の半分）</p>
                </div>
              </div>

              {/* プレビュー */}
              <div className="bg-[#0F0F0F] border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800">
                  <Info size={13} className="text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">計算プレビュー（小計 ¥10,000 の場合）</span>
                </div>
                <div className="divide-y divide-gray-800">
                  <div className="flex justify-between items-center px-5 py-2.5 text-sm">
                    <span className="text-gray-500">小計</span>
                    <span className="font-mono text-gray-400">¥10,000</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-2.5 text-sm">
                    <span className="text-gray-500">税込合計（{totalRate}%加算・端数前）</span>
                    <span className="font-mono text-gray-400">¥{previewRaw.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3 bg-[#1A1A1A]">
                    <span className="font-semibold text-gray-200">お会計（{roundingUnit.toLocaleString()}円単位丸め）</span>
                    <span className="font-mono font-bold text-lg text-gold-400">¥{previewRounded.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveAccounting}
              disabled={isSaving}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm tracking-wide transition-all ${
                isSaving
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gold-600 text-white hover:bg-gold-500 shadow-lg shadow-gold-600/20 active:scale-[0.98]'
              }`}
            >
              <Save size={16} />
              {isSaving ? '保存中...' : '会計設定を保存する'}
            </button>
          </div>
        </div>
      )}

      {/* ── 料金表タブ ── */}
      {activeTab === 'price' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">料金設定</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gold-600/20 text-gold-500 hover:bg-gold-600 hover:text-white border border-gold-600/50 rounded transition-colors text-sm font-medium">
              <Plus size={16} /> 項目を追加
            </button>
          </div>
          <div className="p-6 space-y-4">
            {priceItems.map(item => (
              <div key={item.id} className="flex flex-col md:flex-row gap-4 items-center p-4 bg-[#111] border border-gray-800 rounded-lg group">
                <div className="w-full md:w-1/3">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">名称</label>
                  <input type="text" defaultValue={item.name} className="w-full px-3 py-2 bg-[#222] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">課金タイプ</label>
                  <select defaultValue={item.type} className="w-full px-3 py-2 bg-[#222] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gold-500">
                    <option value="hourly">時間課金 (Hourly)</option>
                    <option value="fixed">固定費 (Fixed)</option>
                    <option value="item">単品 (Item)</option>
                  </select>
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">単価(円)</label>
                  <input type="number" defaultValue={item.amount} className="w-full px-3 py-2 bg-[#222] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div className="w-full md:w-auto flex items-center gap-2 mt-4 md:mt-0 flex-1 justify-end">
                  <button className="p-2 text-gray-400 hover:text-green-500 transition-colors" title="保存"><Save size={18} /></button>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="削除"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 給与ルールタブ ── */}
      {activeTab === 'compensation' && (
        <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-gray-800 bg-[#222] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-200">報酬プラン設定</h2>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gold-600/20 text-gold-500 hover:bg-gold-600 hover:text-white border border-gold-600/50 rounded transition-colors text-sm font-medium">
              <Plus size={16} /> プランを追加
            </button>
          </div>
          <div className="p-6 space-y-4">
            {compPlans.map(plan => (
              <div key={plan.id} className="flex flex-col md:flex-row gap-4 items-center p-4 bg-[#111] border border-gray-800 rounded-lg group">
                <div className="w-full md:w-1/3">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">プラン名称</label>
                  <input type="text" defaultValue={plan.name} className="w-full px-3 py-2 bg-[#222] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">基本時給 (円)</label>
                  <input type="number" defaultValue={plan.baseHourlyRate} className="w-full px-3 py-2 bg-[#222] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div className="w-full md:w-1/4">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">ポイント還元率</label>
                  <input type="number" step="0.01" defaultValue={plan.pointRate} className="w-full px-3 py-2 bg-[#222] border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-gold-500" />
                </div>
                <div className="w-full md:w-auto flex items-center gap-2 mt-4 md:mt-0 flex-1 justify-end">
                  <button className="p-2 text-gray-400 hover:text-green-500 transition-colors" title="保存"><Save size={18} /></button>
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="削除"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
