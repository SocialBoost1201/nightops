# Doc-41 API Response and Error Contract

## 1. 目的
NightOps API を「動作するAPI」から「運用・販売可能なSaaS API契約」へ引き上げるため、成功/失敗レスポンスとエラーコードを統一する。

## 2. 共通レスポンス形式

### 2.1 成功
```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": {
    "correlationId": "2f8f0fb6-..."
  }
}
```

### 2.2 失敗
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_INVALID_DATE",
    "message": "日付形式が不正です。YYYY-MM-DD 形式で指定してください。",
    "field": "businessDate",
    "correlationId": "2f8f0fb6-..."
  }
}
```

## 3. correlationId 方針
- リクエスト単位で `x-correlation-id` を採番（受信済みがあれば引き継ぐ）。
- すべてのエラーレスポンスに `error.correlationId` を必須で含める。
- 成功レスポンスは `meta.correlationId` に格納する。
- レスポンスヘッダ `x-correlation-id` にも同値を返す。

## 4. エラーコード体系

| Code | 意味 | 代表HTTP |
|---|---|---|
| AUTH_INVALID_CREDENTIALS | ログインID/パスワード不正 | 401 |
| AUTH_TOKEN_EXPIRED | トークン不備/期限切れ/検証失敗 | 401 |
| ACCESS_DENIED | 権限不足 | 403 |
| TENANT_MISMATCH | テナント境界違反 | 403 |
| VALIDATION_INVALID_DATE | 日付フォーマット/実在日付不正 | 422 |
| VALIDATION_INVALID_RANGE | 汎用バリデーション不正 | 400/422 |
| REPORT_INVALID_BUSINESS_DATE | report用 businessDate 不正 | 422 |
| REPORT_INVALID_RANGE | report用 期間不正（from > to） | 422 |
| NOT_FOUND | 対象リソースなし | 404 |
| CONFLICT | 競合/重複/状態遷移不可 | 409 |
| INTERNAL_SERVER_ERROR | 想定外エラー | 500 |

## 5. HTTPステータス運用
- 400: 汎用入力不正（型・必須不足など）
- 401: 認証失敗（資格情報/トークン）
- 403: 認可失敗・テナント境界違反
- 404: リソース不存在
- 409: 競合
- 422: ドメインルール違反（日付・期間整合性）
- 500: 想定外

## 6. 実装方針（今回）
- レスポンス統一はミドルウェアで共通化。
- 既存の旧コード（例: `AUTH_001`）は共通コードへ正規化して後方互換性を確保。
- Controller/Route の無関係な業務ロジックは変更しない。
