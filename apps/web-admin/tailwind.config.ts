import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1A1A1A',
        foreground: '#E5E7EB',
        gold: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        // 2026: Shimmer — スケルトンローディング・データ読み込み中のプレースホルダー
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // 2026: Floating — アイコン・バッジの讽遊感
        floating: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        // 2026: Ping — リアルタイムアラート・通知ドット
        'ping-slow': {
          '0%':   { transform: 'scale(1)',    opacity: '0.8' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        // 2026: GoldGlow — ゴールドカラーの込入金額強調（業務SaaS専用）
        'gold-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(245, 158, 11, 0.3)' },
          '50%':      { boxShadow: '0 0 16px rgba(245, 158, 11, 0.7)' },
        },
      },
      animation: {
        // Shimmer: テーブル・カードのローディングプレースホルダー
        shimmer:      'shimmer 1.5s linear infinite',
        // Floating: アイコン・ステータスの浮遊（最小限）
        floating:     'floating 3.0s ease-in-out infinite',
        // PingSlow: アクティブログインドット・通知バッジ
        'ping-slow':  'ping-slow 2.0s cubic-bezier(0, 0, 0.2, 1) infinite',
        // GoldGlow: 国修込み超達成等の嚽強調
        'gold-glow':  'gold-glow 2.0s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
