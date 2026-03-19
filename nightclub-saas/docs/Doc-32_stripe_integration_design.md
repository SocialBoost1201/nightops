# Doc-32: Stripe連携設計

## 1. Stripeとの連携フロー構成
- 決済自体はStripe Checkout Sessionを利用してセキュアに完結させる。
- サブスクリプションの更新・失敗などの非同期イベントはStripe Webhookを通じてシステムに反映させる。

## 2. 対象となるWebhookイベント
Stripeエンドポイントで以下のイベントを購読し、NightOps側へ同期する。
- `invoice.payment_succeeded`: 支払い成功時の処理。状態を `active` へ更新し、`paidAt` と次回更新日を記録する。
- `invoice.payment_failed`: 支払い失敗時の処理。テナント状態を `past_due` へ遷移させ、猶予期間（Grace Period）を開始する。
- `customer.subscription.updated`: プラン変更等の即時反映。
- `customer.subscription.deleted`: 解約時（または強制キャンセル時）。テナント状態を `canceled` へ。

## 3. 冪等性の担保（重要）
Webhookの再送による二重処理を防ぐため、Redisや一意の `eventId` 制約を用いたロジックを必ず実装する。
- 受け取ったStripeのイベントID（`evt_xxx`）をキーとして処理済み状態を確認する。
- 処理が成功した場合のみ、イベントIDをDBへ永続化して後続の同一リクエストを破棄する。

## 4. API定義
- `POST /billing/create-checkout-session` : プランIDとテナントIDを元に、Stripe側のCheckoutセッションURLを生成・返却する。
- `POST /billing/webhook` : Stripeからの非同期イベントを受けつけるエンドポイント。
