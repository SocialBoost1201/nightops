# Doc-07 アクセス制御設計書

> プロジェクト: NightOps  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. 目的

本設計書は、本システムにおけるアクセス制御（RBAC + ABAC）の詳細仕様を定義する。

**目標**:
- テナント混線を絶対に防ぐ
- 権限突破を物理的に不可能にする
- 締め済みデータの改ざんを防ぐ
- 給与情報の漏洩を防ぐ
- 監査ログを改ざん不可にする

---

## 2. アクセス制御モデル

### 2-1. 制御方式

本システムは以下を併用する。

| 方式 | 制御対象 |
|---|---|
| RBAC（Role Based Access Control） | ロール単位で基本操作権限を制御 |
| ABAC（Attribute Based Access Control） | tenantId、accountId、dataOwnerId、closeStatus 等の属性により最終判定 |

---

## 3. ロール定義

### 3-1. Cast
- シフト提出、変更申請
- 自分の勤怠参照
- 出勤打刻のみ
- 自分の履歴参照
- **不可**: 給与条件閲覧、他人データ参照

### 3-2. Staff
- シフト提出、変更申請
- 出退勤打刻
- 自分の履歴参照
- **不可**: 給与条件閲覧

### 3-3. Manager（店長/社長）
- シフト承認
- あがり入力
- 売上入力
- 日次締め
- 修正承認
- 顧客編集
- 集計閲覧
- 給与集計閲覧可
- **不可**: 給与条件閲覧

### 3-4. Admin（店舗管理者）
- Manager権限すべて
- ユーザー管理
- 報酬プラン編集
- 月次確定
- 監査ログ閲覧

### 3-5. SystemAdmin（SaaS運営）
- 全テナント閲覧可
- 給与個別値は閲覧不可（将来オプション）
- 物理削除権限

---

## 4. RBAC 権限マトリクス

操作種別: `Create` / `Read` / `Update` / `Delete` / `Approve` / `Close` / `Export` / `Merge`

### Shift

| ロール | 権限 | 制約 |
|---|---|---|
| Cast | C R U D | 自分のみ、Dは申請のみ |
| Staff | C R U | 自分のみ |
| Manager | R Approve | |
| Admin | R Approve | |

### SalesSlip

| ロール | 権限 | 制約 |
|---|---|---|
| Cast | - | |
| Staff | - | |
| Manager | C R U | 締め前のみ |
| Admin | C R U D | 締め前のみ |

### CompensationPlan

| ロール | 権限 |
|---|---|
| Cast | - |
| Staff | - |
| Manager | R |
| Admin | C R U |

### AuditLog

| ロール | 権限 |
|---|---|
| Cast | - |
| Staff | - |
| Manager | - |
| Admin | R |
| SystemAdmin | R |

> 実装時は全APIと照合表を作成する

---

## 5. ABAC 制御

### 5-1. tenantId 強制

全テーブルに `tenantId` を必須カラムとして保持。APIレイヤで以下を強制。

- JWT内 `tenantId` とリクエスト対象 `tenantId` が一致しない場合 → **403**
- DBクエリは必ず `tenantId` 条件付き
- ミドルウェアで自動付与

### 5-2. 自分データ制御

Cast / Staff の場合:

```sql
WHERE account_id = :currentAccountId
```

が必須。

### 5-3. 締め制御

`closeStatus = closed` の場合:
- Update / Delete 禁止
- **例外**: `ChangeRequest` が `approved` の場合のみ、補正イベントとして処理

### 5-4. 給与データ制御

| リソース | Admin | Manager | Cast/Staff |
|---|---|---|---|
| CompensationPlan | C R U | - | - |
| MonthlyPayroll | R W | R | - |

---

## 6. APIレベル制御方式

### 6-1. ミドルウェア構成

```
AuthMiddleware
  → JWT検証
  → role取得
  → tenantId取得

AuthorizationGuard
  → RBAC判定
  → ABAC判定

CloseGuard
  → 締め済みチェック
```

### 6-2. 判定順

```mermaid
flowchart LR
    A[1. 認証] --> B[2. tenant一致]
    B --> C[3. RBAC]
    C --> D[4. ABAC]
    D --> E[5. 締め状態]
    E --> F[6. 実行]
```

---

## 7. 締め済みロック制御

### 対象リソース

| リソース | 日次締め | 月次確定 |
|---|---|---|
| ShiftEntry | - | - |
| PunchEvent | ○ | - |
| CastCheckout | ○ | - |
| SalesSlip | ○ | - |
| SalesLine | ○ | - |
| DrinkCount | ○ | - |
| CustomerMerge | - | - |
| MonthlyPayroll | - | ○ |

締め済みの場合:
- Update / Delete 直接禁止
- 必ず `ChangeRequest` 経由

---

## 8. 監査ログとの整合

以下操作は必ず `AuditLog` 出力:

| 操作 | 記録内容 |
|---|---|
| ユーザー作成 | before/after |
| ロール変更 | before/after |
| 報酬条件変更 | before/after（適用期間含む） |
| 日次締め | 対象営業日 |
| 月次確定 | 対象年月 |
| 修正承認 | diff_json |
| 顧客統合 | 統合元/統合先ID |

> ログは **削除不可**

---

## 9. セキュリティ最低ライン

| 対策 | 仕様 |
|---|---|
| JWT有効期限 | accessToken: 15分 |
| リフレッシュトークン | 7日 |
| パスワード再発行 | 強制変更（`password_changed_at = NULL`） |
| レート制限 | 60秒100リクエスト |
| 多要素認証 | Phase2 |

---

## 10. MVP仮定

| 仮定 | 理由 |
|---|---|
| Castの給与閲覧は未提供 | 閲覧範囲の確定に時間が必要 |
| 複数本指名按分は未実装 | ルール未確定 |
| テナント単位ロール階層固定 | MVPでは店舗ごとのカスタムロール不要 |

---

## 11. 完了条件

| 条件 | テスト方法 |
|---|---|
| RBAC表とAPI照合完了 | 全エンドポイントの権限テスト |
| tenant混線テスト成功 | tenantA/Bの交差アクセステスト |
| 締め済み編集禁止テスト成功 | 409 ALREADY_CLOSED の確認 |
| Castが給与APIへアクセス不可確認 | 403 の確認 |
