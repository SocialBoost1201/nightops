'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

/**
 * SWR グローバル設定
 * - revalidateOnFocus: true → タブを再フォーカスしたら自動更新
 * - refreshInterval: 60_000 → 1分ごとに自動ポーリング（ダッシュボード等のリアルタイム感）
 * - dedupingInterval: 5_000 → 5秒以内の重複リクエストを抑制
 * - errorRetryCount: 3 → エラー時は最大3回リトライ
 */
export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        refreshInterval: 60_000,
        dedupingInterval: 5_000,
        errorRetryCount: 3,
        errorRetryInterval: 3_000,
        onError: (error) => {
          // 401は認証エラーとして上位でハンドリングしているので無視
          if (error?.response?.status === 401) return;
          console.error('[SWR Error]', error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
