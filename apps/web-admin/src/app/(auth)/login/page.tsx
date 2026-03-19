'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import Cookies from 'js-cookie';
import { Eye, EyeOff, LogIn, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';


const loginSchema = z.object({
  loginId: z.string()
    .min(1, 'ログインIDを入力してください')
    .regex(/^[a-zA-Z0-9_-]+$/, 'IDは半角英数字・ハイフン・アンダースコアのみ使用できます'),
  password: z.string()
    .min(6, 'パスワードは6文字以上で入力してください'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordChanged = searchParams.get('changed') === '1';
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');


  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      const res = await apiClient.post('/auth/login', data);
      const { accessToken, refreshToken, mustChangePassword } = res.data;

      Cookies.set('accessToken', accessToken, { secure: true, sameSite: 'strict' });
      Cookies.set('refreshToken', refreshToken, { secure: true, sameSite: 'strict' });

      router.push(mustChangePassword ? '/change-password' : '/');
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'ログインに失敗しました。IDとパスワードを確認してください。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0C] text-gray-200">
      <div className="w-full max-w-sm p-8 bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest text-gold-500 mb-1">NightOps</h1>
          <p className="text-xs text-gray-500">店舗管理システム</p>
        </div>

        {passwordChanged && (
          <div className="mb-5 px-4 py-3 bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            パスワードを変更しました。再ログインしてください。
          </div>
        )}

        {serverError && (

          <div className="mb-5 px-4 py-3 bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* LoginID */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">ログインID</label>
            <input
              {...register('loginId')}
              type="text"
              autoComplete="username"
              placeholder="例: anim-0001"
              className={`w-full px-4 py-3 bg-[#222] border rounded-xl text-white focus:outline-none transition-colors text-sm
                ${errors.loginId
                  ? 'border-red-700 focus:border-red-500'
                  : 'border-gray-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30'
                }`}
            />
            {errors.loginId && (
              <p className="mt-1.5 text-xs text-red-400">{errors.loginId.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">パスワード</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-[#222] border rounded-xl text-white focus:outline-none transition-colors text-sm pr-11
                  ${errors.password
                    ? 'border-red-700 focus:border-red-500'
                    : 'border-gray-700 focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 font-bold text-white rounded-xl transition-all flex items-center justify-center gap-2
              ${isSubmitting
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-gold-600 hover:bg-gold-500 shadow-lg shadow-gold-600/20 active:scale-[0.98]'
              }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                認証中...
              </>
            ) : (
              <>
                <LogIn size={16} />ログイン
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-700">
          © 2026 NightOps Inc.
        </div>
      </div>
    </div>
  );
}
