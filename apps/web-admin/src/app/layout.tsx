import './globals.css';
import { SWRProvider } from '@/components/providers/SWRProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>NightOps 管理画面</title>
        <meta name="description" content="NightOps - キャバクラ店舗向け運営SaaS 管理画面" />
      </head>
      <body>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
