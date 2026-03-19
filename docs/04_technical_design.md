# NightOps 技術設計書

> 文書ID: TD-001  
> バージョン: 2.0  
> 作成日: 2026-02-25  
> 最終更新: 2026-02-25  
> ステータス: 確定

---

## 1. 採用スタック（MVP固定案）

| レイヤー | 技術 | 備考 |
|---|---|---|
| モバイル | Flutter | iOS/Android同時対応 |
| Web管理 | Next.js (TypeScript) | App Router |
| API | Node.js (NestJS) | Webとの型共有が容易、Macでの開発が軽い |
| DB | PostgreSQL | マネージド推奨 |
| ORM | Prisma | 型安全、マイグレーション管理 |
| 認証 | JWT (access + refresh) | bcrypt |
| 通知 | Firebase Cloud Messaging | Phase2で本格導入 |
| 監視 | Sentry | Web、API、モバイル |
| CI | GitHub Actions | |
| ローカル環境 | Docker Compose | api、db、web |

> ASP.NET Core も候補だが、Webとの型共有・Mac開発の軽さからNode.js (NestJS) を推奨採用。

---

## 2. マルチテナント方式

**方式**: shared database、shared schema、`tenantId` で分離

**必須ルール**:
- 全クエリで `tenantId` をスコープ
- 認可ミドルウェアで `tenantId` を強制
- ユニーク制約は `tenantId` を含める（`login_id`、`business_date` + close 等）

```typescript
// Prisma Middleware で tenantId を自動付与
prisma.$use(async (params, next) => {
  const tenantId = cls.get('tenantId');
  if (tenantId && params.model !== 'Tenant') {
    if (['findMany', 'findFirst', 'findUnique'].includes(params.action)) {
      params.args.where = { ...params.args.where, tenantId };
    }
    if (params.action === 'create') {
      params.args.data = { ...params.args.data, tenantId };
    }
  }
  return next(params);
});
```

---

## 3. 認証と認可

### 3-1. 認証フロー
- ログインIDは管理者発行（`{storeCode}-{連番}`）
- 初回PW変更必須（`password_changed_at` が NULL なら強制変更画面へ遷移）
- JWT: accessToken (15分) + refreshToken (7日)

### 3-2. RBAC
- `role` と `userType` でガード
- Cast / Staff は自分の `accountId` 以外へアクセス不可
- Manager は店舗内の勤怠・売上・顧客にアクセス可
- Admin は店舗内の全データにアクセス可

```typescript
// NestJS Guard チェーン
JwtAuthGuard        // トークン検証
  → TenantGuard     // tenantId 設定・検証
  → RolesGuard      // @Roles('Admin', 'Manager') デコレータ
  → OwnershipGuard  // Cast/Staff は自分のリソースのみ
```

### 3-3. ログイン試行制限
- 失敗5回で30分ロック（`status = 'locked'`）
- ロック解除: 管理者手動 or 30分後自動

---

## 4. 締めとロック設計

### 4-1. 日次締め
- `daily_closes` が存在する `business_date` のデータは編集不可
- 全API書き込み時に `daily_closes` の存在チェックを実施
- 存在する場合は `409 ALREADY_CLOSED` を返却

### 4-2. 修正例外
- `ChangeRequest` が承認されると、専用の補正処理で変更
- 変更前後のデータを監査ログに記録

### 4-3. 月次確定
- `monthly_close` が存在する年月の給与データはロック
- 再確定は `version` をインクリメントし監査ログに記録

---

## 5. 計算ロジック実装

- 売上計算、丸め、給与計算は**純粋関数**で実装
- `packages/shared/src/calculations/` に配置し、単体テストで保証
- UI側は計算結果を表示するのみ
- 計算の入力は DB から取得した**締め済みデータに限定**

```
packages/shared/src/calculations/
├── sales.ts     # calculateSubtotal, calculateTaxService, roundGrandTotal
├── payroll.ts   # calculateHourlyPay, calculateCommission, calculateTotalPay
└── index.ts
```

---

## 6. 監査ログ

- 全ての重要操作を必ず記録
- **削除不可**（DELETEトリガーで防止 or DBロール権限で制御）
- 個人情報はMVPで最小のため、差分JSONをそのまま保持可能
- `audit_logs` テーブルに永続保存

```json
{
  "log_id": "uuid",
  "tenant_id": "uuid",
  "actor_id": "uuid",
  "action": "UPDATE",
  "target_type": "punch_events",
  "target_id": "uuid",
  "before_json": { "timestamp": "2026-02-25T20:00:00" },
  "after_json": { "timestamp": "2026-02-25T20:05:00" },
  "reason": "打刻時刻の修正",
  "created_at": "2026-02-25T03:00:00Z"
}
```

---

## 7. デプロイ構成（最小）

### 7-1. 環境

| 環境 | 用途 | 構成 |
|---|---|---|
| dev | ローカル開発 | Docker Compose |
| staging | 検証 | クラウド（Phase2） |
| prod | 本番 | クラウド |

### 7-2. 構成方針
- API と Web は同一ホスティングでも可
- DB はマネージド PostgreSQL
- バックアップ: 日次
- ログ: クラウドログ＋例外監視（Sentry）

### 7-3. 環境変数管理

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/nightops
JWT_SECRET=secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
SENTRY_DSN=
NODE_ENV=development
```

---

## 8. セキュリティ最低ライン

| 対策 | 実装方法 |
|---|---|
| パスワードハッシュ | bcrypt (cost factor: 12) |
| CORS制御 | NestJS enableCors、ホワイトリスト方式 |
| レート制限 | NestJS ThrottlerModule |
| SQLインジェクション対策 | Prisma ORM（パラメタライズドクエリ）+ class-validator |
| 秘密情報管理 | 環境変数（.env、git管理外） |
| セキュリティヘッダ | helmet.js |
| XSS | React/Next.js 自動エスケープ |

---

## 9. 開発環境（ユーザー環境前提）

| 項目 | 仕様 |
|---|---|
| 開発PC | MacBook Air M1 16GB |
| Xcode | iOSビルド用（Flutter経由） |
| Android SDK | Androidビルド用（Flutter経由） |
| Docker Desktop | 必須（DB、API のローカル実行） |
| Node.js | 20+ |
| pnpm | 9+ |
| Flutter | 3.x |

---

## 10. リポジトリ構成

```
NightOps/
├── apps/
│   ├── api/           NestJS API
│   ├── web-admin/     Next.js 管理画面
│   └── mobile/        Flutter アプリ
├── packages/
│   └── shared/        型定義・計算ロジック共有
├── infra/
│   └── docker-compose.yml
├── docs/              設計書
├── .github/workflows/ CI
└── README.md
```

- **pnpm workspaces** でモノレポ管理
- **Turborepo** でビルド・テストの並列実行とキャッシュ
- `packages/shared` は API・Web で共有
- Flutter は型定義を手動同期（Phase2 でコード生成検討）
