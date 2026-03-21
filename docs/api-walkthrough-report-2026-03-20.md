# API Walkthrough Report (2026-03-20)

## Scope
- `web-admin`: `next build`
- `api`: `nest build`
- JWT付きで全APIエンドポイントを順次 `curl` テスト
- 失敗エンドポイントの特定・修正・再テスト

## Build Results
- `pnpm --filter @nightops/web-admin build`: 成功
- `pnpm --filter @nightops/api build`: 成功

## Endpoint Test Results
### 1st run (before fix)
- Total: `52`
- Pass: `49`
- Fail: `3`
- Result file: `/tmp/nightops_api_pre_1773997814/results_pretty.json`

Failed endpoints:
1. `GET /api/reports/daily?businessDate=2026-99-99` (expected 400, actual 200)
2. `GET /api/reports/ranking/sales?from=2026-13-01&to=2026-13-40` (expected 400, actual 200)
3. `GET /api/reports/ranking/drinks?from=2026-12-31&to=2026-01-01` (expected 400, actual 200)

### Root Cause
- `apps/api/src/modules/report/report.service.ts`
- 日付文字列が不正でも `Date.parse` ベースでデフォルト日付にフォールバックしていたため、バリデーションエラーにならず `200` を返していた。
- `from > to` の期間逆転チェックがなかった。

### Applied Fix
- `report.service.ts`
1. `YYYY-MM-DD` 厳格検証を追加（実在日付チェック込み）
2. `from <= to` の期間整合性チェックを追加
3. 日付未指定時のデフォルト値（`daily` は当日、ランキングは当月範囲）を明示化
4. `dailySummary` の返却 `businessDate` を実際に使用した日付文字列に統一
- `report.controller.ts`
1. `businessDate/from/to` を optional に修正

### 2nd run (after fix)
- Total: `52`
- Pass: `52`
- Fail: `0`
- Result file: `/tmp/nightops_api_pre_1774052847/results_pretty.json`

## Endpoints Covered (JWT)
- Auth: login, refresh, change-password, logout
- Users: create/list/status update/reset-password
- Compensation plans: create/list
- Shifts: submit/period/approve/change-request
- Attendance: checkin/checkout/cast-checkout/today/daily-close/status
- Sales: create/update/list/detail
- Customers: create/list/update/summary/merge/delete
- Reports: daily/ranking(sales, drinks, nominations) + invalid date validation checks
- Payroll: calculate/monthly-close
- Change requests: pending/my/process
- Master: settings get/put, price-items get
- Audit logs: list

## Notes
- テスト実行用APIは `PORT=3050` で起動して実施。
- 既存の未コミット変更は保持し、今回の修正対象ファイルのみ変更。
