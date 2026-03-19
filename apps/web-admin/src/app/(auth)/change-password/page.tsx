'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import Cookies from 'js-cookie';
import { KeyRound, Eye, EyeOff, LogOut } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z
    .string()
    .min(8, '新しいパスワードは8文字以上で入力してください')
    .regex(/[A-Z]/, '大文字を1文字以上含めてください')
    .regex(/[0-9]/, '数字を1文字以上含めてください'),
  confirmPassword: z.string().min(1, '確認用パスワードを入力してください'),
}).refine(d => d.newPassword === d.confirmPassword, {
  path: ['confirmPassword'],
  message: '新しいパスワードと確認用パスワードが一致しません',
});

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  const handleLogout = () => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    router.push('/login');
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      // 成功後は自動ログアウトして再ログインを促す
      setTimeout(() => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        router.push('/login?changed=1');
      }, 2000);
    } catch (err: any) {
      setServerError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'パスワードの変更に失敗しました。現在のパスワードを確認してください。'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-gray-200 px-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest text-gold-500 mb-1">NightOps</h1>
          <p className="text-xs text-gray-500">店舗管理システム</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-800 bg-[#222] flex items-center gap-2">
            <KeyRound size={18} className="text-gold-400" />
            <h2 className="font-semibold text-gray-100">パスワードの変更</h2>
          </div>

          <div className="p-6">
            {isSubmitSuccessful ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-900/30 border border-emerald-700 flex items-center justify-center">
                  <KeyRound size={28} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-100">パスワードを変更しました</p>
                  <p className="text-sm text-gray-400 mt-1">セキュリティのため再ログインしてください</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-3 h-3 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                  ログイン画面に移動中...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {serverError && (
                  <div className="px-4 py-3 bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl">
                    {serverError}
                  </div>
                )}

                {/* 現在のパスワード */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">現在のパスワード</label>
                  <div className="relative">
                    <input
                      {...register('currentPassword')}
                      type={showCurrent ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={`w-full px-4 py-3 bg-[#111] border rounded-xl text-white text-sm focus:outline-none transition-colors pr-11 ${
                        errors.currentPassword ? 'border-red-700' : 'border-gray-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30'
                      }`}
                    />
                    <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.currentPassword && <p className="mt-1.5 text-xs text-red-400">{errors.currentPassword.message}</p>}
                </div>

                {/* 新しいパスワード */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">新しいパスワード</label>
                  <div className="relative">
                    <input
                      {...register('newPassword')}
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 bg-[#111] border rounded-xl text-white text-sm focus:outline-none transition-colors pr-11 ${
                        errors.newPassword ? 'border-red-700' : 'border-gray-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30'
                      }`}
                    />
                    <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.newPassword
                    ? <p className="mt-1.5 text-xs text-red-400">{errors.newPassword.message}</p>
                    : <p className="mt-1.5 text-xs text-gray-600">8文字以上・大文字1文字以上・数字1文字以上</p>
                  }
                </div>

                {/* 確認用パスワード */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">新しいパスワード（確認）</label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 bg-[#111] border rounded-xl text-white text-sm focus:outline-none transition-colors ${
                      errors.confirmPassword ? 'border-red-700' : 'border-gray-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30'
                    }`}
                  />
                  {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                    isSubmitting
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gold-600 text-white hover:bg-gold-500 shadow-lg shadow-gold-600/20 active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />変更中...</>
                  ) : (
                    <><KeyRound size={16} />パスワードを変更する</>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-800 bg-[#111] flex justify-end">
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
              <LogOut size={13} />ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
