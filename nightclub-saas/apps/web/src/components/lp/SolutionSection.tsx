import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";

export function SolutionSection() {
  return (
    <AnimatedSection className="bg-[#0A0E17] py-24 relative">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-900/10 blur-[150px] pointer-events-none" />
      
      <div className="text-center max-w-4xl mx-auto z-10 relative">
        <AnimatedDiv>
          <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">
            THE SOLUTION
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-white leading-tight">
            どんぶり勘定への<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">終止符</span>。
          </h2>
        </AnimatedDiv>

        <AnimatedDiv delay={0.2}>
          <p className="text-xl md:text-2xl text-gray-300 leading-relaxed font-medium">
            NightOpsは、<br className="md:hidden" />
            <span className="text-white">売上入力・バック計算・給与明細発行まで</span><br />
            すべてを自動化する<br className="md:hidden" />店舗管理クラウドです。
          </p>
        </AnimatedDiv>

        <AnimatedDiv delay={0.4} className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1 w-full max-w-3xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <div className="bg-[#0F172A] p-6 text-center border-r border-gray-800">
              <span className="block text-2xl mb-2">📱</span>
              <p className="font-bold text-gray-200">売上入力</p>
              <p className="text-xs text-gray-500 mt-2">スマホから1タップ</p>
            </div>
            <div className="bg-[#0F172A] p-6 text-center border-r border-gray-800 relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-gray-600 hidden md:block">▶</div>
              <span className="block text-2xl mb-2">⚙️</span>
              <p className="font-bold text-gray-200">自動計算</p>
              <p className="text-xs text-gray-500 mt-2">1円単位の正確な日次決算</p>
            </div>
            <div className="bg-[#0F172A] p-6 text-center relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-gray-600 hidden md:block">▶</div>
              <span className="block text-2xl mb-2">📄</span>
              <p className="font-bold text-gray-200">給与明細</p>
              <p className="text-xs text-gray-500 mt-2">キャスト専用アプリへ配信</p>
            </div>
          </div>
        </AnimatedDiv>
      </div>
    </AnimatedSection>
  );
}
