# SaaS Validation Report (Step 7)

## 1. はじめに
本ドキュメント(Doc-37)は、SaaS課金基盤の中核となるステータス管理、Webhook処理の堅牢性、およびSystemAdmin向け管理機能に関するバックエンドの整合性検証結果を記録したものです。

## 2. 状態と責務の整理
NightOps SaaS基盤において、課金・契約状況は以下の3つのモデルで厳密に責務を分割して管理されます。

| モデル | 役割・責務 |
|---|---|
| **Tenant** (`status`) | **アプリケーションの論理アクセス制御**。<br>`checkTenantStatus` ガードにより、エンドユーザーの実際の操作権限（Read-Only, Write-Blocked等）を決定します。 |
| **Subscription** (`status`) | **決済プラットフォーム (Stripe) の契約状態のミラー**。<br>Webhook経由で直接更新され、決済の成否や契約期間の事実のみを保持します。 |
| **BillingHistory** | **課金・請求の台帳 (Ledger)**。<br>決済の成功/失敗イベントの都度、金額や決済日時が追記されるイミュータブル（追記型）な履歴データです。 |

## 3. 状態遷移とアクセス制御 (State Transition Table)
Webhookイベントや管理者の操作によって発生する `Tenant` と `Subscription` の状態推移および、それによるアクセス権限は以下の通りです。

| 状態 (status) | 遷移トリガー (Webhook等) | API/システム上のアクセス制御 |
|---|---|---|
| **trial** | 新規テナント作成時 (初期状態) | **フルアクセス** (無料トライアル期間中の利用を想定) |
| **active** | `checkout.session.completed` または<br>`invoice.payment_succeeded` | **フルアクセス** (正常利用) |
| **past_due** | `invoice.payment_failed` | **フルアクセス** (猶予期間。機能制限は行わずUI上で支払いを促す運用) |
| **suspended** | 運営側による手動強制停止 または<br>Webhookイベント `paused` | **書き込み禁止 (Write Blocked / Read Only)**<br>`GET` リクエストのみ許可し、新規データ作成や状態変更をブロック |
| **canceled** | `customer.subscription.deleted` または<br>未払い超過による自動解約 | **書き込み禁止 (Write Blocked / Read Only)**<br>過去のデータエクスポート等のため読み取りのみ許可 |

## 4. Webhook処理の堅牢性検証
Stripe Webhook (`POST /billing/webhook`) において、分散システム特有の課題に対する耐性を実装しました。

### 4.1. 冪等性の担保 (Idempotency)
- **対策内容**: `StripeEvent` テーブルを導入し、Stripeから送られてくる一意の `event.id` を Primary Key として保存。
- **検証結果**: 同一のイベントが複数回、あるいは並列で到達した場合でも、Prismaのユニーク制約(`P2002`)または検索時の存在チェックにより、2回目以降の処理はスキップ(`received: true`のみ返却)され、データの二重更新や二重請求記録による副作用を完全に防ぐ構造が成立しています。

### 4.2. 順不同耐性の担保 (Out-of-Order Handling)
- **対策内容**: 非同期イベントが前後して到着した場合のフェイルセーフを実装。
- **検証結果**: 例として、解約(`deleted`)イベントが先に処理され、遅延した更新(`updated`)イベントが後から届いた場合、ローカルの `Subscription.status` がすでに `canceled` のターミナルステートであれば、以前の(`active`などの)状態に巻き戻さないよう処理をスキップするチェック機構を導入しました。

## 5. SystemAdmin・Admin間の境界分離の検証
- **SaaS運営側 (`/system`)**: 
  - エンドポイントには `requireRoles(['SystemAdmin'])` を適用。
  - テナントをまたいだ全テナントの一覧把握や、SaaS自体への契約制御(suspend/activate)にのみ関与します。
- **SaaS利用側 (`/admin`)**:
  - 各テナント専用の管理エンドポイントには `enforceTenantBoundary` により、自分自身の所属テナント内のリソース(従業員、プラン等)しか操作できません(`Admin`, `Office` ロール)。
  - （※サポート用として `SystemAdmin` が指定テナントIDに入り込んでの操作も可能ですが、その際も `/admin` パスを使用し、職務(コンテキスト)が完全に分離されています。）
- **結論**: `/system` と `/admin` の責務混入は発生していません。

## 6. UI開発移行への判定 (Conclusion)
- **1テナント複数Store構造**: Prismaスキーマにて正常に維持（破壊なし）。
- **テナント単位の課金**: Stripe Customer・Subscription・BillingHistory ともに `tenantId` によるリレーションが完全に結びついています。
- **バックエンド制御**: Webhook耐性および `checkTenantStatus` ミドルウェアの挙動を含め、要件で規定された制御モデル（Read-Only, Write-Blocked）が全てバックエンド層で担保されました。

✅ **判定結果: UI開発工程(フロントエンド全体の実装)へと移行して問題ありません。**
次工程では、SystemAdmin向け画面のブラッシュアップや、テナントAdmin向けの支払い設定画面(Checkoutへの導線)、および `past_due` 時の警告表示UIの構築へ着手することを推奨します。
