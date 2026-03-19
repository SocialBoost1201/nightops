import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface SalesSlip {
  id: string;
  customerName: string;
  primaryCastName: string;
  headcount: number;
  subtotal: number;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface PriceItem {
  id: string;
  itemCode: string;
  itemName: string;
  unitPrice: number;
  unit: string;
  chargeType: string;
  durationMinutes: number | null;
  applyPerPerson: boolean;
  sortOrder: number;
}

export function useSales(dateStr?: string) {
  const url = dateStr ? `/sales/slips?businessDate=${dateStr}` : '/sales/slips';

  const { data: slips, error: slipsError, isLoading: isLoadingSlips, mutate } = useSWR<SalesSlip[]>(url, fetcher);

  const { data: priceItems, error: itemsError, isLoading: isLoadingItems } = useSWR<PriceItem[]>('/master/price-items', fetcher);

  const createSlip = async (slipData: any) => {
    try {
      await apiClient.post('/sales/slips', slipData);
      mutate();
    } catch (e) {
      console.error('Create slip failed:', e);
      throw e;
    }
  };

  return {
    slips: slips || [],
    priceItems: priceItems || [],
    isLoading: isLoadingSlips || isLoadingItems,
    isError: slipsError || itemsError,
    createSlip,
    mutateSlips: mutate
  };
}
