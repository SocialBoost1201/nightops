# NightOps

キャバクラ店舗向け運営SaaS — 勤怠管理＋売上管理＋顧客管理＋給与計算

## クイックスタート

### 前提条件
- Node.js 20+
- pnpm 9+
- Docker / Docker Compose

### セットアップ

```bash
# 1. 依存パッケージインストール
pnpm install

# 2. 環境変数ファイル作成
cp .env.example .env

# 3. DB起動
cd infra && docker-compose up -d && cd ..

# 4. Prisma クライアント生成
pnpm --filter @nightops/api prisma:generate

# 5. DBマイグレーション
pnpm --filter @nightops/api prisma:migrate

# 6. シードデータ投入
pnpm --filter @nightops/api prisma:seed

# 7. 共有パッケージビルド
pnpm --filter @nightops/shared build

# 8. API起動
pnpm --filter @nightops/api dev

# 9. Web管理画面起動（別ターミナル）
pnpm --filter @nightops/web-admin dev
```

### テスト実行

```bash
# 全テスト
pnpm turbo test

# 共有パッケージのみ
pnpm --filter @nightops/shared test
```

### アクセス

| サービス | URL |
|---|---|
| API | http://localhost:3000 |
| Web管理画面 | http://localhost:3001 |
| Prisma Studio | `pnpm --filter @nightops/api prisma:studio` |

### 初期アカウント

| ロール | ログインID | パスワード |
|---|---|---|
| Admin | anim-0001 | Admin1234! |
| Manager | anim-0002 | Manager1234! |

## プロジェクト構成

```
NightOps/
├── apps/api/          NestJS API
├── apps/web-admin/    Next.js 管理画面
├── apps/mobile/       Flutter モバイルアプリ
├── packages/shared/   共有ロジック（計算・型定義）
├── infra/             Docker設定
└── docs/              設計書
```

## 設計書

| 文書 | パス |
|---|---|
| 要件定義書 | docs/01_requirements.md |
| 基本設計書 | docs/02_basic_design.md |
| 詳細設計書 | docs/03_detailed_design.md |
| 技術設計書 | docs/04_technical_design.md |
| テスト設計書 | docs/05_test_design.md |
| 実装計画書 | docs/06_implementation_plan.md |
