import { getDaysInMonth, format, isWeekend, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DayInfo } from '@/types/shift';

export function getDaysForMonth(year: number, month: number): DayInfo[] {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const days: DayInfo[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month - 1, i);
    days.push({
      date: i,
      dayOfWeek: format(dateObj, 'E', { locale: ja }), // "月", "火"
      isWeekend: isWeekend(dateObj),
      isToday: isToday(dateObj),
    });
  }
  return days;
}
