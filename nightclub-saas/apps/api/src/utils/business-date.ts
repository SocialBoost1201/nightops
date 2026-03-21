export const MVP_TIMEZONE = 'Asia/Tokyo';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  }
  return formatterCache.get(timeZone)!;
};

const formatDateYmd = (date: Date, timeZone: string): string => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

export const getTodayBusinessDateString = (timeZone = MVP_TIMEZONE): string => {
  return formatDateYmd(new Date(), timeZone);
};

export const parseDateOnlyString = (value: string): Date | null => {
  const match = value.match(DATE_RE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const getCurrentMonthDateRange = (timeZone = MVP_TIMEZONE): { from: string; to: string } => {
  const now = new Date();
  const currentYmd = formatDateYmd(now, timeZone);
  const [yearStr, monthStr] = currentYmd.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const paddedLastDay = String(lastDay).padStart(2, '0');

  return {
    from: `${yearStr}-${monthStr}-01`,
    to: `${yearStr}-${monthStr}-${paddedLastDay}`,
  };
};
