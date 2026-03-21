# Doc-45 Financial Audit and Closing

## 1. 目的
NightOps の売上修正・日次締め・月次確定を、会計監査に耐える証跡レベルで運用するためのルールを定義する。  
本ドキュメントは「誰が、いつ、何を、なぜ変更したか」を再現可能にすることを目的とする。

## 2. 売上修正ルール

対象:
- `PATCH /sales/:id`
- `POST /sales/change-requests/:id/approve`

必須要件:
- `reason` 必須（未指定は `422`）
- `before` / `after` を監査ログに保存
- `actorId` / `actorRole` / `tenantId` / `correlationId` を保存
- 監査ログは `audit.service` 経由で strict 記録

監査アクション:
- `UPDATE_SALES_SLIP`
- `APPROVE_SALES_CHANGE_REQUEST`

## 3. 締めの定義

### 3.1 日次締め
対象:
- `POST /reports/close/daily`

処理:
- `businessDate` ごとに締める
- 当日伝票の `totalSales` を集計
- `cashExpected`（= totalSales）と `cashActual`、`difference` を記録
- 差額がある場合は `warning`（`CASH_DIFFERENCE_DETECTED`）をレスポンス/監査に残す

監査アクション:
- `DAILY_CLOSE`

### 3.2 月次確定
対象:
- `POST /reports/close/monthly`

処理:
- 対象月（`YYYY-MM`）の売上を集計
- `monthly_closes.status = closed` に更新
- 確定後は対象月の売上修正を禁止

監査アクション:
- `MONTHLY_CONFIRM`

### 3.3 月次解除（管理者のみ）
対象:
- `POST /reports/close/monthly/unlock`

処理:
- `Admin` / `SystemAdmin` のみ実行可能
- 対象月を `open` に戻す

監査アクション:
- `MONTHLY_UNLOCK`

## 4. ロック仕様

売上修正時の判定:
1. 対象営業日が `daily_closes.status = closed` の場合  
   -> `409 CONFLICT`（日次締め済み）
2. 対象月が `monthly_closes.status = closed` の場合  
   -> `409 CONFLICT`（月次確定済み）

補足:
- 売上日付を変更する更新では、更新前/更新後の営業日・月の両方でロック判定を行う。
- 月次解除は管理者権限に限定する。

## 5. 監査ログの意味

本仕様で残す監査ログは、以下の用途を満たす:
- 会計変更の事後説明責任
- 不正・誤操作の追跡
- 問い合わせ時の再現性確保
- APIレスポンスと監査ログの相互突合（`correlationId`）

監査ログに保存しない情報:
- `password`, `passwordHash`, `token`, `refreshToken`, `secret`, `stripeSecret`, `authorization`, `cookie`  
上記は共通 sanitize で `[REDACTED]` に置換する。
