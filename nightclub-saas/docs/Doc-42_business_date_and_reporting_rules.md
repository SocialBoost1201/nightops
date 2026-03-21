# Doc-42 businessDate and Reporting Rules

## 1. businessDate の定義
- `businessDate` は「店舗営業日」を表す日付キー。
- DB保存の日時は UTC を前提とし、営業日解釈は店舗タイムゾーンで行う。
- MVPでは店舗タイムゾーンを `Asia/Tokyo` 固定として扱う。

## 2. report API の日付ルール

### 2.1 businessDate
- パラメータ: `businessDate` (`YYYY-MM-DD`)
- 未指定時: `Asia/Tokyo` の当日を自動補完
- 実在しない日付は `422 REPORT_INVALID_BUSINESS_DATE`

### 2.2 期間クエリ (`from`, `to`)
- パラメータ: `from`, `to` (`YYYY-MM-DD`)
- 未指定時: 当月初日〜当月末を補完
- 実在しない日付は `422 VALIDATION_INVALID_DATE`
- `from > to` は `422 REPORT_INVALID_RANGE`

## 3. テナント境界
- report API は常に `tenantId` を where 条件に含める。
- 非SystemAdminが他テナントIDを指定した場合は `403 TENANT_MISMATCH`。

## 4. 将来拡張の前提
- 将来的に `dailyCloseTime`（例: 05:00）で営業日切替を制御できるよう、
  date util を route から分離している。
- 将来実装では `StoreSettings.timezone` + `StoreSettings.dailyCloseTime` を参照し、
  営業日境界を動的に決定する。

## 5. 今回の適用範囲
- `/reports/daily`
- `/reports/ranking/sales`
- `/reports/ranking/drinks`
- `/reports/ranking/nominations`
