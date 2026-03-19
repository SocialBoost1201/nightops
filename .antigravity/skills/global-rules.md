# global-rules.md — NightOps

> グループ: **B（SocialBoost / テック系）**  
> 最終更新: 2026-03-19

---

## 1. ブランドアイデンティティ

### カラーシステム

| 役割 | HEX | 用途 |
|------|-----|------|
| プライマリブルー | `#0040FF` | プライマリCTA・ブランドカラー |
| ダークネイビー | `#0D2E57` | ヘッダー・ナビゲーション |
| ナイトブラック | `#0A0E1A` | ダーク背景（夜の運営SaaS） |
| アクセント | `#00CFFF` | データ強調・アラート |
| 警告 | `#FF6B35` | 売上目標達成・アラート |
| テキスト | `#E6EDF3` | ダーク背景上のテキスト |

### ブランドトーン
- キャバクラ店舗向け運営SaaSとして、ナイトワーク現場で実際に使える実用性を最優先
- データドリブンな業績管理ツールとしての信頼感・速さ・確実さ
- 「夜の現場で素早く操作できる」UXを常に意識する

---

## 2. デザインシステム

### 基本方針（業務SaaS向け）
- **ダークモード基調**（実際の使用環境：照明を落とした室内）
- タッチ操作しやすい大きなヒットエリア（最小 `44px × 44px`）
- 情報密度は高めでも、視認性を優先（コントラスト比 4.5:1 以上）
- テーブル・グラフ・ダッシュボードのレイアウトを重視

### ダーク変数
```css
:root {
  --bg-base:     #0A0E1A;
  --bg-surface:  #161B22;
  --bg-elevated: #1F2937;
  --border:      rgba(255, 255, 255, 0.1);
  --text:        #E6EDF3;
  --muted:       #8B949E;
  --primary:     #0040FF;
  --accent:      #00CFFF;
  --warning:     #FF6B35;
}
```

---

## 3. アニメーション

業務SaaSとしてアニメーションは**最小限**に留める。

### 原則
- データ更新・状態変化のフィードバックは 200ms 以内
- ページ遷移は `opacity` フェードのみ（スライド等は禁止）
- モーダル・ドロワーのみ簡単なアニメーションを許容

```tsx
// モーダル表示（最小パターン）
const modalVariants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } },
}
```

---

## 4. フォント

| 要素 | フォント |
|------|---------|
| 見出し・ラベル | Noto Sans JP（視認性優先） |
| 数値・金額 | Inter（Tabular Nums・等幅）|
| 本文 | Noto Sans JP |

```ts
// 数値は必ず tabular-nums を適用
className="font-inter tabular-nums text-right"
```

---

## 5. 技術スタック

**構造**: Turborepo モノレポ + pnpm

### アプリ構成（推定）
```
NightOps/
  apps/
    web/        # Next.js フロントエンド
    api/        # バックエンドAPI
  packages/
    ui/         # 共通UIコンポーネント
    types/      # 共有型定義
```

### データ表示ルール
```tsx
// 金額は必ず3桁区切り + 円
const formatYen = (amount: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(amount)
```

### リアルタイム更新
```ts
// Supabase Realtime または WebSocketを使う場合
// ポーリングは最大30秒間隔まで（サーバー負荷考慮）
```

### オフライン対策
```tsx
// 売上入力など重要データは localStorage に一時保存
// ネットワーク復帰時にサーバーと同期する
```

---

## 6. アクセシビリティ（業務SaaS必須）

- タッチターゲット: 最小 `44px × 44px`
- カラーコントラスト: WCAG AA 準拠（4.5:1 以上）
- フォームの `label` は必ず関連付ける（`htmlFor` or `aria-label`）
- エラーメッセージは `role="alert"` で通知

---

## 7. コンポーネント設計ルール

- `packages/ui/` に共通コンポーネントを集約（モノレポ前提）
- `any` 型の使用禁止
- `console.log` の本番コードへの混入禁止
- 画像は `next/image` を必ず使用

---

## 8. アニメーション アクセシビリティ基準（2026追加）

### useReducedMotion 必須ルール（framer-motion，web-admins 新規追加）

```tsx
// apps/web-admin: packages/ui/src/hooks/useMotionSafe.ts に配置
"use client"
import { useReducedMotion } from "framer-motion"
export function useMotionSafe() { return !useReducedMotion() }
```

```tsx
// モーダル表示でのuseReducedMotion 適用例
"use client"
import { motion, useReducedMotion } from "framer-motion"
export function Modal({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={prefersReduced ? { duration: 0.1 } : { duration: 0.15, ease: "easeOut" }}
    >{children}</motion.div>
  )
}
```

### 業務SaaS特有の注意点
- データ更新フィードバック（成功・失敗トースト）は `useReducedMotion` に関わらず 200ms以内に表示
- フォームバリデーションエラーのシェイクアニメーションは Reduced を尊重してフェードのみに切り替える

### パフォーマンス基準
- Lighthouse Performance 90+ 維持・LCP要素にアニメーション禁止

---

## 10. 2026年最新：AEO・高速配信・セキュリティルール（一括追加）

### Bento Grid 2.0（グリッドUIの2026標準）

```tsx
// 角丸24px以上・Spatial UI（ガラスモーフィズム）を標準化
<div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-8">
  {/* コンテンツ */}
</div>
```

### AEO（AI回答エンジン最適化）— JSON-LD 必須実装

```tsx
// 全ページに JSON-LD を実装する共通パターン
export default function Page() {
  const jsonLd = { "@context": "https://schema.org", /* スキーマオブジェクト */ }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
// グループA（清蓮）: LocalBusiness + Service + FAQPage + BreadcrumbList
// グループB（テック）: Organization/SoftwareApplication + FAQPage + Article
```

### PPR（Partial Prerendering）+ AVIF デフォルト化

```ts
// next.config.ts
const config: NextConfig = {
  experimental: { ppr: true },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
  },
}
```

### Cloudflare Turnstile（reCAPTCHA代替・全フォーム必須）

```bash
npm install @marsidev/react-turnstile
# .env.local: NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY / CLOUDFLARE_TURNSTILE_SECRET_KEY
```

```tsx
"use client"
import { Turnstile } from "@marsidev/react-turnstile"
export function TurnstileWidget({ onSuccess }: { onSuccess: (token: string) => void }) {
  return <Turnstile siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY!} onSuccess={onSuccess} options={{ theme: "auto", language: "ja" }} />
}
// Server Action: challenges.cloudflare.com/turnstile/v0/siteverify でトークン検証を忘れずに
```

### Lighthouse パフォーマンス目標

| 指標 | 目標 |
|------|------|
| Performance | 90+ |
| Accessibility | 95+ |
| SEO | 100 |
| LCP | < 2.5秒 |
| CLS | < 0.1 |
