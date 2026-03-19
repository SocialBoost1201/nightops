## 概要

M1フェーズとして、販売前提SaaSの基盤（認証、RBAC/ABAC、監査ログ、エラー統一、コアDBスキーマ）を実装しました。売上・勤怠・給与などの業務機能は実装していません。

## スコープ（M1で実装したもの）

- APIプロジェクト骨格（TypeScript / Jest / Docker DB前提）
- Prisma schema（Doc-21のERを反映、tenantId必須、主要制約とインデックス）
- 認証（POST /auth/login、JWT、GET /me）
- RBAC/ABAC（ロール制御、tenant境界強制）
- 監査ログ（correlationId、重要操作のBEFORE/AFTER記録）
- エラー統一（Doc-11形式、HTTPステータス規約）
- 管理者向け最小API
  - GET/POST/PATCH /admin/accounts
  - GET/POST /admin/compensation-plans

## スコープ外（M1ではやっていない）

- シフト提出、打刻、あがり入力
- 売上入力、顧客管理、通知、集計
- 締め処理本体と補正（仕込みのみ。業務ロジックは未実装）
- 月次給与計算本体
- UIの作り込み

## 重要設計の整合性

- Doc-07 / Doc-22 を更新し、SystemAdmin（SaaS運営者）を正式ロールとして定義し、M1実装との整合性を確保しました。
- tenant跨ぎ操作はSystemAdminのみ（通常運用入力は原則禁止）。跨ぎアクセス時は監査ログへ理由（reason）を残す方針です。
- /system/_ はPhase2で導入予定、/admin/_ は店舗Admin専用を維持します。

## 動作確認・テスト

- Jest単体テストで以下を確認済み
  - 認証成功/失敗
  - RBAC拒否（403）
  - tenant境界（ABAC）違反の拒否
  - エラー形式の統一
  - 監査ログ出力（AdminのPOST/PATCH）

## 追加ドキュメント

- docs/Doc-25_m1_implementation_notes.md にM1の実装範囲と引き継ぎ事項を記載

## 次フェーズ（M2）開始条件

- PRマージ後、docker DBへ migrate/dev を適用し、トランザクション作成を確認
- tenant境界の戻り値方針（404/403）をDoc-24に合わせて最終固定
- シフト・勤怠・締めの順で実装開始

## チェックリスト

- [ ] M1は基盤のみで、業務機能を実装していない
- [ ] tenantId必須・分離がコードで担保されている
- [ ] RBAC/ABACが最低限動作し、テストがある
- [ ] 監査ログが重要操作で必ず出る
- [ ] エラー形式がDoc-11に準拠
- [ ] SystemAdminの定義がDoc-07/Doc-22に反映済み

レビューポイント（自分用）

- schema.prisma のtenantId必須とインデックス
- enforceTenantBoundary の実装方針（クライアントtenantId入力の扱い）
- auditログにcorrelationIdが必ず残ること
- /admin/\* がAdmin以外を確実に拒否すること

PR作成後に行うこと

- PR URLを出力
- CI結果（pass/fail）を報告
- 指摘が出た場合は最小差分で修正し、追加コミットで対応する
