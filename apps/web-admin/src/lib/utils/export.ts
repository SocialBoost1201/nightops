import * as XLSX from 'xlsx';
import { ShiftData, DayInfo } from '@/types/shift';
import { getDaysForMonth } from './date';

export function exportToExcel(data: ShiftData) {
  const days = getDaysForMonth(data.year, data.month);
  
  // Create spreadsheet data
  const aoa: any[][] = [];
  
  // Header row 1: Dates
  const headerDateRow = ['キャスト名', ...days.map(d => d.date.toString())];
  aoa.push(headerDateRow);
  
  // Header row 2: Days of week
  const headerDayRow = ['', ...days.map(d => `(${d.dayOfWeek})`)];
  aoa.push(headerDayRow);
  
  // Data rows
  for (const cast of data.casts) {
    const row = [cast.name];
    for (const day of days) {
      row.push(cast.shifts[day.date.toString()] || '');
    }
    aoa.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shifts');
  
  // Save file
  XLSX.writeFile(wb, `shift_${data.year}_${data.month}.xlsx`);
}

export function printShifts() {
  window.print();
}
