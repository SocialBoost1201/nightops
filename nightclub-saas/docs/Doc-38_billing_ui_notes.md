# SaaS Billing UI 実装ノート (Step 8 / Doc-38)

## 1. 概要
本ドキュメントは、NightOps SaaS基盤のフロントエンドフェーズ (`feature/saas-billing-ui`) において実装した、テナント管理者向け課金UIおよびSystemAdmin向け詳細画面の拡張についてまとめたものです。

## 2. 追加画面一覧
MVPとして以下の3画面を `apps/web` (Next.js) 上に実装しました。

1. **`/billing/overview` (テナント管理者向け)**
   - 現在の契約状態、プラン名、次回請求日、直近の支払い結果を確認できるダッシュボード。
   - `past_due` (支払い失敗) や `suspended` (利用停止) 時の警告表示と、支払い再開への導線を確保。
2. **`/billing/history` (テナント管理者向け)**
   - 過去の課金・請求履歴 (金額、状態、日時) の一覧画面。
3. **`/system/tenants/[id]` (SystemAdmin向け)**
   - 特定テナントの詳細管理ダッシュボード。
   - 契約状態、`Subscription` の状態、Webhook処理履歴の要約表示、および利用停止(suspend)・復帰(activate)の操作機能。

## 3. API利用一覧
UIの構築に伴い、以下のSaaS基盤APIを利用（および一部新規追加）しました。

- **新規追加 (Tenant Admin用)**
  - `GET /billing/overview`: 自身のプラン・契約・サブスクリプション情報・最新の決済結果を取得。
  - `GET /billing/history`: 自身の `BillingHistory` 一覧を取得。
- **既存/拡張 (SystemAdmin用)**
  - `GET /system/tenants`: (既存) テナント一覧取得。
  - `GET /system/tenants/:id`: (新規/拡張) 指定テナントの詳細（プラン、請求履歴、直近のシステムWebhook履歴を含む）を取得。
  - `PATCH /system/tenants/:id`: (既存) テナントのステータスまたはプランを強制上書き。
  - `GET /system/plans`: (既存) マスタプラン一覧の取得。
- **決済連携用**
  - `POST /billing/create-checkout-session`: Stripe Checkout（お支払い設定画面）へのリダイレクトURL発行。

## 4. 状態表示ルール・UX要件
フロントエンドにおいて、テナントのステータス (`status`) に応じて以下のUXルールを適用しています。

| テナント状態 | UI表現・カラー | 利用制御 (バックエンド担保) | 想定されるナビゲーション(次アクション) |
|---|---|---|---|
| **trial** | Blue | フルアクセス | 有料プランへの誘導 (未実装) |
| **active** | Green | フルアクセス | プラン変更・お支払い設定の変更 |
| **past_due** | Orange (警告) | フルアクセス (猶予期間) | お支払いの再開・更新 (Checkoutへの案内) |
| **suspended** | Red (エラー・警告) | 書き込みブロック (Read Only) | お支払いの再開・更新 (Checkoutへの案内) |
| **canceled** | Gray (インフォ) | 書き込みブロック (Read Only) | 新規再契約のためサポートへ連絡を促す |

※ 支払いに失敗した (`past_due`) 段階では、すぐに業務を止めるのではなく、画面上にオレンジ色の警告バナーで「カード情報の更新」を促す設計としています。

## 5. 責務分離のチェック結果
UIおよびバックエンドAPIの呼び出しにおいて、以下の境界厳守（Tenant / Admin / System 分離）をテスト検証しました。

- **Tenant間のデータ分離**: 
  - Tenant Adminは `GET /billing/history` および `GET /billing/overview` の呼び出し時、自動的にバックエンドの `req.user.tenantId` に基づいてクエリされるため、意図的にURLやパラメータを改変しても他テナントの履歴を覗き見ることはできません。
- **SystemAdminとTenantAdminの責務分離**:
  - `/system/*` APIは `requireRoles(['SystemAdmin'])` によって保護されているため、通常のテナント管理者が `/system/tenants/:id` にアクセスしたり、別テナントをSuspendすることは不可能です。
- **状態に基づく制御**:
  - `canceled` 状態のテナントは、画面上で変更操作が一切非表示になるか無効化されています。
  - StripeのAPIアクセスやDB更新といった課金に関する秘匿ロジックはすべてAPI層（`billing.ts` / `system.ts`）にカプセル化し、フロントエンド（UI）には保持させていません。

## 6. 今後の課題 (未実装理由)
- 売上入力UIや勤怠UIなどの実務機能は、本「SaaS課金基盤検証フェーズ」のスコープから除外しているため今回は未着手です。
- ユーザーに提供するプラン変更操作自体はMVPとして「Checkout」へのリダイレクトで網羅していますが、複雑なプラン・ダウングレード時の日割り計算等はStripe側のポータル設定に依存しています。
