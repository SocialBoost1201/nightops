# Doc-14 設定・マスタ設計書

> プロジェクト: NightOps  
> バージョン: 1.0  
> 作成日: 2026-02-25  
> ステータス: MVP確定版

---

## 1. 目的

- 店舗ごとの料金差異に対応
- 締め済みデータへ遡及影響を防ぐ
- 計算ロジックを純粋関数化
- 拡張容易性を確保

---

## 2. マスタ分類

| # | マスタ | 実装テーブル |
|---|---|---|
| 1 | TenantSettings | `store_settings` |
| 2 | PricingMaster | `price_items` |
| 3 | RoundingSettings | `store_settings` |
| 4 | CoefficientSettings | `store_settings` |
| 5 | DefaultBackSettings | `store_settings` |
| 6 | CompensationPlan | `compensation_plans` |

> MVP では TenantSettings / RoundingSettings / CoefficientSettings / DefaultBackSettings は `store_settings` に統合。

---

## 3. TenantSettings

| カラム | 型 | デフォルト | 説明 |
|---|---|---|---|
| store_code | TEXT | — | 店舗コード |
| shift_cycle_days | INT | 14 | シフト提出周期（日） |
| daily_close_time | TIME | 05:00 | 営業日切替時刻 |
| timezone | TEXT | Asia/Tokyo | タイムゾーン |

---

## 4. PricingMaster

| カラム | 型 | 説明 |
|---|---|---|
| item_code | TEXT | 項目コード |
| item_name | TEXT | 項目名 |
| unit_price | INT | 単価 |
| charge_type | TEXT | PER_PERSON / PER_TIME / PER_COUNT |
| duration_minutes | INT | 時間単位の分数（60分等） |
| apply_per_person | BOOLEAN | 人数課金かどうか |
| sort_order | INT | 表示順 |
| is_active | BOOLEAN | 有効/無効 |

### MVP初期テンプレ（アニモ）

| コード | 名称 | 単価 |
|---|---|---|
| SET_HOUSE | セット（ハウス） | 7,000 |
| SET_FREE_A | セット（フリー）A | 4,000 |
| SET_FREE_B | セット（フリー）B | 5,000 |
| TC | T・C | 6,000 |
| HONSHIMEI | 本指名 | 3,000 |
| DOUHAN | 同伴 | 5,000 |
| BANAI | 場内指名 | 2,000 |
| P1 | P1 | 3,000 |
| P2 | P2 | 3,500 |
| SP | SP | 2,000 |
| SP2 | SP2 | 2,500 |
| SP3 | SP3 | 3,000 |
| SP4 | SP4 | 3,500 |
| TS_60 | T・S 60（延長） | 7,000 |
| TS_30 | T・S 30（延長） | 3,500 |

---

## 5. RoundingSettings

| カラム | 型 | デフォルト |
|---|---|---|
| rounding_unit | INT | 1000 |
| rounding_threshold | INT | 500 |

MVP: 1000円単位、500以上繰上げ、499以下繰下げ

---

## 6. CoefficientSettings

| カラム | 型 | デフォルト |
|---|---|---|
| tax_rate | DECIMAL | 0.10 |
| service_rate | DECIMAL | 0.20 |
| service_tax_multiplier | DECIMAL | 1.32 |

> `service_tax_multiplier = 1 + tax_rate + service_rate`

---

## 7. DefaultBackSettings

| カラム | 型 | デフォルト |
|---|---|---|
| inhouse_default | INT | 1000 |
| drink_default | INT | 100 |

> 個別設定は `CompensationPlan` で上書き可

---

## 8. CompensationPlan（個別）

既存 `compensation_plans` テーブルで管理。制約:
- 期間重複禁止
- 締め済み期間は変更不可

---

## 9. マスタ変更ポリシー

| マスタ | 方針 |
|---|---|
| PricingMaster | 締め前データのみ影響。締め済みデータには影響させない |
| Coefficient | 変更日以降適用。過去データ再計算禁止 |
| Rounding | 変更日以降適用 |

---

## 10. 初期テンプレ適用

テナント作成時:
- アニモテンプレ自動投入
- storeCode 設定
- デフォルトバック設定

---

## 11. 将来拡張

- 複数バック種別、複数丸め方式、売上按分、指名按分

---

## 12. テスト項目

| テスト | 検証内容 |
|---|---|
| 丸め計算一致 | roundTotal 関数の検証 |
| 係数計算一致 | calculateServiceTax の検証 |
| マスタ変更後 | 新規伝票に適用確認 |
| 締め済み不変 | 過去データに影響なし |

---

## 13. 完了条件

- 計算ロジック純粋関数化
- テンプレ自動投入成功
- 締め済み不変保証
- テナント単位完全分離
