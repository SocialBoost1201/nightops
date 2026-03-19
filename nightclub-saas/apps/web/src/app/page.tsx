import { HeroSection } from "@/components/lp/HeroSection";
import { LossSection } from "@/components/lp/LossSection";
import { SolutionSection } from "@/components/lp/SolutionSection";
import { FeatureSection } from "@/components/lp/FeatureSection";
import { ResultSection } from "@/components/lp/ResultSection";
import { PricingSection } from "@/components/lp/PricingSection";
import { FlowSection } from "@/components/lp/FlowSection";
import { FaqSection } from "@/components/lp/FaqSection";
import { FinalCtaSection } from "@/components/lp/FinalCtaSection";
import { ButtonCta } from "@/components/lp/ui/ButtonCta";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-gray-200 font-sans selection:bg-blue-500/30">
      <Header />
      <main>
        <HeroSection />
        <LossSection />
        <SolutionSection />
        <FeatureSection />
        <ResultSection />
        <PricingSection />
        <FlowSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-[#0A0E17]/80 backdrop-blur-md z-50 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
        <Link href="/" className="text-2xl font-extrabold tracking-tighter text-white">
          Night<span className="text-blue-500">Ops</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="#pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Pricing</Link>
          <ButtonCta href="#pricing" className="py-2 px-6 text-sm">
            無料で始める
          </ButtonCta>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[#05080f] py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center">
        <div className="mb-6 md:mb-0">
          <div className="text-2xl font-extrabold tracking-tighter text-white mb-2">
            Night<span className="text-blue-500">Ops</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Seiren Inc. All rights reserved.</p>
        </div>
        <div className="flex gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
          <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
        </div>
      </div>
    </footer>
  );
}
