# CLAUDE.md — NightOps（技術エージェント向け憲法）

> 最終更新: 2026-03-19 | Package Manager: pnpm | Turborepo | Node: >=20.0.0

---

## コマンド一覧

```bash
pnpm dev            # turbo run dev（全app同時起動）
pnpm build          # turbo run build
pnpm test           # turbo run test
pnpm lint           # turbo run lint
pnpm clean          # turbo run clean

# 特定appのみ
pnpm --filter @nightops/web-admin dev    # 管理画面のみ
pnpm --filter @nightops/api dev          # APIのみ
```

---

## 技術スタック

| 項目 | 内容 |
|------|------|
| 構成 | Turborepo + pnpm monorepo |
| Framework | Next.js 14.x (apps/web-admin) |
| React | 18.x |
| Styling | Tailwind CSS v3（apps/web-admin/tailwind.config.ts） |
| Animation | Framer Motion v12 |
| Icons | Lucide React |
| State | SWR（データフェッチ）|
| Form | react-hook-form + zod |
| Auth | JWT（jwt-decode + js-cookie） |
| HTTP | axios |

---

## モノレポ構成

```
NightOps/
  apps/
    web-admin/        # Next.js 管理ダッシュボード（port: 3001）
    api/              # バックエンドAPI
  packages/
    shared/           # @nightops/shared: 共通型・ユーティリティ
```

---

## TypeScript 規約

```ts
// ✅ workspace パッケージのインポート
import { type CastSale } from "@nightops/shared"

// ✅ SWR でデータフェッチ
import useSWR from "swr"
const { data, error } = useSWR<SaleData[]>("/api/sales/today", fetcher)

// ✅ 金額は必ず Intl.NumberFormat で表示
const formatYen = (n: number) =>
  new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n)
```

---

## PPR & 最適化

```ts
// apps/web-admin/next.config.ts
experimental: { ppr: true }
images: { formats: ["image/avif", "image/webp"] }
// 業務SaaSのため、ダッシュボードシェルを静的シェルとしてPPR配信
```

---

## セキュリティ

- JWT refresh token の有効期限管理（クライアント側で期限チェック）
- Cloudflare Turnstile をログイン画面に実装（ブルートフォース対策）
- API エンドポイントへの Rate Limiting 実装必須

---

## エラー解決

```bash
# workspace:* パッケージが見つからない → pnpm install をルートで実行
# turbo キャッシュが古い → pnpm clean && pnpm build
# Next.js 14 + React 18 の型エラー → @types/react@18.x を確認
```
