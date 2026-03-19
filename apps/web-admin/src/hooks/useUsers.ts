import useSWR from 'swr';
import { apiClient } from '@/lib/api';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

export interface User {
  accountId: string;
  loginId: string;
  role: string;
  status: string;
  displayName?: string;
  userType?: string;
  employmentStatus?: string;
  createdAt: string;
  lastLogin?: string; // MVPモック用に一時残置（APIレスポンスになければundefined）
}

export interface CreateUserPayload {
  role: string;
  displayName: string;
  userType: string;
}

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<User[]>('/users', fetcher);

  const createUser = async (payload: CreateUserPayload) => {
    const res = await apiClient.post('/users', payload);
    mutate();
    return res.data;
  };

  const updateStatus = async (accountId: string, status: string) => {
    await apiClient.put(`/users/${accountId}/status`, { status });
    mutate();
  };

  const resetPassword = async (accountId: string) => {
    const res = await apiClient.post(`/users/${accountId}/reset-password`);
    return res.data;
  };

  return {
    users: data ?? [],
    isLoading,
    isError: !!error,
    createUser,
    updateStatus,
    resetPassword,
    mutate,
  };
}
