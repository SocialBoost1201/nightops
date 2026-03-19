/**
 * NightOps 業務エラーコード定義
 * Doc-11 エラーコード・例外設計書 準拠
 */

// ===========================
// エラーレスポンス型
// ===========================

export interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        detail?: string;
        correlationId?: string;
    };
}

// ===========================
// AUTH系
// ===========================

export const AUTH_001 = 'AUTH_001' as const; // 認証失敗
export const AUTH_002 = 'AUTH_002' as const; // トークン期限切れ
export const AUTH_003 = 'AUTH_003' as const; // アカウント無効

// ===========================
// TENANT系
// ===========================

export const TENANT_001 = 'TENANT_001' as const; // tenant不一致
export const TENANT_002 = 'TENANT_002' as const; // tenant未設定

// ===========================
// RBAC系
// ===========================

export const ACCESS_001 = 'ACCESS_001' as const; // 権限不足
export const ACCESS_002 = 'ACCESS_002' as const; // 自分以外参照不可

// ===========================
// 締め系
// ===========================

export const CLOSE_001 = 'CLOSE_001' as const; // 日次締め済み
export const CLOSE_002 = 'CLOSE_002' as const; // 月次確定済み
export const CLOSE_003 = 'CLOSE_003' as const; // 未入力データあり締め不可

// ===========================
// 勤怠系
// ===========================

export const PUNCH_001 = 'PUNCH_001' as const; // 二重打刻
export const PUNCH_002 = 'PUNCH_002' as const; // 未退勤
export const PUNCH_003 = 'PUNCH_003' as const; // 未あがり

// ===========================
// 売上系
// ===========================

export const SALES_001 = 'SALES_001' as const; // 伝票未存在
export const SALES_002 = 'SALES_002' as const; // 締め済み修正禁止

// ===========================
// 給与系
// ===========================

export const PAYROLL_001 = 'PAYROLL_001' as const; // 期間重複
export const PAYROLL_002 = 'PAYROLL_002' as const; // 不正バック率
export const PAYROLL_003 = 'PAYROLL_003' as const; // 計算対象未確定

// ===========================
// 修正申請系
// ===========================

export const CHANGE_001 = 'CHANGE_001' as const; // 承認待ち重複
export const CHANGE_002 = 'CHANGE_002' as const; // 却下済み

// ===========================
// 入力系
// ===========================

export const VALID_001 = 'VALID_001' as const; // 必須項目未入力
export const VALID_002 = 'VALID_002' as const; // 不正形式
export const VALID_003 = 'VALID_003' as const; // 数値範囲外

// ===========================
// システム系
// ===========================

export const SYS_001 = 'SYS_001' as const; // 想定外エラー
export const SYS_002 = 'SYS_002' as const; // DB接続失敗

// ===========================
// エラーメッセージマップ（日本語）
// ===========================

export const ERROR_MESSAGES: Record<string, string> = {
    [AUTH_001]: 'ログインに失敗しました',
    [AUTH_002]: 'セッションの有効期限が切れました。再ログインしてください',
    [AUTH_003]: 'このアカウントは無効化されています',
    [TENANT_001]: 'アクセス権限がありません',
    [TENANT_002]: 'テナント情報が不正です',
    [ACCESS_001]: 'この操作を行う権限がありません',
    [ACCESS_002]: '他のユーザーのデータにはアクセスできません',
    [CLOSE_001]: '締め済みデータは編集できません。修正申請を行ってください',
    [CLOSE_002]: '月次確定済みのため変更できません',
    [CLOSE_003]: '未入力データがあるため締めできません',
    [PUNCH_001]: '既に出勤打刻されています',
    [PUNCH_002]: '退勤打刻が未入力です',
    [PUNCH_003]: 'あがり時間が未入力です',
    [SALES_001]: '指定された伝票が見つかりません',
    [SALES_002]: '締め済みの伝票は修正できません',
    [PAYROLL_001]: '報酬プランの適用期間が重複しています',
    [PAYROLL_002]: 'バック率が不正です（0〜1の範囲で指定してください）',
    [PAYROLL_003]: '計算対象の締めが未完了です',
    [CHANGE_001]: '同一対象に承認待ちの申請が存在します',
    [CHANGE_002]: 'この申請は既に却下されています',
    [VALID_001]: '入力必須項目が不足しています',
    [VALID_002]: '入力形式が不正です',
    [VALID_003]: '数値が許容範囲外です',
    [SYS_001]: 'システムエラーが発生しました。しばらくしてから再試行してください',
    [SYS_002]: 'サーバーに接続できません',
};

// ===========================
// HTTPステータスマップ
// ===========================

export const ERROR_HTTP_STATUS: Record<string, number> = {
    [AUTH_001]: 401,
    [AUTH_002]: 401,
    [AUTH_003]: 403,
    [TENANT_001]: 403,
    [TENANT_002]: 403,
    [ACCESS_001]: 403,
    [ACCESS_002]: 403,
    [CLOSE_001]: 409,
    [CLOSE_002]: 409,
    [CLOSE_003]: 409,
    [PUNCH_001]: 409,
    [PUNCH_002]: 409,
    [PUNCH_003]: 409,
    [SALES_001]: 404,
    [SALES_002]: 409,
    [PAYROLL_001]: 409,
    [PAYROLL_002]: 422,
    [PAYROLL_003]: 409,
    [CHANGE_001]: 409,
    [CHANGE_002]: 409,
    [VALID_001]: 422,
    [VALID_002]: 422,
    [VALID_003]: 422,
    [SYS_001]: 500,
    [SYS_002]: 500,
};
