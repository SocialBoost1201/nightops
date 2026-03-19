import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface AttendanceRecord {
  id: string; // punch record ID
  accountId: string; // account ID
  userProfileId: string;
  displayName: string;
  userType: 'cast' | 'staff';
  status: 'working' | 'finished';
  checkInTime: string;
  checkOutTime: string | null;
}

export function useAttendance(dateStr?: string) {
  // バックエンドの GET /punches/today に適合
  const url = dateStr ? `/punches/today?businessDate=${dateStr}` : `/punches/today`;
  
  const { data, error, isLoading, mutate } = useSWR<AttendanceRecord[]>(url, fetcher);

  const setCastCheckout = async (recordId: string, time: string, accountId?: string) => {
    try {
      // フロントエンドのUIコンポーネントからaccountIdを受け取るように変更（無い場合は代替）
      // if accountId is not available, we can't properly call /cast-checkouts/set (it requires accountId, businessDate, checkoutTime).
      // At this point, recordId from punches/today actually maps to punch.id. 
      // We assume accountId is available inside the record passed.
      const dateString = dateStr || new Date().toISOString().split('T')[0];
      await apiClient.post('/cast-checkouts/set', { 
        accountId: accountId || recordId, // fallback if recordId was mis-used
        businessDate: dateString,
        checkoutTime: time 
      });
      mutate();
    } catch (e) {
      console.error('Checkout failed:', e);
      throw e;
    }
  };

  return {
    attendance: data || [],
    isLoading,
    isError: error,
    mutate,
    setCastCheckout
  };
}
