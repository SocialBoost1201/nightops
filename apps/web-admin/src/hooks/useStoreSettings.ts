import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface StoreSettings {
  storeName: string;
  taxRate: number;        // 例: 0.10
  serviceRate: number;    // 例: 0.22
  roundingUnit: number;   // 例: 1000
  roundingThreshold: number; // 例: 500
  currency: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'NightOps Store',
  taxRate: 0.10,
  serviceRate: 0.22,
  roundingUnit: 1000,
  roundingThreshold: 500,
  currency: 'JPY',
};

export function useStoreSettings() {
  const { data, error, isLoading } = useSWR<StoreSettings>('/master/settings', fetcher);
  return {
    settings: data ?? DEFAULT_SETTINGS,
    isLoading,
    isError: !!error,
  };
}

/**
 * Doc-23 準拠の伝票計算ユーティリティ
 */
export function calcSlip(subtotal: number, settings: StoreSettings) {
  const multiplier = 1 + settings.taxRate + settings.serviceRate;
  const rawTotal = Math.floor(subtotal * multiplier);
  const { roundingUnit: unit, roundingThreshold: threshold } = settings;
  const totalRounded = Math.floor((rawTotal + (unit - threshold)) / unit) * unit;
  return { rawTotal, totalRounded, multiplier };
}
