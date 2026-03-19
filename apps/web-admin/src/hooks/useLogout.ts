'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/api';

/**
 * useLogout
 * - サーバー側のリフレッシュトークン無効化（POST /auth/logout）を試みる
 * - Cookie（accessToken / refreshToken）を削除
 * - /login へリダイレクト
 */
export function useLogout() {
  const router = useRouter();

  const logout = useCallback(async () => {
    try {
      // サーバー側でリフレッシュトークンを無効化
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => {
          // ログアウトAPIが失敗してもクライアントのクリーンアップは続行
        });
      }
    } finally {
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      router.push('/login');
    }
  }, [router]);

  return { logout };
}
