export interface ShiftData {
  year: number;
  month: number;
  casts: CastShift[];
}

export interface CastShift {
  id: string; // cast ID
  name: string;
  shifts: Record<string, string>; // "1": "出勤", "2": "休み" など
}

export interface DayInfo {
  date: number;
  dayOfWeek: string;
  isWeekend: boolean;
  isToday: boolean;
}
