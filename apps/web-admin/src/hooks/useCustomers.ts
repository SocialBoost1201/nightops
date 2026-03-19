import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface Customer {
  id: string;
  name: string;
  nameKana?: string;
  phone?: string;
  primaryCastName?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: string;
  firstVisitDate?: string;
  memo?: string;
}

export interface CustomerSummary {
  customer: Customer;
  visitHistory: { date: string; castName: string; sales: number }[];
}

export function useCustomers(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';

  const { data, error, isLoading, mutate } =
    useSWR<Customer[]>(`/customers${params}`, fetcher);

  const createCustomer = async (payload: Partial<Customer>) => {
    await apiClient.post('/customers', payload);
    mutate();
  };

  const updateCustomer = async (id: string, payload: Partial<Customer>) => {
    await apiClient.put(`/customers/${id}`, payload);
    mutate();
  };

  const deleteCustomer = async (id: string) => {
    await apiClient.delete(`/customers/${id}`);
    mutate();
  };

  const mergeCustomers = async (sourceId: string, targetId: string) => {
    await apiClient.post(`/customers/${targetId}/merge`, { sourceId });
    mutate();
  };

  const getCustomerSummary = (id: string) =>
    apiClient.get<CustomerSummary>(`/customers/${id}/summary`).then(r => r.data);

  return {
    customers: data ?? [],
    isLoading,
    isError: !!error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    mergeCustomers,
    getCustomerSummary,
    mutate,
  };
}
