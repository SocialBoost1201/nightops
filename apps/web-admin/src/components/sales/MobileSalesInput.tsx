'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronRight, AlertCircle, RotateCcw, Copy } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PriceItem {
  id: string;
  name: string;
  amount: number;
  chargeType: string;
}

interface SlipLine {
  itemId: string;
  name: string;
  quantity: number;
  amount: number;
}

interface FormState {
  tableNo: string;
  headcount: string;
  setType: 'set' | 'tc' | '';
  nominationType: 'honshimei' | 'baai' | 'free' | '';
  primaryCast: string;
  extension: '0' | '30' | '60' | '';
  options: string[];
  drinks: SlipLine[];
}

const EMPTY_FORM: FormState = {
  tableNo: '',
  headcount: '',
  setType: '',
  nominationType: '',
  primaryCast: '',
  extension: '',
  options: [],
  drinks: [],
};

const CAST_LIST = ['あんな', 'みほ', 'れいな', 'かな', 'さき', 'ゆり', 'はな', 'めい'];
const OPTION_LABELS: Record<string, string> = {
  p1: 'P1', p2: 'P2', sp1: 'SP1', sp2: 'SP2', sp3: 'SP3', sp4: 'SP4',
};
const OPTION_PRICES: Record<string, number> = {
  p1: 3000, p2: 5000, sp1: 8000, sp2: 10000, sp3: 12000, sp4: 15000,
};

const STEPS = ['tableNo', 'headcount', 'setType', 'nominationType', 'extension', 'options', 'drinks'] as const;
type Step = typeof STEPS[number];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const pattern = { light: [15], medium: [30], heavy: [50] }[type];
    navigator.vibrate(pattern);
  }
}

function useAnimatedNumber(target: number) {
  const [displayed, setDisplayed] = useState(target);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const start = displayed;
    const diff = target - start;
    if (diff === 0) return;
    const duration = 300;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + diff * ease));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return displayed;
}

// ─────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────

/** 入力済みカード（上部に圧縮表示） */
function CompletedChip({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-full text-xs font-medium text-gray-300 hover:border-gold-600 transition-colors active:scale-95"
    >
      <Check size={11} className="text-gold-500 shrink-0" />
      <span className="text-gray-500 text-[10px]">{label}</span>
      <span>{value}</span>
    </button>
  );
}

/** 待機中カード（未入力・半透明） */
function PendingCard({ step, stepIndex, currentIndex }: { step: string; stepIndex: number; currentIndex: number }) {
  const labels: Record<string, string> = {
    tableNo: '卓番号', headcount: '人数', setType: 'セット種別',
    nominationType: '指名', extension: '延長', options: 'オプション', drinks: 'ドリンク・ボトル',
  };
  return (
    <div
      className="flex items-center justify-between px-4 py-3 bg-[#111] border border-[#1E1E1E] rounded-xl text-gray-600 opacity-50"
    >
      <span className="text-sm">{stepIndex + 1}. {labels[step]}</span>
      <ChevronRight size={16} />
    </div>
  );
}

/** カスタムテンキー  */
function NumPad({ value, onChange, onNext, maxLen = 2 }: {
  value: string; onChange: (v: string) => void; onNext: () => void; maxLen?: number
}) {
  const press = (key: string) => {
    haptic('light');
    if (key === 'del') return onChange(value.slice(0, -1));
    if (key === 'next') return value ? onNext() : undefined;
    if (value.length >= maxLen) return;
    onChange(value + key);
  };

  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {['1','2','3','4','5','6','7','8','9','del','0','next'].map(k => (
        <button
          key={k}
          type="button"
          onPointerDown={() => press(k)}
          className={`h-14 rounded-xl text-lg font-medium select-none transition-all active:scale-95 
            ${k === 'next'
              ? 'bg-gold-600 text-white active:bg-gold-700 font-bold text-base'
              : k === 'del'
                ? 'bg-[#2A2A2A] text-gray-400 active:bg-[#333]'
                : 'bg-[#1E1E1E] text-gray-100 active:bg-[#2A2A2A]'
            }`}
        >
          {k === 'del' ? '⌫' : k === 'next' ? '次へ →' : k}
        </button>
      ))}
    </div>
  );
}

/** Quick Select Chips（セット種別・指名・延長） */
function ChipSelector<T extends string>({
  options, value, onChange
}: { options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onPointerDown={() => { haptic('light'); onChange(opt.value); }}
          className={`flex-1 min-w-[90px] py-4 rounded-xl text-base font-bold transition-all active:scale-95
            ${value === opt.value
              ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/30'
              : 'bg-[#1E1E1E] text-gray-400 border border-[#2A2A2A] hover:border-gold-600/50'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** スライドで保存ボタン */
function SlideToSubmit({ onSubmit, isSubmitting }: { onSubmit: () => void; isSubmitting: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [completed, setCompleted] = useState(false);
  const startXRef = useRef(0);

  const HANDLE_SIZE = 56;
  const getMaxOffset = () => (trackRef.current?.clientWidth ?? 300) - HANDLE_SIZE - 8;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX - offset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const newOffset = Math.max(0, Math.min(e.clientX - startXRef.current, getMaxOffset()));
    setOffset(newOffset);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    const max = getMaxOffset();
    if (offset > max * 0.85) {
      setCompleted(true);
      haptic('heavy');
      setOffset(max);
      setTimeout(() => { onSubmit(); setOffset(0); setCompleted(false); }, 400);
    } else {
      setOffset(0);
    }
  };

  const progress = Math.min(offset / (getMaxOffset() || 1), 1);

  return (
    <div
      ref={trackRef}
      className={`relative h-16 rounded-2xl overflow-hidden select-none transition-colors
        ${completed ? 'bg-green-700' : 'bg-[#1A1A1A] border border-[#2A2A2A]'}`}
    >
      {/* Progress fill */}
      <div
        className="absolute inset-0 bg-gold-600/20 transition-none"
        style={{ width: `${progress * 100}%` }}
      />
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`text-sm font-bold tracking-wider transition-opacity ${progress > 0.3 ? 'opacity-0' : 'opacity-100'}`}>
          {isSubmitting ? '保存中...' : '→ スライドして保存'}
        </span>
        {completed && (
          <span className="text-white font-bold tracking-wider">✓ 保存しました</span>
        )}
      </div>
      {/* Handle */}
      <div
        className="absolute top-1 left-1 h-14 w-14 rounded-xl bg-gold-600 flex items-center justify-center text-white font-bold text-xl shadow-lg cursor-grab active:cursor-grabbing touch-none"
        style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        →
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

interface Props {
  priceItems: PriceItem[];
  onSubmit: (data: FormState) => Promise<void>;
  recentSlips?: { tableNo: string; subtotal: number }[];
}

export function MobileSalesInput({ priceItems, onSubmit, recentSlips = [] }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [currentStep, setCurrentStep] = useState<Step>('tableNo');
  const [completedSteps, setCompletedSteps] = useState<Step[]>([]);
  const [errors, setErrors] = useState<Partial<Record<Step, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeField, setShakeField] = useState<Step | null>(null);
  const [lastForm, setLastForm] = useState<FormState | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<FormState[]>([]);
  const activeCardRef = useRef<HTMLDivElement>(null);

  // 小計の計算
  const subtotal = (() => {
    let s = 0;
    // オプション
    form.options.forEach(o => { s += OPTION_PRICES[o] ?? 0; });
    // ドリンク
    form.drinks.forEach(d => { s += d.amount * d.quantity; });
    return s;
  })();

  const animatedSubtotal = useAnimatedNumber(subtotal);

  // アクティブカードのスクロール
  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep]);

  // オフラインキューの定期送信
  useEffect(() => {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    const flush = async () => {
      const q = [...offlineQueue];
      setOfflineQueue([]);
      for (const slip of q) {
        try { await onSubmit(slip); } catch { setOfflineQueue(prev => [...prev, slip]); }
      }
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, [offlineQueue, onSubmit]);

  const shakeStep = useCallback((step: Step) => {
    haptic('heavy');
    setShakeField(step);
    setTimeout(() => setShakeField(null), 400);
  }, []);

  const advanceTo = (step: Step) => {
    haptic('light');
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    setCurrentStep(step);
  };

  const goBack = (step: Step) => {
    setCurrentStep(step);
    setCompletedSteps(prev => prev.filter(s => STEPS.indexOf(s) < STEPS.indexOf(step)));
  };

  const handleNumNext = (field: 'tableNo' | 'headcount') => {
    if (!form[field]) { shakeStep(field); return; }
    const nextStep = field === 'tableNo' ? 'headcount' : 'setType';
    advanceTo(nextStep as Step);
  };

  const handleChipSelect = <T extends string>(field: keyof FormState, value: T, nextStep: Step) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setTimeout(() => advanceTo(nextStep), 150);
  };

  const toggleOption = (opt: string) => {
    haptic('light');
    setForm(prev => ({
      ...prev,
      options: prev.options.includes(opt)
        ? prev.options.filter(o => o !== opt)
        : [...prev.options, opt],
    }));
  };

  const resetForm = () => {
    haptic('medium');
    setForm(EMPTY_FORM);
    setCurrentStep('tableNo');
    setCompletedSteps([]);
    setErrors({});
  };

  const loadLast = () => {
    if (!lastForm) return;
    haptic('light');
    setForm({ ...lastForm, tableNo: '' });
    setCurrentStep('tableNo');
    setCompletedSteps(['headcount', 'setType', 'nominationType', 'extension', 'options', 'drinks'] as Step[]);
  };

  const handleSubmit = async () => {
    if (!form.tableNo || !form.headcount) { shakeStep('tableNo'); return; }
    setIsSubmitting(true);
    try {
      if (navigator.onLine) {
        await onSubmit(form);
      } else {
        setOfflineQueue(prev => [...prev, form]);
      }
      setLastForm(form);
      resetForm();
    } catch {
      haptic('heavy');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ──────────────── アクティブカードのレンダリング ────────────────

  const renderActiveCard = (step: Step) => {
    const titles: Record<Step, string> = {
      tableNo: '卓番号', headcount: '人数', setType: 'セット種別',
      nominationType: '指名', extension: '延長', options: 'オプション', drinks: 'ドリンク・ボトル',
    };
    const stepIndex = STEPS.indexOf(step) + 1;

    return (
      <div
        ref={activeCardRef}
        key={step}
        className={`bg-[#141414] border rounded-2xl p-5 transition-all
          ${shakeField === step ? 'border-amber-500 animate-shake' : 'border-gold-600/30'}
        `}
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-gold-500 font-bold tracking-widest uppercase">{stepIndex} / {STEPS.length}</span>
        </div>
        <p className="text-xl font-bold text-white mb-2">{titles[step]}</p>

        {/* ─── tableNo ─── */}
        {step === 'tableNo' && (
          <>
            <div className="text-5xl font-mono font-bold text-white text-center py-4 min-h-[72px]">
              {form.tableNo || <span className="text-gray-700">—</span>}
            </div>
            <NumPad value={form.tableNo} onChange={v => setForm(p => ({ ...p, tableNo: v }))} onNext={() => handleNumNext('tableNo')} />
          </>
        )}

        {/* ─── headcount ─── */}
        {step === 'headcount' && (
          <>
            <div className="text-5xl font-mono font-bold text-white text-center py-4 min-h-[72px]">
              {form.headcount ? `${form.headcount} 名` : <span className="text-gray-700">—</span>}
            </div>
            <NumPad value={form.headcount} onChange={v => setForm(p => ({ ...p, headcount: v }))} onNext={() => handleNumNext('headcount')} maxLen={2} />
          </>
        )}

        {/* ─── setType ─── */}
        {step === 'setType' && (
          <ChipSelector<'set' | 'tc'>
            options={[{ value: 'set', label: 'セット' }, { value: 'tc', label: 'TC' }]}
            value={form.setType}
            onChange={(v) => handleChipSelect('setType', v, 'nominationType')}
          />
        )}

        {/* ─── nominationType ─── */}
        {step === 'nominationType' && (
          <>
            <ChipSelector<'honshimei' | 'baai' | 'free'>
              options={[
                { value: 'honshimei', label: '本指名' },
                { value: 'baai', label: '場内' },
                { value: 'free', label: 'フリー' },
              ]}
              value={form.nominationType}
              onChange={(v) => setForm(p => ({ ...p, nominationType: v }))}
            />
            {form.nominationType === 'honshimei' && (
              <div className="mt-4">
                <p className="text-xs text-gray-500 mb-2">担当キャストを選択</p>
                <div className="grid grid-cols-4 gap-2">
                  {CAST_LIST.map(cast => (
                    <button
                      key={cast}
                      type="button"
                      onPointerDown={() => {
                        haptic('light');
                        setForm(p => ({ ...p, primaryCast: cast }));
                        setTimeout(() => advanceTo('extension'), 200);
                      }}
                      className={`py-3 rounded-xl text-sm font-medium transition-all active:scale-95
                        ${form.primaryCast === cast
                          ? 'bg-gold-600 text-white'
                          : 'bg-[#1E1E1E] text-gray-300 border border-[#2A2A2A]'
                        }`}
                    >
                      {cast}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(form.nominationType === 'baai' || form.nominationType === 'free') && (
              <div className="mt-4">
                <button
                  type="button"
                  onPointerDown={() => advanceTo('extension')}
                  className="w-full py-4 bg-gold-600 text-white font-bold rounded-xl text-base active:scale-95 transition-all"
                >
                  次へ →
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── extension ─── */}
        {step === 'extension' && (
          <ChipSelector<'0' | '30' | '60'>
            options={[
              { value: '0', label: 'なし' },
              { value: '30', label: '30分' },
              { value: '60', label: '60分' },
            ]}
            value={form.extension}
            onChange={(v) => handleChipSelect('extension', v, 'options')}
          />
        )}

        {/* ─── options ─── */}
        {step === 'options' && (
          <>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {Object.entries(OPTION_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onPointerDown={() => toggleOption(key)}
                  className={`py-4 rounded-xl text-base font-bold transition-all active:scale-95
                    ${form.options.includes(key)
                      ? 'bg-gold-600 text-white shadow-lg shadow-gold-600/20'
                      : 'bg-[#1E1E1E] text-gray-400 border border-[#2A2A2A]'
                    }`}
                >
                  <div>{label}</div>
                  <div className="text-[10px] font-normal mt-0.5 opacity-70">¥{(OPTION_PRICES[key] ?? 0).toLocaleString()}</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onPointerDown={() => advanceTo('drinks')}
              className="w-full mt-4 py-4 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl text-gray-300 font-medium hover:border-gold-600/50 active:scale-95 transition-all"
            >
              ドリンクへ →
            </button>
          </>
        )}

        {/* ─── drinks ─── */}
        {step === 'drinks' && (
          <>
            <div className="space-y-2 mt-3 max-h-[240px] overflow-y-auto">
              {form.drinks.map((d, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#1E1E1E] rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-gray-200">{d.name}</span>
                  <span className="text-xs text-gray-500 font-mono">×{d.quantity}</span>
                  <span className="text-sm text-gold-400 font-mono">¥{(d.amount * d.quantity).toLocaleString()}</span>
                  <button
                    type="button"
                    onPointerDown={() => {
                      haptic('light');
                      setForm(prev => ({ ...prev, drinks: prev.drinks.filter((_, j) => j !== i) }));
                    }}
                    className="text-gray-600 hover:text-red-400 active:scale-90 transition-all"
                  >✕</button>
                </div>
              ))}
              {form.drinks.length === 0 && (
                <p className="text-center text-gray-600 text-sm py-4">追加なし</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 max-h-[180px] overflow-y-auto">
              {priceItems.filter(p => p.chargeType === 'item').map(item => (
                <button
                  key={item.id}
                  type="button"
                  onPointerDown={() => {
                    haptic('light');
                    setForm(prev => {
                      const exists = prev.drinks.findIndex(d => d.itemId === item.id);
                      if (exists >= 0) {
                        const updated = [...prev.drinks];
                        updated[exists] = { ...updated[exists], quantity: updated[exists].quantity + 1 };
                        return { ...prev, drinks: updated };
                      }
                      return { ...prev, drinks: [...prev.drinks, { itemId: item.id, name: item.name, quantity: 1, amount: item.amount }] };
                    });
                  }}
                  className="py-3 px-2 bg-[#1E1E1E] rounded-xl text-sm font-medium text-gray-300 border border-[#2A2A2A] hover:border-gold-600/50 active:scale-95 transition-all text-left"
                >
                  <div className="text-xs text-gray-400 truncate">{item.name}</div>
                  <div className="font-mono text-gold-500 text-sm">¥{item.amount.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ──────────────── レンダリング ────────────────

  const currentStepIndex = STEPS.indexOf(currentStep);
  const isAllComplete = completedSteps.length === STEPS.length || currentStep === 'drinks';

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] bg-[#0B0B0C] overflow-hidden select-none">

      {/* ── Sticky Header ────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-[#1E1E1E]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-600 uppercase tracking-widest">{new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
            <p className="text-[11px] text-green-500 font-medium">● 営業中</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-gray-500">小計</p>
            <p className="text-2xl font-mono font-bold text-gold-400">
              ¥{animatedSubtotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 入力済みチップ */}
        {completedSteps.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {form.tableNo && completedSteps.includes('tableNo') && (
              <CompletedChip label="卓" value={form.tableNo} onClick={() => goBack('tableNo')} />
            )}
            {form.headcount && completedSteps.includes('headcount') && (
              <CompletedChip label="人数" value={`${form.headcount}名`} onClick={() => goBack('headcount')} />
            )}
            {form.setType && completedSteps.includes('setType') && (
              <CompletedChip label="" value={form.setType === 'set' ? 'セット' : 'TC'} onClick={() => goBack('setType')} />
            )}
            {form.nominationType && completedSteps.includes('nominationType') && (
              <CompletedChip
                label=""
                value={form.nominationType === 'honshimei' ? `本指名:${form.primaryCast}` : form.nominationType === 'baai' ? '場内' : 'フリー'}
                onClick={() => goBack('nominationType')}
              />
            )}
            {form.extension !== '' && completedSteps.includes('extension') && (
              <CompletedChip label="延長" value={form.extension === '0' ? 'なし' : `${form.extension}分`} onClick={() => goBack('extension')} />
            )}
          </div>
        )}
      </div>

      {/* ── Main Input Area ────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {STEPS.map((step, index) => {
          if (completedSteps.includes(step)) return null; // チップで表示済み
          if (step === currentStep) return renderActiveCard(step);
          if (index > currentStepIndex) return <PendingCard key={step} step={step} stepIndex={index} currentIndex={currentStepIndex} />;
          return null;
        })}
      </div>

      {/* ── Sticky Footer ────────────────── */}
      <div className="shrink-0 px-4 pb-6 pt-3 border-t border-[#1E1E1E] space-y-3">

        {/* 警告バナー */}
        {Object.keys(errors).length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/30 border border-amber-700/50 rounded-xl text-amber-400 text-sm">
            <AlertCircle size={16} />
            <span>未入力の項目があります</span>
          </div>
        )}

        {/* オフラインキュー通知 */}
        {offlineQueue.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-700/50 rounded-xl text-blue-400 text-xs">
            <span>📡 オフライン: {offlineQueue.length}件の保存待ち</span>
          </div>
        )}

        {/* サブボタン */}
        <div className="flex gap-3">
          <button
            type="button"
            onPointerDown={resetForm}
            className="flex items-center gap-1.5 flex-1 justify-center py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 text-sm font-medium hover:border-gray-600 active:scale-95 transition-all"
          >
            <RotateCcw size={15} />クリア
          </button>
          <button
            type="button"
            onPointerDown={loadLast}
            disabled={!lastForm}
            className={`flex items-center gap-1.5 flex-1 justify-center py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-sm font-medium active:scale-95 transition-all
              ${lastForm ? 'text-gray-400 hover:border-gray-600' : 'text-gray-700 opacity-40 cursor-not-allowed'}`}
          >
            <Copy size={15} />前回コピー
          </button>
        </div>

        {/* Primary Action - Slide to Submit */}
        <SlideToSubmit onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
