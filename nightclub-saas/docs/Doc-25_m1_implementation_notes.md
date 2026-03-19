# Doc-25 M1 Implementation Notes

> プロジェクト: NightClub SaaS  
> バージョン: M1-Foundation  
> 作成日: 2026-02-25  

---

## 1. 実装範囲 (M1)
M1フェーズ（認証・基盤・最小エンドポイント）として以下の実装を `apps/api/src/index.ts` および Prisma Schema に反映しました。

- **認証・JWT**: `/auth/login`, `/me`、パスワードの bcrypt ハッシュ化および JWTのベアラートークン検証 (`authenticate` ミドルウェア)
- **Role-Based Access Control (RBAC)**: `requireRoles` ミドルウェアによる許可ロールの宣言的制御。
- **Attribute-Based Access Control (ABAC)**: `enforceTenantBoundary` によるテナントアクセスのガード、および `requireSelfOrAdmin` による自己リソースの保護。
- **監査ログ (AuditLog)**: `x-correlation-id` を注入するミドルウェアと、DBへの不変ログ書き込みヘルパー (`createAuditLog`) の実装。
- **エラーハンドラ**: `APIError` クラスを用いた Doc-11 準拠のレスポンスフォーマット統一化。
- **管理者用最小CRUD**: アカウント作成・一覧取得・状態更新 (`/admin/accounts`)、および給与条件の作成・一覧取得 (`/admin/compensation-plans`)。これらは全て `SystemAdmin`, `Admin` ロールのみ許可されます。

---

## 2. 実装したファイル一覧
- `apps/api/prisma/schema.prisma`: Docs-21 ER設計に基づく全19テーブル定義。
- `apps/api/src/index.ts`: APIルート、ミドルウェア（Auth, RBAC, ABAC, Audit, Error）の実装本体。
- `apps/api/tests/api.spec.ts`: 認証、RBACガード、エラーフォーマットテストを担保するJestテスト群。

---

## 3. 追加したエンドポイント一覧
- `GET /health` (パブリック)
- `POST /auth/login` (パブリック)
- `GET /me` (認証必須)
- `POST /admin/accounts` (Admin専用・監査ログ出力)
- `GET /admin/accounts` (Admin専用)
- `PATCH /admin/accounts/:id` (Admin専用・監査ログ出力)
- `POST /admin/compensation-plans` (Admin専用・監査ログ出力)
- `GET /admin/compensation-plans` (Admin専用)

---

## 4. RBACマトリクスの実装結果
以下の通り、指定された権限制御が `requireRoles` ミドルウェアによりAPIレベルで保護されています。

| エンドポイント | 許可ロール | 備考 |
|---|---|---|
| `/auth/login` | 全て | JWT発行 |
| `/me` | 全て (認証済) | - |
| `/admin/*` | `SystemAdmin`, `Admin` | Cast, Staff は 403 エラー(`ACCESS_001`) |

---

## 5. tenant混線テスト / ABAC実装結果
`enforceTenantBoundary` により、APIレイヤでテナント分離を強制しています。
- **結果**: 自身の所属テナントと異なる `tenantId` をリクエスト（クエリやボディ）に指定した場合、`SystemAdmin` を除き **HTTP 403 (`TENANT_001`)** でガードされる動作を担保。
- テストは `api.spec.ts` で Express アプリ側のステータスコードを検証済。

---

## 6. 次フェーズ(M2)に入る前の懸念点や引き継ぎ事項

1. **DBマイグレーションの未完了**: 
   本フェーズでは Prisma Schema の定義 (`schema.prisma`) と TypeScriptのコンパイル疎通までを行いました。M2で実際のDB（DockerのPostgreSQL）に対して `npx prisma migrate dev` を実行し、テーブルを生成しておく必要があります。
2. **監査ログの非同期化**:
   現在はリクエストサイクル内で同期的に Prisma の `createAuditLog` を `await` していますが、今後トラフィックが増えた場合は、キュー（Redis等）へ逃がす非同期待機化が必要です。
3. **CloseGuard（締めロック）**:
   Doc-22 に定義した `CLOSE_001` エラーを返却する仕組みについてはミドルウェアのガワ設計のみです。M3・M4のトランザクション実装時に、`DailyClose` テーブルを引いてロック判定を行う実処理を組み込む必要があります。
