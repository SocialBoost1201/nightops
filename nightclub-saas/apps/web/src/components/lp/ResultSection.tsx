import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";
import { CountUpStat } from "./ui/CountUpStat";

export function ResultSection() {
  return (
    <AnimatedSection className="bg-[#0A0E17] py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="text-center max-w-4xl mx-auto mb-16 relative z-10">
        <AnimatedDiv>
          <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">
            IMPACT
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            導入がもたらす圧倒的な「成果」
          </h2>
        </AnimatedDiv>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <AnimatedDiv delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Before */}
            <div className="bg-[#05080f] rounded-2xl p-8 border border-gray-800 relative shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl font-serif">BEFORE</div>
              <h3 className="text-xl font-bold text-gray-400 mb-8 pb-4 border-b border-gray-800">
                【導入前】紙とExcelのアナログ管理
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-gray-500 text-sm mb-1">毎日の締め作業にかかる時間</p>
                  <p className="text-4xl font-bold text-gray-300">
                    <CountUpStat end={180} duration={2} suffix="分" />
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">給与計算のミス・トラブル</p>
                  <p className="text-4xl font-bold text-gray-300">
                    月 <CountUpStat end={5} duration={2} suffix="件以上" />
                  </p>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="bg-blue-900/10 rounded-2xl p-8 border border-blue-500/30 relative shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl" />
              <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl font-serif text-blue-400">AFTER</div>
              <h3 className="text-xl font-bold text-white mb-8 pb-4 border-b border-blue-500/20">
                【導入後】NightOpsによるデータ管理
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-blue-300 text-sm mb-1">毎日の締め作業にかかる時間</p>
                  <p className="text-5xl font-extrabold text-white">
                    <CountUpStat end={3} duration={2.5} suffix="分" className="text-blue-400" />
                  </p>
                </div>
                <div>
                  <p className="text-blue-300 text-sm mb-1">給与計算のミス・トラブル</p>
                  <p className="text-5xl font-extrabold text-white">
                    <CountUpStat end={0} duration={1.5} suffix="件" className="text-blue-400" />
                  </p>
                </div>
              </div>
            </div>

          </div>
        </AnimatedDiv>
      </div>
    </AnimatedSection>
  );
}
