import {
  getCurrentMonthDateRange,
  getTodayBusinessDateString,
  parseDateOnlyString,
} from '../src/utils/business-date';

describe('business-date util', () => {
  it('1. parseDateOnlyString accepts valid YYYY-MM-DD', () => {
    const parsed = parseDateOnlyString('2026-03-21');
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2026-03-21T00:00:00.000Z');
  });

  it('2. parseDateOnlyString rejects non-existent date', () => {
    expect(parseDateOnlyString('2026-02-30')).toBeNull();
  });

  it('3. getTodayBusinessDateString returns YYYY-MM-DD', () => {
    const today = getTodayBusinessDateString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('4. getCurrentMonthDateRange returns valid range', () => {
    const range = getCurrentMonthDateRange();
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const from = parseDateOnlyString(range.from);
    const to = parseDateOnlyString(range.to);
    expect(from).not.toBeNull();
    expect(to).not.toBeNull();
    expect((from as Date).getTime()).toBeLessThanOrEqual((to as Date).getTime());
  });
});
