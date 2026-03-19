import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";

export function FeatureSection() {
  const features = [
    {
      id: "01",
      title: "給与計算の完全自動化",
      description: "同伴バック、本指名バック、場内バック、ドリンク、そしてペナルティ控除。現場ごとの複雑で難解な給与ルールを初回の『設定代行』でシステム化。あとは毎晩1クリックで、1円のズレもなく全キャストの給与明細が自動生成されます。",
      icon: "⚡️",
    },
    {
      id: "02",
      title: "売上・利益のリアルタイム可視化",
      description: "店舗にいなくても、スマホを開けば「今日の売上動向」「誰がどれだけ稼いでいるか」「想定される人件費と粗利」が瞬時にグラフィカルに可視化。勘に頼る経営から、データ駆動の強いビジネスへの移行を実現します。",
      icon: "📊",
    },
    {
      id: "03",
      title: "不正防止の強固な監査ログ",
      description: "現金精算時のズレや、悪意ある伝票の書き換え。NightOpsでは「誰が・いつ・どの伝票を修正したか」の操作ログを完全に保存し、ボーイや責任者の権限を細かく制限可能。内部不正や見えない赤字の発生を元から断ち切ります。",
      icon: "🛡️",
    }
  ];

  return (
    <AnimatedSection className="bg-[#05080f] py-24 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedDiv className="text-center mb-16">
          <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">
            FEATURES
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            損失をゼロにする、3つの強力な機能
          </h2>
        </AnimatedDiv>

        <div className="space-y-16 lg:space-y-24">
          {features.map((feature, idx) => (
            <AnimatedDiv key={feature.id} delay={0.2 * (idx + 1)}>
              <div className={`flex flex-col lg:flex-row gap-8 lg:gap-16 items-center ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                
                {/* Text Content */}
                <div className="w-full lg:w-1/2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-900/30 text-blue-400 font-bold text-xl mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    {feature.id}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    {feature.title}
                    <span className="text-2xl">{feature.icon}</span>
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {feature.description}
                  </p>
                </div>

                {/* Mockup / Visual Area */}
                <div className="w-full lg:w-1/2 relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-purple-600/10 rounded-2xl blur-xl" />
                  <div className="relative glass-panel rounded-2xl p-8 h-64 flex flex-col items-center justify-center border border-gray-700/50 shadow-2xl">
                    <p className="text-gray-500 font-medium mb-4">[UI Mockup: {feature.title}]</p>
                    <div className="w-full max-w-sm h-4 bg-gray-800 rounded-full overflow-hidden">
                       <div className="w-3/4 h-full bg-blue-500/50 rounded-full" />
                    </div>
                    <div className="w-full max-w-sm h-4 bg-gray-800 rounded-full overflow-hidden mt-2">
                       <div className="w-1/2 h-full bg-blue-500/30 rounded-full" />
                    </div>
                  </div>
                </div>

              </div>
            </AnimatedDiv>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
