# NightOps SaaS基盤 実装ノート (Step 6)

## 1. 概要
本ドキュメントは、SaaS課金・サブスクリプション基盤（`feature/saas-foundation` ブランチ）の実装内容と設計上の重要な決定事項、および今後の課題についてまとめたものです。

## 2. DBスキーマ変更点
- `Tenant` モデルの拡張:
  - `status`, `planId`, `stripeCustomerId` を追加。
- 新規モデルの追加:
  - `Plan`: サブスクリプションプランマスタ
  - `PlanFeature`: プランごとの機能フラグ
  - `Subscription`: サブスクリプション契約情報（Stripe IDなどを含む）
  - `BillingHistory`: 課金履歴（領収書としての利用を想定）
- **注意点**: Prisma Clientの出力先を `apps/api/prisma/generated/client` に変更し、モノレポ環境における大元のプロジェクトとの衝突を回避しています。

## 3. Stripe 連携 (WebhookとCheckout)
- **パッケージ**: `stripe` SDK を導入。
- **エンドポイント**:
  - `POST /billing/create-checkout-session`: プランIDをもとにStripe Customerを作成し、サブスクリプションのCheckout URLを生成。
  - `POST /billing/webhook`: Stripeからの非同期イベントを処理。
- **処理するイベント**:
  - `checkout.session.completed`: サブスクリプションの初期化、テナントをactiveに変更。
  - `invoice.payment_succeeded`: サブスク更新・継続成功、BillingHistoryに記録。
  - `invoice.payment_failed`: 決済失敗、テナントやサブスクを `past_due` (猶予期間)に変更。
  - `customer.subscription.updated` / `deleted`: 契約内容の変更や解約をDBに同期。
- **Idempotency (冪等性)**: Stripe Event IDをもとにした完全な重複排除は今後の課題ですが、Prismaのupsertや状態確認を用いた簡易的な再試行耐性を備えています。

## 4. テナント状態によるアクセス制御 (TenantStatusGuard)
- **ミドルウェア**: `checkTenantStatus` を実装し、`index.ts`の大元ルーターに適用。
- **仕様**:
  - `suspended` (利用停止) や `canceled` (解約済) のテナントは、`GET` メソッド以外の書き込みAPIへのアクセスを 403 Forbidden にしてブロック。
  - `SystemAdmin` 権限を持つユーザーはSaaS運営側としてテナント状態に関わらずアクセス可能。

## 5. System Admin 向けAPI
- `GET /system/tenants`: 登録全テナントの状況（プラン、契約情報含む）を取得。
- `POST /system/tenants`: 新規テナントの作成（基本的には `trial` （トライアル）状態で開始）。
- `PATCH /system/tenants/:id`: 運営側による強制的なステータス変更や手動プラン変更。
- `GET /system/plans`: 利用可能なプランの一覧を取得。

## 6. 今後の課題・Next Action
- **Webhookのローカルテスト**: Stripe CLIを用いたローカルのWebhookリスニング・結合テストの実施が必要です。
- **フロントエンド連携**: Checkoutへのリダイレクトや、`past_due`状態での警告UIの実装。
- **機能フラグ制御の実装**: 今回 `PlanFeature` モデルを追加しましたが、実際のAPIやUI内での制限ロジックへの統合を進める必要があります。
