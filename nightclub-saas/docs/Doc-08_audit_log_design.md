# Doc-08 監査ログ設計書

> プロジェクト: NightOps  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. 目的

本設計書は、本システムにおける監査ログ（Audit Log）の完全仕様を定義する。

**目的**:
- 締め後データの改ざん検知
- 給与計算の透明性確保
- テナント間トラブル回避
- 内部不正抑止
- SaaS販売時の信頼性担保

> 監査ログは **削除不可・改ざん不可・追記のみ可能**。

---

## 2. 監査ログ対象イベント

### 2-1. アカウント関連
- ユーザー作成
- ユーザー無効化
- パスワード再発行
- ロール変更
- tenant変更（SystemAdminのみ）

### 2-2. 報酬関連
- CompensationPlan 作成
- CompensationPlan 変更
- 適用期間変更
- バック単価変更

### 2-3. 勤怠関連
- あがり時間確定
- 打刻修正
- シフト承認
- 日次締め（勤怠）
- 締め解除（将来）

### 2-4. 売上関連
- SalesSlip 作成
- SalesSlip 修正
- SalesSlip 削除（締め前のみ）
- 顧客統合
- DrinkCount 修正
- 日次締め（売上）

### 2-5. 給与関連
- 月次給与確定
- 再確定
- 手動補正

### 2-6. 修正申請関連
- ChangeRequest 作成
- 承認
- 却下

---

## 3. ログスキーマ定義

テーブル名: `audit_logs`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | |
| tenant_id | UUID | NOT NULL, FK, INDEX | |
| actor_account_id | UUID | NOT NULL, FK | 操作者 |
| actor_role | TEXT | NOT NULL | 操作時のロール |
| action_type | TEXT | NOT NULL | 操作種別 |
| target_type | TEXT | NOT NULL | 対象種別 |
| target_id | UUID | NOT NULL | 対象ID |
| before_data | JSONB | NULL | 変更前 |
| after_data | JSONB | NULL | 変更後 |
| reason | TEXT | NULL | 理由 |
| request_id | UUID | NULL | 関連 ChangeRequest |
| correlation_id | UUID | NULL | 関連操作のグルーピング |
| ip_address | TEXT | NULL | IPアドレス |
| user_agent | TEXT | NULL | ユーザーエージェント |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

---

## 4. beforeData / afterData 方針

- 変更前後の差分を保持
- 給与数値は保持するが **パスワード等は除外**
- 個人情報最小化

---

## 5. 保存期間

- **MVP**: 無期限保存
- **将来**: テナント単位で保持期間設定可

---

## 6. 改ざん防止

| 対策 | 方法 |
|---|---|
| DELETE 禁止 | DBロール権限で制御 |
| UPDATE 禁止 | DBロール権限で制御 |
| INSERT のみ許可 | アプリ側で編集APIなし |
| DB権限分離 | audit_logs への書き込み専用ロール |
| 閲覧制限 | SystemAdmin / Admin のみ |

---

## 7. 表示仕様

Admin画面:
- 期間指定
- actionType フィルタ
- targetType フィルタ
- actor フィルタ
- CSV出力

> Cast / Staff は閲覧不可

---

## 8. パフォーマンス対策

| インデックス | 用途 |
|---|---|
| `created_at` | 期間検索 |
| `tenant_id` | テナント分離 |
| `target_type` + `target_id` | 対象検索 |
| JSONB（必要に応じて） | 詳細検索 |

---

## 9. テスト項目

| テスト | 検証内容 |
|---|---|
| 締め後変更ログ | 締め後の ChangeRequest 承認でログ生成 |
| 給与条件変更ログ | CompensationPlan 変更でbefore/after記録 |
| 削除不可テスト | DELETE文が禁止されること |
| tenant混線テスト | 他テナントのログが見えないこと |

---

## 10. MVP仮定

| 仮定 | 理由 |
|---|---|
| ログの暗号化は未実装 | MVPでは平文保存 |
| 外部ログ転送は未実装 | Phase2 で対応 |
| ハッシュチェーンは Phase2 | 改ざん検出の強化 |

---

## 11. 完了条件

- 全重要操作でログ生成確認
- 削除不可保証
- 承認フロー連動確認
