import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";
import { ButtonCta } from "./ui/ButtonCta";

export function FinalCtaSection() {
  return (
    <AnimatedSection className="bg-[#0A0E17] py-32 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
        <AnimatedDiv>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-8">
            深夜の締め作業で疲弊するのは、<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">もう終わりにしませんか？</span>
          </h2>
        </AnimatedDiv>

        <AnimatedDiv delay={0.2}>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            見えない赤字の防止と、圧倒的な時間の創出。<br />
            まずは14日間の無料トライアルで、その違いを実感してください。
          </p>
        </AnimatedDiv>

        <AnimatedDiv delay={0.4} className="flex flex-col items-center justify-center">
          <ButtonCta href="#pricing" className="text-xl px-12 py-6 w-full sm:w-auto shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            14日間無料＋初期設定代行付きで始める
          </ButtonCta>
          <p className="text-sm text-gray-500 mt-6 font-medium">
            ※解約金なし。複雑な給与ルール設定もスタッフが代行します。
          </p>
        </AnimatedDiv>
      </div>
    </AnimatedSection>
  );
}
