# NightOps 詳細設計書

> 文書ID: DD-001  
> バージョン: 2.0  
> 作成日: 2026-02-25  
> 最終更新: 2026-02-25  
> ステータス: 確定

---

## 1. 権限マトリクス（主要操作）

| 操作 | Cast | Staff | Manager | Admin |
|---|---|---|---|---|
| シフト提出 | ○ | ○ | - | - |
| 変更申請 | ○ | ○ | - | - |
| 出勤打刻 | ○ | ○ | - | - |
| 退勤打刻 | - | ○ | - | - |
| あがり確定 | - | - | ○ | ○ |
| 売上入力 | - | - | ○ | ○ |
| 日次締め | - | - | ○ | ○ |
| 顧客統合 | - | - | ○ | ○ |
| 承認（シフト/修正） | - | - | ○ | ○ |
| 給与条件閲覧 | - | - | - | ○ |
| ユーザー作成 | - | - | - | ○ |
| 報酬プラン編集 | - | - | - | ○ |
| 月次確定 | - | - | - | ○ |
| 監査ログ閲覧 | - | - | - | ○ |

---

## 2. 画面入出力項目

### 2-1. ユーザー作成（Admin）

**入力**:

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| displayName | string | ○ | 表示名 |
| userType | enum | ○ | cast / staff |
| role | enum | ○ | Cast / Staff / Manager / Admin |
| employmentStatus | enum | ○ | active / inactive |
| 初期報酬プラン | object | - | 任意で同時作成 |

**出力**:
- `loginId`（自動発行: `{storeCode}-{連番}`）
- `initialPassword`（ワンタイム表示、以後取得不可）

---

### 2-2. 報酬プラン編集（Admin）

**入力**:

| 項目 | 型 | 必須 | バリデーション |
|---|---|---|---|
| effectiveFrom | date | ○ | |
| effectiveTo | date | - | effectiveFrom以降 |
| payType | enum | ○ | hourly_plus_back / commission_plus_back |
| hourlyRate | int | Type1のみ | 0以上 |
| commissionRate | decimal | ○ | 0.00-1.00 |
| inhouseUnit | int | ○ | 0以上 |
| drinkUnit | int | ○ | 0以上 |

**制約**:
- 同一ユーザーの期間重複不可
- 締め済み月の過去適用開始は `ChangeRequest` 扱い

---

### 2-3. 伝票入力（Manager）

**入力**:

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| businessDate | date | ○ | 営業日 |
| partySize | int | ○ | 1以上 |
| mainCastId | UUID | ○ | 本指名主担当 |
| customerName | string | 推奨 | オートサジェスト |
| tableNo | string | - | 卓番 |
| lines | array | ○ | 明細行（itemCode, qty, unitPrice） |
| freeLines | array | - | 自由明細（名称, qty, unitPrice） |
| drinkCounts | array | - | キャスト別杯数（castId, cups） |

**出力**:
- `subtotal`（明細合計）
- `serviceTaxAmount`（小計 × 1.32）
- `totalRounded`（1000円丸め後）

**制約**: 締め済み日の編集不可

---

### 2-4. 当日勤怠（Manager）

**入力**:

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| キャストあがり時間 | time | ○ | 出勤以降 |
| スタッフ退勤漏れ確認 | — | — | 一覧表示 |

**制約**: 日次締め後は編集不可

---

## 3. API仕様（代表）

### 3-1. POST `/auth/login`

**Request**:
```json
{
  "loginId": "anim-0001",
  "password": "string"
}
```

**Response 200**:
```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "role": "Admin",
  "displayName": "管理者"
}
```

---

### 3-2. POST `/users`（Admin）

**Request**:
```json
{
  "displayName": "キャスト花子",
  "userType": "cast",
  "role": "Cast"
}
```

**Response 201**:
```json
{
  "loginId": "anim-0003",
  "initialPassword": "Xk9#mP2w",
  "accountId": "uuid"
}
```

> `initialPassword` はこのレスポンスでのみ返却。

---

### 3-3. POST `/punches/checkin`

**Request**:
```json
{
  "timestamp": "2026-02-25T20:05:00+09:00"
}
```

**Response 201**:
```json
{
  "punchId": "uuid"
}
```

**制約**: 当日二重打刻は禁止（設定で許可可）

---

### 3-4. POST `/cast-checkouts/set`（Manager）

**Request**:
```json
{
  "accountId": "uuid",
  "businessDate": "2026-02-25",
  "checkoutTime": "02:00"
}
```

**Response 201**:
```json
{
  "castCheckoutId": "uuid"
}
```

---

### 3-5. POST `/sales/slips`（Manager）

**Request**:
```json
{
  "businessDate": "2026-02-25",
  "head": {
    "tableNo": "3",
    "customerName": "田中様",
    "partySize": 3,
    "mainCastId": "uuid"
  },
  "lines": [
    { "itemCode": "SET_HOUSE", "qty": 3, "unitPrice": 7000 }
  ],
  "freeLines": [
    { "itemName": "ボトル（モエシャン）", "qty": 1, "unitPrice": 30000 }
  ],
  "drinkCounts": [
    { "castId": "uuid", "cups": 5 }
  ]
}
```

**Response 201**:
```json
{
  "slipId": "uuid",
  "subtotal": 51000,
  "serviceTaxAmount": 67320,
  "totalRounded": 67000
}
```

---

### 3-6. POST `/close/daily`（Manager）

**Request**:
```json
{
  "businessDate": "2026-02-25"
}
```

**Response 200**:
```json
{
  "closeId": "uuid",
  "status": "closed",
  "warnings": [
    { "type": "CAST_NO_CHECKOUT", "accountId": "uuid", "displayName": "..." }
  ]
}
```

**制約**: 未入力があれば `warnings` を返し、`forceClose` フラグがない限り締め不可

---

### 3-7. GET `/reports/monthly`

**Request**: `?month=2026-02`

**Response 200**:
```json
{
  "castSummaries": [...],
  "rankings": [...],
  "exportLinks": { "csv": "/reports/monthly/export?month=2026-02" }
}
```

---

### 3-8. GET `/payroll/monthly`

**Request**: `?month=2026-02`

**Response 200**:
```json
{
  "payrollRows": [
    {
      "accountId": "uuid",
      "displayName": "キャスト花子",
      "workMinutes": 5400,
      "hourPay": 270000,
      "salesSubtotal": 1500000,
      "commission": 150000,
      "inhouseCount": 20,
      "drinkCount": 50,
      "total": 445000
    }
  ]
}
```

---

## 4. DBカラム定義

### 4-1. `tenants`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| tenant_id | UUID | PK | |
| name | TEXT | NOT NULL | テナント名 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

---

### 4-2. `store_settings`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| tenant_id | UUID | PK, FK → tenants | |
| store_code | TEXT | UNIQUE | 店舗コード |
| service_tax_multiplier | NUMERIC | DEFAULT 1.32 | 税＋サービス係数 |
| rounding_unit | INT | DEFAULT 1000 | 丸め単位 |
| rounding_threshold | INT | DEFAULT 500 | 繰上げ閾値 |
| inhouse_default | INT | DEFAULT 1000 | 場内バック標準単価 |
| drink_default | INT | DEFAULT 100 | ドリンクバック標準単価 |

---

### 4-3. `accounts`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| account_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| login_id | TEXT | UNIQUE per tenant | `{storeCode}-{連番}` |
| password_hash | TEXT | NOT NULL | bcrypt |
| role | TEXT | NOT NULL | Cast/Staff/Manager/Admin |
| status | TEXT | NOT NULL DEFAULT 'active' | active/inactive/locked |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

---

### 4-4. `user_profiles`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| account_id | UUID | PK, FK → accounts | |
| tenant_id | UUID | FK, INDEX | |
| display_name | TEXT | NOT NULL | 表示名 |
| user_type | TEXT | NOT NULL | cast / staff |
| employment_status | TEXT | NOT NULL DEFAULT 'active' | 在籍状態 |

---

### 4-5. `compensation_plans`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| plan_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| account_id | UUID | FK, INDEX | |
| effective_from | DATE | NOT NULL | 適用開始 |
| effective_to | DATE | NULL | 適用終了 |
| pay_type | TEXT | NOT NULL | hourly_plus_back / commission_plus_back |
| hourly_rate | INT | NULL | 時給 |
| commission_rate | NUMERIC | NULL | 売上バック率 |
| inhouse_unit | INT | NOT NULL DEFAULT 1000 | 場内単価 |
| drink_unit | INT | NOT NULL DEFAULT 100 | ドリンク単価 |

---

### 4-6. `shift_entries`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| shift_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| account_id | UUID | FK, INDEX | |
| period_start | DATE | NOT NULL | 提出期間開始 |
| period_end | DATE | NOT NULL | 提出期間終了 |
| date | DATE | NOT NULL | シフト日 |
| planned_start | TIME | NULL | 予定出勤 |
| planned_end | TIME | NULL | 予定退勤 |
| memo | TEXT | NULL | |
| status | TEXT | NOT NULL DEFAULT 'submitted' | submitted / approved |

---

### 4-7. `punch_events`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| punch_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| account_id | UUID | FK, INDEX | |
| business_date | DATE | NOT NULL, INDEX | 営業日 |
| type | TEXT | NOT NULL | checkin / checkout |
| timestamp | TIMESTAMPTZ | NOT NULL | 打刻時刻 |

---

### 4-8. `cast_checkouts`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| account_id | UUID | FK, INDEX | |
| business_date | DATE | NOT NULL | 営業日 |
| checkout_time | TIME | NOT NULL | あがり時間 |
| set_by_account_id | UUID | FK | 確定した管理者 |

---

### 4-9. `customers`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| customer_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| name | TEXT | NOT NULL, INDEX | 顧客名 |
| kana | TEXT | NULL | ふりがな |
| memo | TEXT | NULL | |

---

### 4-10. `sales_slips`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| slip_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| business_date | DATE | NOT NULL, INDEX | 営業日 |
| table_no | TEXT | NULL | 卓番 |
| customer_id | UUID | NULL, FK | |
| customer_name_raw | TEXT | NULL | 入力時の顧客名 |
| party_size | INT | NOT NULL | 人数 |
| main_cast_id | UUID | NOT NULL, FK | 主担当 |
| subtotal | INT | NOT NULL | 小計 |
| service_tax_amount | INT | NOT NULL | 税＋サービス |
| total_rounded | INT | NOT NULL | 総計（丸め後） |
| status | TEXT | NOT NULL DEFAULT 'draft' | draft / closed |
| closed_by | UUID | NULL | 締めた管理者 |

---

### 4-11. `sales_lines`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| line_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| slip_id | UUID | FK, INDEX | |
| item_code | TEXT | NOT NULL | 項目コード |
| item_name | TEXT | NOT NULL | 項目名 |
| qty | NUMERIC | NOT NULL | 数量 |
| unit_price | INT | NOT NULL | 単価 |
| amount | INT | NOT NULL | 金額 |

---

### 4-12. `drink_counts`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| slip_id | UUID | FK, INDEX | |
| cast_id | UUID | FK, INDEX | キャスト |
| cups | INT | NOT NULL | 杯数 |

---

### 4-13. `daily_closes`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| close_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| business_date | DATE | UNIQUE per tenant | 営業日 |
| closed_by | UUID | FK | |
| closed_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

---

### 4-14. `change_requests`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| request_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| target_type | TEXT | NOT NULL | 対象種別 |
| target_id | UUID | NOT NULL | 対象ID |
| reason | TEXT | NOT NULL | 申請理由 |
| status | TEXT | NOT NULL DEFAULT 'pending' | pending/approved/rejected |
| requested_by | UUID | FK | 申請者 |
| approved_by | UUID | NULL, FK | 承認者 |
| approved_at | TIMESTAMPTZ | NULL | 承認日時 |
| diff_json | JSONB | NOT NULL | 変更内容 |

---

### 4-15. `audit_logs`

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| log_id | UUID | PK | |
| tenant_id | UUID | FK, INDEX | |
| actor_id | UUID | FK | 操作者 |
| action | TEXT | NOT NULL | 操作種別 |
| target_type | TEXT | NOT NULL | 対象種別 |
| target_id | UUID | NOT NULL | 対象ID |
| before_json | JSONB | NULL | 変更前 |
| after_json | JSONB | NULL | 変更後 |
| reason | TEXT | NULL | 理由 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |

> `audit_logs` には DELETE 権限を付与しない（削除不可）

---

## 5. インデックス方針

| 方針 | 対象 |
|---|---|
| `tenant_id` は全テーブル必須インデックス | 全テーブル |
| `business_date` は勤怠と売上の集計にインデックス | punch_events, sales_slips, daily_closes |
| `login_id` はテナント内ユニーク | accounts |
| `name` は検索用インデックス | customers |
| `account_id` + `business_date` の複合インデックス | punch_events, cast_checkouts |
| `slip_id` のインデックス | sales_lines, drink_counts |
