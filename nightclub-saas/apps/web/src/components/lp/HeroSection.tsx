import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";
import { ButtonCta } from "./ui/ButtonCta";

export function HeroSection() {
  return (
    <AnimatedSection className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-gray-800">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <AnimatedDiv delay={0.1}>
          <span className="inline-block py-1 px-3 rounded-full bg-blue-500/10 text-blue-400 text-sm font-bold tracking-wider mb-6 border border-blue-500/20">
            ナイトビジネス専用 店舗管理クラウド
          </span>
        </AnimatedDiv>

        <AnimatedDiv delay={0.2}>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-8 tracking-tight">
            あなたの店舗、毎月<br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">見えないお金</span>を失っていませんか？
          </h1>
        </AnimatedDiv>

        <AnimatedDiv delay={0.3}>
          <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
            売上のズレ、手計算による給与ミス、限界を超えた深夜の締め作業。<br className="hidden md:block" />
            NightOpsは、そのすべてを <strong className="text-white font-semibold">1クリックで終わらせる</strong> SaaSです。
          </p>
        </AnimatedDiv>

        <AnimatedDiv delay={0.4} className="flex flex-col items-center justify-center space-y-4">
          <ButtonCta href="#pricing" className="text-lg px-10 py-5 w-full sm:w-auto">
            14日間無料＋初期設定代行付きで始める
          </ButtonCta>
          <p className="text-sm text-gray-500 mt-4">
            ※クレカ登録不要。途中で解約しても費用は一切かかりません。
          </p>
        </AnimatedDiv>
      </div>
    </AnimatedSection>
  );
}
