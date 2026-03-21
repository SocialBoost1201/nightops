# Doc-44 Audit Logging Hardening

## 1. 監査ログの目的
NightOps の監査ログは「後日トラブル時に、誰が・どのテナントで・何を・なぜ変更したか」を再現できる証跡を残すために記録する。  
単なる運用ログではなく、SaaS運営上の説明責任と不正追跡を主目的とする。

## 2. 必須項目一覧（今回方針）
- `action`
- `actorId`
- `actorRole`
- `tenantId`
- `resourceType`
- `resourceId`
- `before`
- `after`
- `reason`
- `correlationId`
- `createdAt`

実装メモ:
- DBカラム互換性を維持するため、`before` は `beforeData`、`after/reason/result/source` は `afterData.snapshot` と `afterData.__audit` に格納する。
- `createdAt` は `audit_logs.created_at` のDBデフォルト値を利用する。

## 3. 記録対象操作（今回適用）
- テナント状態/プラン変更: `PATCH /system/tenants/:id`
- 給与条件変更: `PATCH /admin/compensation-plans/:id`
- 給与条件登録: `POST /admin/compensation-plans`
- シフト承認/却下: `PUT /attendance/shifts/status`
- 重要管理更新（アカウント更新）: `PATCH /admin/accounts/:id`
- 課金Webhook起点の subscription / tenant status 更新:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## 4. 記録しない情報（秘匿情報）
以下は監査ログへ保存しない（`[REDACTED]` にマスク）:
- `password`
- `passwordHash`
- `token`
- `refreshToken`
- `secret`
- `stripeSecret`
- `authorization`
- `cookie`

## 5. reason の扱い
- 次の操作では `reason` を必須化:
  - テナント状態/プラン変更
  - 給与条件登録/変更
  - シフト承認/却下
  - 重要管理更新（アカウント更新）
- `reason` が必須の操作で未指定の場合、`422 VALIDATION_INVALID_RANGE`（field: `reason`）を返す。
- Stripe Webhook起点の自動反映は人手理由がないため `reason=null` を許容する。

## 6. correlationId との関係
- リクエスト単位で `x-correlation-id` を採番/引継ぎし、監査ログ `correlationId` に保存する。
- APIレスポンスと監査ログを同一 `correlationId` で突合可能にする。

## 7. 監査ログ失敗時の設計方針
- `strict`:
  - 重要更新（テナント状態、給与条件、承認系、Webhookの状態同期）で採用
  - 監査ログ書き込み失敗時は `500` を返し、トランザクションごと失敗させる
- `best_effort`:
  - 通常更新（例: 一部作成操作）で採用
  - 監査ログ失敗時は業務処理を継続し、サーバーログに失敗を出力する

## 8. 今回未対応の範囲
- 売上修正フロー（sales update/change request approve）への全面適用
- 日次締め/月次確定フローへの適用（該当API未実装）
- 監査ログ閲覧UI、全文検索、外部SIEM連携
- 監査イベントの改ざん検知（署名/ハッシュチェーン）
