import {
    calculateSubtotal,
    calculateServiceTax,
    roundTotal,
    calculateSalesTotal,
} from '../../src/calculations/sales';

describe('calculateSubtotal', () => {
    test('小計: 37000', () => {
        expect(
            calculateSubtotal([
                { quantity: 3, unitPrice: 7000 },
                { quantity: 2, unitPrice: 3000 },
                { quantity: 1, unitPrice: 10000 },
            ]),
        ).toBe(37000);
    });

    test('小計: 41000', () => {
        expect(
            calculateSubtotal([
                { quantity: 1, unitPrice: 7000 },
                { quantity: 2, unitPrice: 2000 },
                { quantity: 1, unitPrice: 30000 },
            ]),
        ).toBe(41000);
    });

    test('空明細 = 0', () => {
        expect(calculateSubtotal([])).toBe(0);
    });

    test('単価0 = 0', () => {
        expect(calculateSubtotal([{ quantity: 1, unitPrice: 0 }])).toBe(0);
    });
});

describe('calculateServiceTax', () => {
    test('37000 × 1.32 = 48840', () => {
        expect(calculateServiceTax(37000, 1.32)).toBe(48840);
    });

    test('41000 × 1.32 = 54120', () => {
        expect(calculateServiceTax(41000, 1.32)).toBe(54120);
    });

    test('41500 × 1.32 = 54780', () => {
        expect(calculateServiceTax(41500, 1.32)).toBe(54780);
    });

    test('37500 × 1.32 = 49500', () => {
        expect(calculateServiceTax(37500, 1.32)).toBe(49500);
    });

    test('0 × 1.32 = 0', () => {
        expect(calculateServiceTax(0, 1.32)).toBe(0);
    });
});

describe('roundTotal', () => {
    test('48840 → 49000 (840 ≥ 500)', () => {
        expect(roundTotal(48840)).toBe(49000);
    });

    test('54120 → 54000 (120 < 500)', () => {
        expect(roundTotal(54120)).toBe(54000);
    });

    test('54780 → 55000 (780 ≥ 500)', () => {
        expect(roundTotal(54780)).toBe(55000);
    });

    test('49500 → 50000 (境界値500 → 繰上げ)', () => {
        expect(roundTotal(49500)).toBe(50000);
    });

    test('132000 → 132000 (ジャスト)', () => {
        expect(roundTotal(132000)).toBe(132000);
    });

    test('50499 → 50000 (境界値499 → 繰下げ)', () => {
        expect(roundTotal(50499)).toBe(50000);
    });

    test('0 → 0', () => {
        expect(roundTotal(0)).toBe(0);
    });

    test('999 → 1000 (999 ≥ 500)', () => {
        expect(roundTotal(999)).toBe(1000);
    });

    test('1 → 0 (1 < 500)', () => {
        expect(roundTotal(1)).toBe(0);
    });
});

describe('calculateSalesTotal（テスト設計書 S1-S4）', () => {
    test('S1: 小計37000 → raw 48840 → 総計49000', () => {
        const result = calculateSalesTotal([
            { quantity: 3, unitPrice: 7000 },
            { quantity: 2, unitPrice: 3000 },
            { quantity: 1, unitPrice: 10000 },
        ]);
        expect(result.subtotal).toBe(37000);
        expect(result.serviceTaxAmount).toBe(48840);
        expect(result.totalRounded).toBe(49000);
    });

    test('S2: 小計41000 → raw 54120 → 総計54000', () => {
        const result = calculateSalesTotal([
            { quantity: 1, unitPrice: 7000 },
            { quantity: 2, unitPrice: 2000 },
            { quantity: 1, unitPrice: 30000 },
        ]);
        expect(result.subtotal).toBe(41000);
        expect(result.serviceTaxAmount).toBe(54120);
        expect(result.totalRounded).toBe(54000);
    });

    test('S3: 小計41500 → raw 54780 → 総計55000', () => {
        const result = calculateSalesTotal([
            { quantity: 1, unitPrice: 7000 },
            { quantity: 1, unitPrice: 2000 },
            { quantity: 1, unitPrice: 2500 },
            { quantity: 1, unitPrice: 30000 },
        ]);
        expect(result.subtotal).toBe(41500);
        expect(result.serviceTaxAmount).toBe(54780);
        expect(result.totalRounded).toBe(55000);
    });

    test('S4: 小計37500 → raw 49500 → 総計50000（境界値500）', () => {
        const result = calculateSalesTotal([
            { quantity: 3, unitPrice: 7000 },
            { quantity: 2, unitPrice: 3000 },
            { quantity: 1, unitPrice: 10500 },
        ]);
        expect(result.subtotal).toBe(37500);
        expect(result.serviceTaxAmount).toBe(49500);
        expect(result.totalRounded).toBe(50000);
    });
});

describe('calculateSalesTotal（追加E2Eケース）', () => {
    test('E2E-001: セット(ハウス)×3 + 本指名×1', () => {
        const result = calculateSalesTotal([
            { quantity: 3, unitPrice: 7000 },
            { quantity: 1, unitPrice: 3000 },
        ]);
        expect(result.subtotal).toBe(24000);
        expect(result.serviceTaxAmount).toBe(31680);
        expect(result.totalRounded).toBe(32000);
    });

    test('E2E-002: 大口伝票', () => {
        const result = calculateSalesTotal([
            { quantity: 5, unitPrice: 7000 },
            { quantity: 2, unitPrice: 3000 },
            { quantity: 1, unitPrice: 2000 },
            { quantity: 1, unitPrice: 2000 },
            { quantity: 1, unitPrice: 50000 },
        ]);
        expect(result.subtotal).toBe(95000);
        expect(result.serviceTaxAmount).toBe(125400);
        expect(result.totalRounded).toBe(125000);
    });
});
