import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalGuests: number;
  totalNominations: number;
}

export interface CastRankingItem {
  castId: string;
  castName: string;
  totalSales: number;
  nominationCount: number;
  drinkCount: number;
}

export function useReport(yearMonth?: string) {
  const dateParam = yearMonth ? `?yearMonth=${yearMonth}` : '';

  const { data: daily, error: dailyError, isLoading: isLoadingDaily } =
    useSWR<DailySalesReport>(`/reports/daily${dateParam}`, fetcher);

  const { data: salesRanking, error: salesError, isLoading: isLoadingSales } =
    useSWR<CastRankingItem[]>(`/reports/ranking/sales${dateParam}`, fetcher);

  const { data: nominationRanking, error: nomError, isLoading: isLoadingNom } =
    useSWR<CastRankingItem[]>(`/reports/ranking/nominations${dateParam}`, fetcher);

  const { data: drinkRanking, error: drinkError, isLoading: isLoadingDrink } =
    useSWR<CastRankingItem[]>(`/reports/ranking/drinks${dateParam}`, fetcher);

  return {
    daily: daily ?? null,
    salesRanking: salesRanking ?? [],
    nominationRanking: nominationRanking ?? [],
    drinkRanking: drinkRanking ?? [],
    isLoading: isLoadingDaily || isLoadingSales || isLoadingNom || isLoadingDrink,
    isError: !!(dailyError || salesError || nomError || drinkError),
  };
}
