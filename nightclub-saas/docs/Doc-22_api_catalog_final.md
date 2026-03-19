# Doc-22 API最終一覧

> プロジェクト: NightClub SaaS  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. ドメインごとの API エンドポイント一覧

### SaaS運用 (System) - Phase 2

- SystemAdmin専用の管理APIは Phase2 とし、今は存在しない。
- 既存の `/admin/*` は Admin（店舗管理者）専用であることを維持する。
- SystemAdminが `/admin/*` を使う必要がある場合の方針:
  - **原則**: SystemAdminはテナントコンテキスト（`tenantId`）を明示して操作する。
  - **例外**: 運用ツール用の `/system/*` をPhase2で追加する。

### 認証・基盤 (Auth / Users)

- `POST /auth/login`: ログイン・JWT生成
- `POST /auth/refresh`: トークンリフレッシュ
- `POST /auth/change-password`: パスワード変更
- `GET /users`: アカウント一覧（Admin）
- `POST /users`: アカウント作成（Admin）
- `PUT /users/:id/status`: アカウントの有効化・退店設定（Admin）

### 設定・マスター (Settings)

- `GET /settings/tenant`: テンポ設定・丸め規定取得
- `PUT /settings/tenant`: 店舗設定の更新
- `GET /settings/prices`: 料金マスタ一覧取得
- `PUT /settings/prices`: 料金マスタの更新（Admin）

### 勤怠 (Attendance)

- `POST /attendance/shifts`: シフト一括登録
- `GET /attendance/shifts`: シフト取得（承認用・確認用）
- `PUT /attendance/shifts/status`: シフト一括承認（Manager）
- `POST /attendance/punches`: 出退勤打刻・あがり入力
- `GET /attendance/punches/today`: 当日の打刻状態一覧（Manager向け）

### 売上 (Sales)

- `POST /sales`: 売上伝票登録
- `GET /sales`: 伝票一覧・日次フィルタ
- `GET /sales/:id`: 伝票詳細
- `PUT /sales/:id`: 伝票修正（締め前のみ許可）

### 顧客 (Customers)

- `GET /customers`: 顧客検索
- `POST /customers`: 顧客追加
- `POST /customers/:id/merge`: 顧客データの統合（Admin）

### 締め・計算 (Close / Payroll)

- `POST /closes/daily`: 日次締め実行
- `POST /closes/monthly`: 月次確定実行
- `GET /payroll/daily`: キャスト別当日の概算給与照会
- `GET /payroll/monthly`: キャスト別月次給与確認一覧

### 修正申請・通知・ログ (Change / Notifications / Audits)

- `POST /changes`: 修正申請作成（Managerへ）
- `PUT /changes/:id/review`: 修正承認・却下（Manager / Admin）
- `GET /notifications`: 自アカウントの通知一覧
- `PUT /notifications/:id/read`: 既読フラグ更新
- `GET /audits`: システム運用ログ・変更履歴（Admin）

---

## 2. RBAC/ABAC マトリクス（権限可視化）

| リソース            | SystemAdmin | Admin | Manager | Staff | Cast              |
| ------------------- | ----------- | ----- | ------- | ----- | ----------------- |
| アカウント作成/退店 | ✅          | ✅    | ❌      | ❌    | ❌                |
| マスター変更        | ✅          | ✅    | ❌      | ❌    | ❌                |
| 伝票作成/変更       | ✅          | ✅    | ✅      | ✅    | ❌                |
| 顧客統合            | ✅          | ✅    | ❌      | ❌    | ❌                |
| シフト承認          | ✅          | ✅    | ✅      | ❌    | ❌                |
| 日次締め実行        | ✅          | ✅    | ✅      | ❌    | ❌                |
| 修正承認（売上）    | ✅          | ✅    | ✅      | ❌    | ❌                |
| 月次確定実行        | ✅          | ✅    | ❌      | ❌    | ❌                |
| 自給与の参照        | ✅          | ✅    | ✅      | ✅    | ✅ (自データのみ) |
| 他者の給与参照      | ✅          | ✅    | ❌      | ❌    | ❌                |
| 監査ログの閲覧      | ✅          | ✅    | ❌      | ❌    | ❌                |

---

## 3. CloseGuard（締めロック）対象エンドポイント

`DailyClose.status == closed` である日（`businessDate`）に対して、以下の操作をリクエストした場合、アプリケーションの Guard 処理によって `HTTP 409 (CLOSE_001)` が返され弾かれる。

- **`PUT /sales/:id`** : 売上伝票の更新
- **`POST /attendance/punches`** (編集モード) : 該当日の打刻・あがり修正
- **`POST /attendance/shifts`** (編集モード) : 当該日のシフト変更
- **`POST /customers/:id/merge`** : 当日取引のあった顧客の統合処理

※これらの更新を行うには、必ず `POST /changes` による申請を経由し、承認後に行われる `AuditLog` 出力と差分レコード (`CorrectionSlip` など) の自動生成に従う必要がある。
