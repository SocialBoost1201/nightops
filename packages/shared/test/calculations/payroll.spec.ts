import {
    calculateHourlyPay,
    calculateCommission,
    calculateItemBack,
    calculateTotalPay,
} from '../../src/calculations/payroll';

describe('calculateHourlyPay', () => {
    test('H-001: 360分 × 2000円 = 12000', () => {
        expect(calculateHourlyPay(360, 2000)).toBe(12000);
    });

    test('H-002: 300分 × 1500円 = 7500', () => {
        expect(calculateHourlyPay(300, 1500)).toBe(7500);
    });

    test('H-003: 90分 × 2000円 = 3000', () => {
        expect(calculateHourlyPay(90, 2000)).toBe(3000);
    });

    test('H-004: 0分 = 0', () => {
        expect(calculateHourlyPay(0, 2000)).toBe(0);
    });

    test('H-005: 45分 × 2000円 = 1500 (切り捨て)', () => {
        expect(calculateHourlyPay(45, 2000)).toBe(1500);
    });
});

describe('calculateCommission', () => {
    test('SB-001: 100000 × 10% = 10000', () => {
        expect(calculateCommission(100000, 0.1)).toBe(10000);
    });

    test('SB-002: 150000 × 15% = 22500', () => {
        expect(calculateCommission(150000, 0.15)).toBe(22500);
    });

    test('SB-003: 0 × 10% = 0', () => {
        expect(calculateCommission(0, 0.1)).toBe(0);
    });

    test('SB-004: 100000 × 0% = 0', () => {
        expect(calculateCommission(100000, 0)).toBe(0);
    });

    test('SB-005: 33333 × 10% = 3333 (切り捨て)', () => {
        expect(calculateCommission(33333, 0.1)).toBe(3333);
    });
});

describe('calculateItemBack', () => {
    test('IB-001: 場内5回 × 1000円 = 5000', () => {
        expect(calculateItemBack(5, 1000)).toBe(5000);
    });

    test('IB-002: ドリンク10杯 × 100円 = 1000', () => {
        expect(calculateItemBack(10, 100)).toBe(1000);
    });

    test('IB-003: 0回 = 0', () => {
        expect(calculateItemBack(0, 1000)).toBe(0);
    });
});

describe('calculateTotalPay', () => {
    test('TP-001: Type1 基本ケース', () => {
        const result = calculateTotalPay({
            payType: 'hourly_plus_back',
            totalMinutes: 360,
            hourlyRate: 2000,
            salesSubtotal: 100000,
            commissionRate: 0.1,
            inhouseCount: 5,
            inhouseUnit: 1000,
            drinkCount: 10,
            drinkUnit: 100,
            allowance: 0,
            deduction: 0,
        });
        expect(result.hourlyPay).toBe(12000);
        expect(result.commission).toBe(10000);
        expect(result.inhouseBack).toBe(5000);
        expect(result.drinkBack).toBe(1000);
        expect(result.totalPay).toBe(28000);
    });

    test('TP-002: Type1 手当・控除あり', () => {
        const result = calculateTotalPay({
            payType: 'hourly_plus_back',
            totalMinutes: 300,
            hourlyRate: 1500,
            salesSubtotal: 200000,
            commissionRate: 0.15,
            inhouseCount: 3,
            inhouseUnit: 1000,
            drinkCount: 5,
            drinkUnit: 100,
            allowance: 5000,
            deduction: 2000,
        });
        expect(result.hourlyPay).toBe(7500);
        expect(result.commission).toBe(30000);
        expect(result.inhouseBack).toBe(3000);
        expect(result.drinkBack).toBe(500);
        expect(result.totalPay).toBe(44000);
    });

    test('TP-003: Type1 ゼロケース', () => {
        const result = calculateTotalPay({
            payType: 'hourly_plus_back',
            totalMinutes: 0,
            hourlyRate: 2000,
            salesSubtotal: 0,
            commissionRate: 0.1,
            inhouseCount: 0,
            inhouseUnit: 1000,
            drinkCount: 0,
            drinkUnit: 100,
            allowance: 0,
            deduction: 0,
        });
        expect(result.totalPay).toBe(0);
    });

    test('TP-004: Type2 完全歩合', () => {
        const result = calculateTotalPay({
            payType: 'commission_plus_back',
            totalMinutes: 480,
            hourlyRate: 0,
            salesSubtotal: 500000,
            commissionRate: 0.5,
            inhouseCount: 10,
            inhouseUnit: 1000,
            drinkCount: 20,
            drinkUnit: 100,
            allowance: 0,
            deduction: 0,
        });
        expect(result.hourlyPay).toBe(0);
        expect(result.commission).toBe(250000);
        expect(result.inhouseBack).toBe(10000);
        expect(result.drinkBack).toBe(2000);
        expect(result.totalPay).toBe(262000);
    });

    test('TP-005: Type2 手当・控除あり', () => {
        const result = calculateTotalPay({
            payType: 'commission_plus_back',
            totalMinutes: 360,
            hourlyRate: 0,
            salesSubtotal: 300000,
            commissionRate: 0.3,
            inhouseCount: 5,
            inhouseUnit: 2000,
            drinkCount: 15,
            drinkUnit: 200,
            allowance: 10000,
            deduction: 5000,
        });
        expect(result.commission).toBe(90000);
        expect(result.inhouseBack).toBe(10000);
        expect(result.drinkBack).toBe(3000);
        expect(result.totalPay).toBe(108000);
    });
});

describe('calculateTotalPay（テスト設計書 確定版）', () => {
    test('確定版 Type1: 300分, 時給2000, 売上10万, 率0.1, 場内2, ドリンク10 → 23000', () => {
        const result = calculateTotalPay({
            payType: 'hourly_plus_back',
            totalMinutes: 300,
            hourlyRate: 2000,
            salesSubtotal: 100000,
            commissionRate: 0.1,
            inhouseCount: 2,
            inhouseUnit: 1000,
            drinkCount: 10,
            drinkUnit: 100,
            allowance: 0,
            deduction: 0,
        });
        expect(result.hourlyPay).toBe(10000);
        expect(result.commission).toBe(10000);
        expect(result.inhouseBack).toBe(2000);
        expect(result.drinkBack).toBe(1000);
        expect(result.totalPay).toBe(23000);
    });

    test('確定版 Type2: 売上10万, 率0.12, 場内1, ドリンク0 → 13000', () => {
        const result = calculateTotalPay({
            payType: 'commission_plus_back',
            totalMinutes: 0,
            hourlyRate: 0,
            salesSubtotal: 100000,
            commissionRate: 0.12,
            inhouseCount: 1,
            inhouseUnit: 1000,
            drinkCount: 0,
            drinkUnit: 100,
            allowance: 0,
            deduction: 0,
        });
        expect(result.hourlyPay).toBe(0);
        expect(result.commission).toBe(12000);
        expect(result.inhouseBack).toBe(1000);
        expect(result.drinkBack).toBe(0);
        expect(result.totalPay).toBe(13000);
    });
});
