import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";
import { CountUpStat } from "./ui/CountUpStat";

export function LossSection() {
  return (
    <AnimatedSection className="bg-[#05080f] py-20 border-y border-gray-800">
      <div className="text-center mb-16">
        <AnimatedDiv>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            その「1%の誤差」、<br className="md:hidden" />
            いくらの損失か計算したことはありますか？
          </h2>
          <p className="text-gray-400 text-lg">
            月商1,000万円の店舗で、たった1%の計算ズレや漏れがあるだけで…
          </p>
        </AnimatedDiv>
      </div>

      <div className="max-w-3xl mx-auto bg-red-950/20 border border-red-900/30 rounded-2xl p-8 md:p-12 mb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500" />
        <AnimatedDiv delay={0.2} className="text-center">
          <p className="text-red-400 font-semibold mb-2 tracking-widest text-sm uppercase">
            年間推定損失額
          </p>
          <div className="text-5xl md:text-7xl font-extrabold text-white mb-6">
            約<CountUpStat end={120} suffix="万円" duration={2} className="text-red-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-10">
            <div className="bg-[#0A0E17] p-5 rounded-lg border border-gray-800">
              <div className="text-red-500 text-xl mb-2">💸</div>
              <h3 className="font-bold text-gray-200 mb-2">複雑なバック計算ミス</h3>
              <p className="text-sm text-gray-400">時給、同伴、本指名、場内、ドリンク。深夜の手計算による多払いや控除漏れ。</p>
            </div>
            <div className="bg-[#0A0E17] p-5 rounded-lg border border-gray-800">
              <div className="text-red-500 text-xl mb-2">🧾</div>
              <h3 className="font-bold text-gray-200 mb-2">現金管理のズレ</h3>
              <p className="text-sm text-gray-400">付け回し中の伝票修正忘れや、レジ内の現金とシステム上の売上の不一致。</p>
            </div>
            <div className="bg-[#0A0E17] p-5 rounded-lg border border-gray-800">
              <div className="text-red-500 text-xl mb-2">✍️</div>
              <h3 className="font-bold text-gray-200 mb-2">キャストの不信感</h3>
              <p className="text-sm text-gray-400">不透明な給与明細によるモチベーション低下。最悪の場合、退店につながる見えないコスト。</p>
            </div>
          </div>
        </AnimatedDiv>
      </div>

      <AnimatedDiv delay={0.4} className="max-w-4xl mx-auto text-center">
        <h3 className="text-2xl font-bold mb-8 text-gray-300">
          金銭的損失だけではありません。痛みを伴う「時間」の浪費も。
        </h3>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3 text-gray-400">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-sm">✕</span>
            <span>毎晩2〜3時間の締め作業</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800 text-sm">✕</span>
            <span>終わらない給与計算のストレス</span>
          </div>
        </div>
      </AnimatedDiv>

    </AnimatedSection>
  );
}
