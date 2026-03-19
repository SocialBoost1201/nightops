import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface PayrollItem {
  castId: string;
  castName: string;
  workDays: number;
  totalSales: number;
  nominationCount: number;
  estimatedPay: number;
  isFinalized: boolean;
}

export interface PayrollSummary {
  yearMonth: string;
  items: PayrollItem[];
  totalPay: number;
  isMonthClosed: boolean;
}

export function usePayroll(yearMonth?: string) {
  const dateParam = yearMonth ? `?yearMonth=${yearMonth}` : '';

  const { data, error, isLoading, mutate } =
    useSWR<PayrollSummary>(`/payroll/calculate${dateParam}`, fetcher);

  const executeMonthlyClose = async (ym: string) => {
    await apiClient.post('/payroll/monthly-close', { yearMonth: ym });
    mutate();
  };

  return {
    payroll: data ?? null,
    items: data?.items ?? [],
    totalPay: data?.totalPay ?? 0,
    isMonthClosed: data?.isMonthClosed ?? false,
    isLoading,
    isError: !!error,
    executeMonthlyClose,
  };
}
