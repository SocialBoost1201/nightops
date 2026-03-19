// ===========================
// 売上関連
// ===========================

export interface SalesLineInput {
    quantity: number;
    unitPrice: number;
}

export interface SalesCalculationResult {
    subtotal: number;
    serviceTaxAmount: number;
    totalRounded: number;
}

export interface RoundingConfig {
    unit: number;
    threshold: number;
}

// ===========================
// 給与関連
// ===========================

export type PayType = 'hourly_plus_back' | 'commission_plus_back';

export interface PayrollParams {
    payType: PayType;
    totalMinutes: number;
    hourlyRate: number;
    salesSubtotal: number;
    commissionRate: number;
    inhouseCount: number;
    inhouseUnit: number;
    drinkCount: number;
    drinkUnit: number;
    allowance: number;
    deduction: number;
}

export interface PayrollResult {
    hourlyPay: number;
    commission: number;
    inhouseBack: number;
    drinkBack: number;
    allowance: number;
    deduction: number;
    totalPay: number;
}

// ===========================
// ロール・認証
// ===========================

export type Role = 'Cast' | 'Staff' | 'Manager' | 'Admin' | 'SystemAdmin';
export type UserType = 'cast' | 'staff';
export type AccountStatus = 'active' | 'inactive' | 'locked';
export type ShiftStatus = 'submitted' | 'approved';
export type SlipStatus = 'draft' | 'closed';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';
export type PunchType = 'checkin' | 'checkout';

// ===========================
// 共通
// ===========================

export interface PaginationParams {
    page: number;
    pageSize: number;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
}

export interface ApiResponse<T> {
    data: T;
    meta?: PaginationMeta;
}

export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: Array<{ field: string; message: string }>;
    };
}
