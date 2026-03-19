# Doc-23 計算ロジック仕様確定

> プロジェクト: NightClub SaaS  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. 伝票計算（小計・総計・丸め）

### 1-1. 小計ロジック
売上伝票（`SalesSlip`）に追加された全明細（`SalesLine`）の `unit_price × quantity` の合計値。
> `subtotal = Σ (unit_price × quantity)`

### 1-2. 係数計算（税引・SC）
マスタ（`StoreSettings`）に定義された `taxRate` (例: 10%) と `serviceRate` (例: 20%) を用いる。
> `serviceTaxMultiplier = 1 + taxRate + serviceRate`  (例: 1.32)

サービス料・消費税を含んだ金額（丸め前総計）は以下で算出:
> `rawTotal = Math.floor(subtotal × serviceTaxMultiplier)`

### 1-3. 丸め仕様（厳密化）
マスタの `roundingUnit`（単位）と `roundingThreshold`（閾値）を利用し、以下の計算式で丸め済総計（`totalRounded`）を出す。

> **計算式**: `Math.floor((rawTotal + (roundingUnit - roundingThreshold)) / roundingUnit) * roundingUnit`

**具体例 (単位=1000, 閾値=500)**:
- `rawTotal: 48,840` の場合: `floor((48840 + 500)/1000) * 1000 = floor(49.34) * 1000 = 49,000`
- `rawTotal: 48,499` の場合: `floor((48499 + 500)/1000) * 1000 = floor(48.999) * 1000 = 48,000`

---

## 2. バック計算式（キャスト報酬）

キャストのバック対象は以下の合算となる。

| 種別 | 計算データソース | 計算式 |
|---|---|---|
| **本指名バック** | `sales_lines` (担当分) | `Σ (対象明細の金額) × salesBackRate` |
| **場内指名バック** | `sales_lines` (場内分) | `(場内指名回数) × jonaiBackRate` |
| **ドリンクバック** | `drink_counts` | `(提供杯数) × drinkBackRate` |

※バック金額はすべてその日の **日次計算（DailyPayroll）** の時点で確定し、端数は `Math.floor()` で切り捨てる。

---

## 3. 給与合算仕様（時給制・歩合制）

キャストの `CompensationPlan.type` により「基本給」の算出ロジックが分岐する。

### 3-1. 時給制 (HOURLY)
- **基本給** = `(実働分 / 60) × hourlyRate` (※分単位で精緻に計算後、円未満切り捨て)
- **総支給額** = `基本給 + (各種バック合計)`

### 3-2. 歩合制 (COMMISSION)
- **基本給** = `キャスト全体の売上小計 × commissionRate` (売上バック)
- **総支給額** = `基本給 + (各種バック合計)`

---

## 4. 締め後補正の会計・給与反映（差分追加方式）

**原則**: 一度締められた伝票（`status = closed`）や打刻は絶対に上書き（UPDATE）しない。

**修正フローの確定例**:
1. 「4/1の伝票A（総計10,000円）について、ドリンク1杯（1,000円）のつけ忘れがあった」
2. Manager が **ChangeRequest** を作成。
3. Admin が承認。
4. システムは、4/1（過去日付）の売上として `CorrectionSlip`（補正伝票: 小計+1000, 総計+1320）を INSERT する。
5. 担当キャストの給与も過去日付の `CorrectionPayroll` として再計算分の差額（ドリンクバック +100円）が INSERT される。
6. 月次確定時、これらの `Correction` レコードも合算されて最終的な月給が算出される。
