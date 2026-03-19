import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "NightOps | 水商売の売上・給与を全自動化する店舗管理クラウド",
  description: "見えない損失をゼロに。給与計算・売上管理・締め作業を完全自動化。14日間無料＋初期設定代行付き。",
  keywords: "キャバクラ 管理システム, ガールズバー 売上管理, 水商売 給与計算, ナイトクラブ 管理ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="scroll-smooth">
      <body
        className={`${notoSansJP.variable} font-sans antialiased bg-[#0A0E17] text-white overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
