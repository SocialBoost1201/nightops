import { SalesLineInput, SalesCalculationResult, RoundingConfig } from '../types';

/**
 * 売上小計（明細合計）を計算
 */
export function calculateSubtotal(lines: SalesLineInput[]): number {
    return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

/**
 * 税＋サービス金額を計算
 * @param subtotal 小計
 * @param rate 税サービス率（例: 1.32）
 * @returns 税＋サービス込み金額（切り捨て）
 */
export function calculateServiceTax(subtotal: number, rate: number): number {
    return Math.floor(subtotal * rate);
}

/**
 * 総計丸め
 * 指定単位で丸める。端数が閾値以上なら繰上げ、未満なら繰下げ。
 */
export function roundTotal(
    amount: number,
    unit: number = 1000,
    threshold: number = 500,
): number {
    if (amount <= 0) return 0;
    const remainder = amount % unit;
    if (remainder >= threshold) {
        return amount - remainder + unit;
    }
    return amount - remainder;
}

/**
 * 売上計算の一連処理（小計→税サ→丸め）
 */
export function calculateSalesTotal(
    lines: SalesLineInput[],
    taxServiceRate: number = 1.32,
    roundingConfig: RoundingConfig = { unit: 1000, threshold: 500 },
): SalesCalculationResult {
    const subtotal = calculateSubtotal(lines);
    const serviceTaxAmount = calculateServiceTax(subtotal, taxServiceRate);
    const totalRounded = roundTotal(serviceTaxAmount, roundingConfig.unit, roundingConfig.threshold);
    return { subtotal, serviceTaxAmount, totalRounded };
}
