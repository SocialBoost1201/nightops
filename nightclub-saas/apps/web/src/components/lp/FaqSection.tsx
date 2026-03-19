"use client";

import { AnimatedDiv, AnimatedSection } from "./ui/AnimatedSection";
import { useState } from "react";
import { clsx } from "clsx";

export function FaqSection() {
  const faqs = [
    {
      q: "現在使っている紙やExcelのデータから移行できますか？",
      a: "はい、キャスト情報等のExcel(CSV)一括インポートに対応しています。また、14日間無料トライアルに付帯する「初期設定代行」にて、既存のデータからの移行手配も弊社でフルサポートいたします。"
    },
    {
      q: "店舗独自の複雑な給与体系（スライド時給や各種バック・ペナルティ）に対応していますか？",
      a: "完全対応しています。同伴、本指名、場内、ドリンク、小計バックから、遅刻や当日欠勤のペナルティまで、水商売特有の複雑怪奇なルールを設定可能です。ルール設定自体も弊社スタッフがヒアリングし代行します。"
    },
    {
      q: "ITやパソコンが苦手な店長・ボーイでも使えますか？",
      a: "問題ありません。現場のスタッフには直感的でシンプルなスマホ専用画面を提供しています。日々の伝票（売上）を入力するだけで、裏側の複雑な給与計算や集計はNightOpsが全自動で処理します。"
    },
    {
      q: "途中で解約することは可能ですか？",
      a: "はい、いつでも解約可能です。14日間の無料トライアル期間中のキャンセルはもちろん、本契約後も悪質な契約期間の縛り等は一切ございません。"
    }
  ];

  return (
    <AnimatedSection className="bg-[#05080f] py-24 border-t border-gray-800">
      <div className="max-w-3xl mx-auto px-4">
        
        <AnimatedDiv className="text-center mb-16">
          <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">
            FAQ
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            よくあるご質問
          </h2>
        </AnimatedDiv>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <FaqItem key={idx} q={faq.q} a={faq.a} delay={0.1 * idx} />
          ))}
        </div>

      </div>
    </AnimatedSection>
  );
}

function FaqItem({ q, a, delay }: { q: string, a: string, delay: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AnimatedDiv delay={delay}>
      <div 
        className="glass-panel border border-gray-800 rounded-lg overflow-hidden cursor-pointer transition-colors hover:border-gray-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="px-6 py-5 flex justify-between items-center bg-[#0A0E17]">
          <h3 className="text-white font-medium pr-8">{q}</h3>
          <span className={clsx("text-blue-500 text-2xl transition-transform duration-300", isOpen ? "rotate-45" : "")}>
            +
          </span>
        </div>
        <div 
          className={clsx(
            "px-6 text-gray-400 text-sm leading-relaxed transition-all duration-300 overflow-hidden",
            isOpen ? "max-h-96 py-5 border-t border-gray-800/50 bg-[#0A0E17]/50" : "max-h-0 py-0"
          )}
        >
          {a}
        </div>
      </div>
    </AnimatedDiv>
  );
}
