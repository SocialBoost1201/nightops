# Doc-21 ER最終確定版

> プロジェクト: NightClub SaaS  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. テーブル一覧（全19テーブル）

| 物理名 | 論理名 | 用途 |
|---|---|---|
| `tenants` | テナント | 顧客システムのルート |
| `store_settings` | 店舗設定 | テナント付随の設定・マスタ |
| `accounts` | アカウント | 認証およびユーザー基盤 |
| `user_profiles` | ユーザープロファイル | 名前・属性等の表示情報 |
| `compensation_plans` | 給与条件（プラン） | 報酬体系の設定履歴 |
| `shift_entries` | シフト提出 | キャスト・スタッフのシフト |
| `punch_events` | 勤怠打刻 | 出退勤の打刻履歴 |
| `cast_checkouts` | あがり時間 | キャストの勤務終了時間 |
| `price_items` | 料金マスタ | テナント固有の料金アイテム |
| `customers` | 顧客マスタ | 顧客情報 |
| `customer_merges` | 顧客統合履歴 | 顧客の統合関係 |
| `sales_slips` | 売上伝票 | 顧客の1回の来店清算 |
| `sales_lines` | 売上明細 | 伝票の明細行 |
| `drink_counts` | ドリンク杯数 | キャストへのドリンクバック小計 |
| `daily_closes` | 日次締め | 営業日の締め状態管理 |
| `monthly_closes` | 月次確定 | 給与月次の締め状態管理 |
| `change_requests` | 修正申請 | 締め後の変更要求 |
| `audit_logs` | 監査ログ | 操作履歴の不変記録 |
| `notifications` | 通知キュー | ユーザーへの通知配信状態 |

---

## 2. 制約・リレーション設計（全テーブル）

- **Primary Keys**: 全テーブル UUID（`uuid()` デフォルト生成）、名称は論理的に `[table]_id`（例: `customer_id`）にマッピング。
- **Foreign Keys**: `tenant_id` を全テーブルに付与（`tenants.id` を参照）。また、`account_id`（作成者・関連者等の追跡）を配置。ON DELETE CASCADE は原則禁止し RESTRICT とする（MVP設計）。
- **Unique Constraints**:
  - `accounts`: `login_id`
  - `store_settings`: `store_code`
  - `price_items`: `(tenant_id, item_code)`
  - `daily_closes`: `(tenant_id, business_date)`
  - `monthly_closes`: `(tenant_id, month)`

---

## 3. テナント強制分離の方式

本SaaSにおける横流し・データ漏洩防止の確実なブロック手段は以下とする。

1. **アプリガード（Authentication/RBAC層）**
   JWT トークンから取得した `tenantId` を API Request のコンテキストに自動バインドする（NestJS Guards）。
2. **クエリ規約（サービス層での強制）**
   `Prisma Client` 呼び出しの `where` 句に必ず `tenantId` を含める。
3. **DB制約（データベース層）**
   `AuditLog`, `DailyClose` などを除くマスター系・トランザクション系全テーブルで `tenantId` を FK 制約対象に含める。

---

## 4. インデックス設計

> 必須インデックス設計とその理由

| インデックス定義 | 対象テーブル | 理由・効果 |
|---|---|---|
| `idx_[table]_tenant` | 全テーブル | APIにおいて必ず `WHERE tenant_id = ?` が走るため、カバリングインデックスとして機能。 |
| `idx_accounts_login` | `accounts` | ログイン時の検索用。 |
| `idx_audit_logs_target` | `audit_logs` | `(tenant_id, target_type, target_id)` 複合インデックス。特定の申請や伝票に関する履歴をソート抽出するため。 |
| `idx_sales_slips_date` | `sales_slips` | `(tenant_id, business_date)` 日次締め確認・集計画面での特定営業日抽出を高速化。 |

---

## 5. データ量見積もりとボトルネック予測

**想定モデル（中規模1店舗）**:
- キャスト/スタッフ数: 20名
- 1日の来店客・伝票数: 100枚
- 1伝票の明細平均: 3行

**1年間の増加レコード数**:
- `sales_slips`: 約 36,000 件
- `sales_lines`: 約 100,000 件
- `punch_events`: 約 14,000 件
- `audit_logs`: 約 180,000 件（1日500件想定）

**ボトルネック考察と解決**:
単一テナントのデータは1年で最大 30万レコード（監査ログ含む）程度に収まる。現在のインデックス設計（`tenant_id` 単独、複合を含む）と PostgreSQL (v15) であれば、数百万単位でも B-Tree インデックススキャンが有効なため **MVP のフェーズにおいてDBレベルのボトルネックは発生しない** と断定する。
