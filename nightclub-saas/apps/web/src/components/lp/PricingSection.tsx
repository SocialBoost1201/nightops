import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";
import { ButtonCta } from "./ui/ButtonCta";

export function PricingSection() {
  const plans = [
    {
      name: "Lite",
      price: "19,800",
      description: "小規模店舗・お試し利用向け",
      features: ["キャスト15名まで", "基本の売上・勤怠管理", "明細発行・分析機能なし"],
      recommended: false,
    },
    {
      name: "Standard",
      price: "39,800",
      description: "単独店舗の完全形。利益最大化",
      features: ["キャスト登録無制限", "給与明細の自動発行", "シフトLINE収集", "高度分析・権限管理"],
      recommended: true,
    },
    {
      name: "Pro",
      price: "79,800",
      description: "多店舗展開・グループ一括管理",
      features: ["最大3店舗まで包含", "全店舗横断ダッシュボード", "キャストヘルプ移動計算", "給与・売上API解放"],
      recommended: false,
    }
  ];

  return (
    <AnimatedSection className="bg-[#05080f] py-24 border-y border-gray-800">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <AnimatedDiv>
          <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">
            PRICING
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
            投資効果の明確な料金体系
          </h2>
          <p className="text-gray-400">
            店長様の人件費削減と、計算ミスによる数万円の損失防止効果に比べれば、<br className="hidden md:block" />
            Standardプランは1ヶ月で容易に回収可能なシステム投資です。
          </p>
        </AnimatedDiv>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, idx) => (
          <AnimatedDiv key={plan.name} delay={0.1 * (idx + 1)}>
            <div className={`relative h-full glass-panel rounded-2xl p-8 border flex flex-col ${plan.recommended ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)] transform md:-translate-y-4 bg-blue-900/10' : 'border-gray-800'}`}>
              
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Recommended
                </div>
              )}

              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm mb-6 h-10">{plan.description}</p>
              
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">¥{plan.price}</span>
                <span className="text-gray-500 text-sm"> / 月</span>
              </div>

              <ul className="mb-8 space-y-4 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-300">
                    <span className="text-blue-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <ButtonCta href="#contact" className={`w-full py-3 px-0 text-sm ${plan.recommended ? '' : 'bg-gray-800 text-white hover:bg-gray-700 shadow-none'}`}>
                  14日間無料で試す
                </ButtonCta>
              </div>

            </div>
          </AnimatedDiv>
        ))}
      </div>
    </AnimatedSection>
  );
}
