import { PayrollParams, PayrollResult } from '../types';

/**
 * 時給計算（分数ベース、切り捨て）
 */
export function calculateHourlyPay(totalMinutes: number, hourlyRate: number): number {
    return Math.floor((totalMinutes / 60) * hourlyRate);
}

/**
 * 売上コミッション計算（切り捨て）
 */
export function calculateCommission(salesSubtotal: number, commissionRate: number): number {
    return Math.floor(salesSubtotal * commissionRate);
}

/**
 * アイテムバック計算（場内指名、ドリンク共通）
 */
export function calculateItemBack(count: number, unitPrice: number): number {
    return count * unitPrice;
}

/**
 * 総支給計算
 */
export function calculateTotalPay(params: PayrollParams): PayrollResult {
    const hourlyPay =
        params.payType === 'hourly_plus_back'
            ? calculateHourlyPay(params.totalMinutes, params.hourlyRate)
            : 0;

    const commission = calculateCommission(params.salesSubtotal, params.commissionRate);
    const inhouseBack = calculateItemBack(params.inhouseCount, params.inhouseUnit);
    const drinkBack = calculateItemBack(params.drinkCount, params.drinkUnit);

    const totalPay =
        hourlyPay + commission + inhouseBack + drinkBack + params.allowance - params.deduction;

    return {
        hourlyPay,
        commission,
        inhouseBack,
        drinkBack,
        allowance: params.allowance,
        deduction: params.deduction,
        totalPay,
    };
}
