"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sales_1 = require("../../src/calculations/sales");
describe('calculateSubtotal', () => {
    test('S-001: セット×3 + 本指名×1 = 24000', () => {
        expect((0, sales_1.calculateSubtotal)([
            { quantity: 3, unitPrice: 7000 },
            { quantity: 1, unitPrice: 3000 },
        ])).toBe(24000);
    });
    test('S-002: セット + 場内×2 + ボトル = 41000', () => {
        expect((0, sales_1.calculateSubtotal)([
            { quantity: 1, unitPrice: 7000 },
            { quantity: 2, unitPrice: 2000 },
            { quantity: 1, unitPrice: 30000 },
        ])).toBe(41000);
    });
    test('S-003: 空明細 = 0', () => {
        expect((0, sales_1.calculateSubtotal)([])).toBe(0);
    });
    test('S-004: 単価0 = 0', () => {
        expect((0, sales_1.calculateSubtotal)([{ quantity: 1, unitPrice: 0 }])).toBe(0);
    });
    test('S-005: フリー×5 + 本指名×3 + 場内×2 = 33000', () => {
        expect((0, sales_1.calculateSubtotal)([
            { quantity: 5, unitPrice: 4000 },
            { quantity: 3, unitPrice: 3000 },
            { quantity: 2, unitPrice: 2000 },
        ])).toBe(33000);
    });
});
describe('calculateTaxService', () => {
    test('T-001: 24000 × 1.32 = 31680', () => {
        expect((0, sales_1.calculateTaxService)(24000, 1.32)).toBe(31680);
    });
    test('T-002: 41000 × 1.32 = 54120', () => {
        expect((0, sales_1.calculateTaxService)(41000, 1.32)).toBe(54120);
    });
    test('T-003: 0 × 1.32 = 0', () => {
        expect((0, sales_1.calculateTaxService)(0, 1.32)).toBe(0);
    });
    test('T-004: 100000 × 1.32 = 132000', () => {
        expect((0, sales_1.calculateTaxService)(100000, 1.32)).toBe(132000);
    });
    test('T-005: 7000 × 1.32 = 9240', () => {
        expect((0, sales_1.calculateTaxService)(7000, 1.32)).toBe(9240);
    });
});
describe('roundGrandTotal', () => {
    test('R-001: 31680 → 32000 (680 ≥ 500)', () => {
        expect((0, sales_1.roundGrandTotal)(31680)).toBe(32000);
    });
    test('R-002: 54120 → 54000 (120 < 500)', () => {
        expect((0, sales_1.roundGrandTotal)(54120)).toBe(54000);
    });
    test('R-003: 132000 → 132000 (ジャスト)', () => {
        expect((0, sales_1.roundGrandTotal)(132000)).toBe(132000);
    });
    test('R-004: 50500 → 51000 (境界値500)', () => {
        expect((0, sales_1.roundGrandTotal)(50500)).toBe(51000);
    });
    test('R-005: 50499 → 50000 (境界値499)', () => {
        expect((0, sales_1.roundGrandTotal)(50499)).toBe(50000);
    });
    test('R-006: 0 → 0', () => {
        expect((0, sales_1.roundGrandTotal)(0)).toBe(0);
    });
    test('R-007: 999 → 1000 (999 ≥ 500)', () => {
        expect((0, sales_1.roundGrandTotal)(999)).toBe(1000);
    });
    test('R-008: 1 → 0 (1 < 500)', () => {
        expect((0, sales_1.roundGrandTotal)(1)).toBe(0);
    });
    test('R-009: 1500 → 2000 (500 → 繰上げ)', () => {
        expect((0, sales_1.roundGrandTotal)(1500)).toBe(2000);
    });
    test('R-010: 9240 → 9000 (240 < 500)', () => {
        expect((0, sales_1.roundGrandTotal)(9240)).toBe(9000);
    });
});
describe('calculateSalesTotal (一連計算)', () => {
    test('E2E-001: セット(ハウス)×3 + 本指名×1', () => {
        const result = (0, sales_1.calculateSalesTotal)([
            { quantity: 3, unitPrice: 7000 },
            { quantity: 1, unitPrice: 3000 },
        ]);
        expect(result.subtotal).toBe(24000);
        expect(result.taxService).toBe(31680);
        expect(result.grandTotal).toBe(32000);
    });
    test('E2E-002: フリーA×2 + 場内×3 + ボトル30000', () => {
        const result = (0, sales_1.calculateSalesTotal)([
            { quantity: 2, unitPrice: 4000 },
            { quantity: 3, unitPrice: 2000 },
            { quantity: 1, unitPrice: 30000 },
        ]);
        expect(result.subtotal).toBe(44000);
        expect(result.taxService).toBe(58080);
        expect(result.grandTotal).toBe(58000);
    });
    test('E2E-003: T・C×1 + 同伴×1 + P1×1', () => {
        const result = (0, sales_1.calculateSalesTotal)([
            { quantity: 1, unitPrice: 6000 },
            { quantity: 1, unitPrice: 5000 },
            { quantity: 1, unitPrice: 3000 },
        ]);
        expect(result.subtotal).toBe(14000);
        expect(result.taxService).toBe(18480);
        expect(result.grandTotal).toBe(18000);
    });
    test('E2E-004: 大口伝票', () => {
        const result = (0, sales_1.calculateSalesTotal)([
            { quantity: 5, unitPrice: 7000 },
            { quantity: 2, unitPrice: 3000 },
            { quantity: 1, unitPrice: 2000 },
            { quantity: 1, unitPrice: 2000 },
            { quantity: 1, unitPrice: 50000 },
        ]);
        expect(result.subtotal).toBe(95000);
        expect(result.taxService).toBe(125400);
        expect(result.grandTotal).toBe(125000);
    });
});
//# sourceMappingURL=sales.spec.js.map