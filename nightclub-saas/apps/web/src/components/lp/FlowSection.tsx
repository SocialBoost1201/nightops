import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";

export function FlowSection() {
  const steps = [
    { number: "01", title: "お申し込み（無料トライアル）", desc: "クレジットカード登録は不要です。まずは14日間の無料アカウントを発行。" },
    { number: "02", title: "初期設定・給与ルール構築", desc: "【完全無料代行】専任スタッフが店舗の複雑な給与計算ルールをヒアリングし、システムへ設定代行します。" },
    { number: "03", title: "キャスト情報の登録", desc: "スタッフとキャストを登録。Excel形式での一括インポートにも対応しています。" },
    { number: "04", title: "運用開始・日次締め", desc: "初日の締め作業時にはオンラインでサポート。以後は自動で正確な計算が行われます。" }
  ];

  return (
    <AnimatedSection className="bg-[#0A0E17] py-24">
      <div className="max-w-4xl mx-auto px-4">
        
        <AnimatedDiv className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-6">
            「ITが苦手でも、確実に運用に乗る」導入フロー
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            システム移行最大の壁は「初期設定」です。<br />
            NightOpsでは、水商売の複雑な給与体系（各種バックやペナルティ）の<br className="hidden md:block" />
            <strong className="text-blue-400 font-bold border-b border-blue-400">システム設定を【完全無料】で代行化。</strong><br />
            店舗の負担をゼロにし、翌日から完璧な自動化を実現します。
          </p>
        </AnimatedDiv>

        <div className="relative">
          {/* Vertical line connecting steps */}
          <div className="absolute left-[39px] md:left-1/2 md:-translate-x-1/2 top-4 bottom-4 w-0.5 bg-gray-800" />
          
          <div className="space-y-12">
            {steps.map((step, idx) => (
              <AnimatedDiv key={step.number} delay={0.1 * idx}>
                <div className={`flex flex-col md:flex-row items-start ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  
                  <div className="w-full md:w-1/2" />
                  
                  {/* Circle number */}
                  <div className="absolute left-4 md:left-1/2 -ml-6 md:-ml-8 w-12 md:w-16 h-12 md:h-16 rounded-full bg-blue-900 border-4 border-[#0A0E17] flex items-center justify-center text-blue-200 font-bold text-lg md:text-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10">
                    {step.number}
                  </div>

                  <div className={`w-full md:w-1/2 pl-16 md:pl-0 pt-2 ${idx % 2 === 0 ? 'md:pr-16 text-left md:text-right' : 'md:pl-16 text-left'}`}>
                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </AnimatedDiv>
            ))}
          </div>
        </div>

      </div>
    </AnimatedSection>
  );
}
