# API Walkthrough Report (Nightclub-SaaS, 2026-03-20)

## Summary
- APIレスポンス契約を `success/data/error` へ統一。
- `correlationId` を全エラーで必須化。
- report API (`/reports/*`) を追加し、日付/期間ルールを強化。
- report 契約テスト・businessDate util テストを追加。

## Key Validation Points
- 実在しない日付は拒否 (`422 REPORT_INVALID_BUSINESS_DATE`)
- `from > to` は拒否 (`422 REPORT_INVALID_RANGE`)
- 日付未指定時は businessDate / 当月期間を補完
- tenant 境界違反は拒否 (`403 TENANT_MISMATCH`)
- エラー時は `error.correlationId` を返却

## Test Result
- `pnpm --dir nightclub-saas/apps/api test -- --runInBand`
- 4 suites / 21 tests passed
