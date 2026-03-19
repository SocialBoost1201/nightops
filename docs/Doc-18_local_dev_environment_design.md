# Doc-18 ローカル開発環境設計書

> プロジェクト: NightOps  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. 目的

本設計書は、Antigravity上で安全に開発・検証できるローカル開発環境構成を定義する。

- 誰でも同じ手順で起動可能
- 環境差異ゼロ
- テスト自動実行可能
- マルチテナント前提構造

---

## 2. リポジトリ構成

monorepo構成

```
/
├─ apps/
│   ├─ api/
│   ├─ web-admin/
│   └─ mobile/
├─ packages/
│   └─ shared/
├─ docs/
├─ infra/
├─ docker-compose.yml
└─ README.md
```

---

## 3. 使用技術（確定）

- **API**: Node + TypeScript + Express (※NestJS)
- **DB**: PostgreSQL
- **ORM**: Prisma
- **Web**: Next.js
- **Mobile**: Flutter（MVPはWeb優先）
- **テスト**: Jest

---

## 4. Docker構成

`docker-compose.yml`

```yaml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: nightclub
    ports:
      - "5432:5432"

  api:
    build: ./apps/api
    depends_on:
      - db
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://app:app@db:5432/nightclub

  web:
    build: ./apps/web-admin
    ports:
      - "3000:3000"
```

---

## 5. 起動手順

1. クローン
   `git clone <repo>`
2. 依存インストール
   `npm install`
3. DB起動
   `docker compose up -d db`
4. Prismaマイグレーション
   `npx prisma migrate dev`
5. API起動
   `npm run dev --workspace=api`
6. Web起動
   `npm run dev --workspace=web-admin`

**確認**: `http://localhost:3000`

---

## 6. 環境変数

`.env`

```env
DATABASE_URL=...
JWT_SECRET=...
PORT=4000
NODE_ENV=development
```
※本番用は `.env.production`

---

## 7. シードデータ

**初期データ投入**:
- storeCode=anim
- Adminアカウント
- Castテストユーザー5名
- Staff2名
- テンプレ料金マスタ
- バック設定

**コマンド**:
`npx prisma db seed`

---

## 8. テスト実行手順

- **単体テスト**: `npm run test`
- **カバレッジ**: `npm run test:coverage`
- **締めロックテスト**: `npm run test -- close`

---

## 9. よくある詰まりと回避

| 症状 | 対策 |
|---|---|
| 9-1. ポート競合 | 3000/4000変更 |
| 9-2. DB接続不可 | docker compose ps 確認 |
| 9-3. マイグレーション失敗 | prisma migrate reset |
| 9-4. JWTエラー | JWT_SECRET確認 |

---

## 10. 開発ルール

- 直接DB変更禁止
- 必ず Prisma 経由
- テスト通過後のみ PR
- 締めロジック変更時は全テスト再実行

---

## 11. 完了条件

- docker起動成功
- API応答成功
- Web表示成功
- テスト全通過
- シード正常投入
