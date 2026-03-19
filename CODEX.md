# CODEX.md — NightOps（事業エージェント向け文脈）

> 最終更新: 2026-03-19 | グループ: B（テック系）

---

## Project Goal（事業の目的）

**「キャバクラ・ナイトクラブの店舗運営を、デジタルで完全に効率化する」**

売上集計・キャスト管理・シフト・指名・バック計算など、
現場で紙やExcelで行われている夜の業務をSaaSとして置き換える。
「現場で素早く使えること」「夜の環境でも見やすいUI」を最優先とする。

ターゲット: キャバクラ・ガールズバー・ラウンジの店舗オーナー・店長・バックスタッフ
差別化: ナイトワーク現場に特化した業務フロー設計

---

## Brand Identity

**「圧倒的な実用性・現場で信頼されるツール」**
- ダークモード（#0A0E1A 背景・ゴールド #F59E0B アクセント）
- 売上数値は tabular-nums 等幅フォント（Inter）で必ず揃える
- タッチターゲット最小 44px × 44px（スマホ操作優先）

---

## AEO（JSON-LD）ルール

```tsx
// SoftwareApplication（サービス紹介ページ）
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "NightOps",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web / iOS / Android",
  "offers": { "@type": "Offer", "priceCurrency": "JPY" },
}
```

---

## プライバシー・個人情報ルール

- キャスト（女性スタッフ）の本名・生年月日・連絡先は暗号化必須
- 売上データ・給与データは役職に応じたアクセス制限（店長以上のみ閲覧可）
- Cloudflare Turnstile をログイン画面に実装（ブルートフォース対策）
- **AI生成禁止**: 実在するキャスト情報・売上実績をAIに送信することは禁止
- バックアップデータの保持期間: 365日間

---

## PPR & Edge

```ts
// apps/web-admin/next.config.ts
experimental: { ppr: true }
// ダッシュボードシェル → 静的・売上データ表示 → Suspense でストリーミング
images: { formats: ["image/avif", "image/webp"] }
```
