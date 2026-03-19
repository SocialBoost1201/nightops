# NightOps 実装計画書

> 文書ID: IMPL-001  
> バージョン: 2.0  
> 作成日: 2026-02-25  
> 最終更新: 2026-02-25  
> ステータス: 確定

---

## 1. マイルストーン

| # | マイルストーン | 内容 |
|---|---|---|
| M0 | 環境構築 | リポジトリ作成、Docker Compose、CI、DBマイグレーション基盤 |
| M1 | 認証・基盤 | 認証、RBAC、ユーザー管理（Admin）、監査ログ基盤 |
| M2 | シフト | シフト提出と承認（モバイル＋Web） |
| M3 | 勤怠 | 勤怠打刻、あがり入力、日次締め（勤怠） |
| M4 | 売上 | 売上伝票入力、計算、日次締め（売上） |
| M5 | 顧客 | 顧客台帳、検索、統合 |
| M6 | 集計 | 集計、ランキング、CSV |
| M7 | 給与 | 給与月次集計、月次確定、CSV |
| M8 | 仕上げ | 通知、監視、運用手順、受入テスト |

---

## 2. PR分割方針

- **小さく、壊さない**
- 1PRは1機能、1日でレビュー可能な差分
- 計算ロジックは必ずテストとセット
- 締めロックと監査ログは後回しにしない

---

## 3. 重要リスクと対策

| リスク | 対策 |
|---|---|
| 計算のズレ | 純粋関数化、テストケース先行、実伝票受入テスト |
| 締め忘れ | 未締めアラート、締め前チェック強制 |
| 権限漏れ | APIガード、E2Eで403検証、監査ログ |
| マルチテナント混線 | tenantId強制、統合テストで混線検証 |

---

## 4. 実装順序

```
API → Web管理 → モバイル
```

**理由**: 権限、締め、計算をサーバで保証し、UIは薄くする

---

## 5. ローカル検証

- Docker で db、api、web を起動
- モバイルは Flutter で起動し API 接続
- テストは CI とローカルで同じコマンドに統一

```bash
# 起動
cd infra && docker-compose up -d
pnpm --filter @nightops/api dev
pnpm --filter @nightops/web-admin dev

# テスト
pnpm turbo test
```

---

## 6. 設計書一覧（全確定）

| # | 文書 | バージョン | ステータス |
|---|---|---|---|
| 1 | [要件定義書](file:///Users/takumashinnyo/Workspace/projects/NightOps/docs/01_requirements.md) | v1.1 | 確定 |
| 2 | [基本設計書](file:///Users/takumashinnyo/Workspace/projects/NightOps/docs/02_basic_design.md) | v2.0 | 確定 |
| 3 | [詳細設計書](file:///Users/takumashinnyo/Workspace/projects/NightOps/docs/03_detailed_design.md) | v2.0 | 確定 |
| 4 | [技術設計書](file:///Users/takumashinnyo/Workspace/projects/NightOps/docs/04_technical_design.md) | v2.0 | 確定 |
| 5 | [テスト設計書](file:///Users/takumashinnyo/Workspace/projects/NightOps/docs/05_test_design.md) | v2.0 | 確定 |
| 6 | [実装計画書](file:///Users/takumashinnyo/Workspace/projects/NightOps/docs/06_implementation_plan.md) | v2.0 | 確定 |
