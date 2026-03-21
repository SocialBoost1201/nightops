'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLogout } from '@/hooks/useLogout';
import {
  Users, Calendar, Clock, Receipt, Settings,
  LayoutDashboard, ScrollText, FileEdit, BarChart3, Calculator, ShoppingBag,
  LogOut, KeyRound, ShieldCheck,
} from 'lucide-react';


type Role = 'SystemAdmin' | 'Admin' | 'Manager' | 'Cast';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  allowedRoles?: Role[]; // undefined = all roles
}

const navItems: NavItem[] = [
  { name: 'ダッシュボード',   path: '/',              icon: LayoutDashboard },
  { name: 'ユーザー管理',     path: '/users',         icon: Users,        allowedRoles: ['Admin'] },
  { name: '顧客管理',         path: '/customers',     icon: ShoppingBag },
  { name: 'シフト管理',       path: '/shifts',        icon: Calendar,     allowedRoles: ['Admin', 'Manager'] },
  { name: '勤怠管理',         path: '/attendance',    icon: Clock,        allowedRoles: ['Admin', 'Manager'] },
  { name: '修正申請',         path: '/change-requests', icon: FileEdit },
  { name: '売上入力',         path: '/sales',         icon: Receipt,      allowedRoles: ['Admin', 'Manager'] },
  { name: '日次締め',         path: '/daily-close',   icon: ScrollText,   allowedRoles: ['Admin', 'Manager'] },
  { name: '集計・レポート',   path: '/reports',       icon: BarChart3,    allowedRoles: ['Admin', 'Manager'] },
  { name: '承認待ち一覧',     path: '/approvals/pending', icon: ShieldCheck, allowedRoles: ['SystemAdmin', 'Admin'] },
  { name: '給与・月次処理',   path: '/payroll',       icon: Calculator,   allowedRoles: ['Admin'] },
  { name: '監査ログ',         path: '/audit-logs',    icon: ScrollText,   allowedRoles: ['SystemAdmin', 'Admin'] },
  { name: 'マスタ設定',       path: '/settings',      icon: Settings,     allowedRoles: ['Admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { logout } = useLogout();
  const currentRole = (user?.role ?? 'Cast') as Role;


  const visibleItems = navItems.filter(item =>
    !item.allowedRoles || item.allowedRoles.includes(currentRole)
  );

  return (
    <aside className="w-64 bg-[#1E1E1E] border-r border-gray-800 h-screen fixed top-0 left-0 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <span className="text-xl font-bold text-gold-500 tracking-wider">NightOps</span>
      </div>

      {/* Role badge */}
      {user && (
        <div className="px-4 py-2.5 border-b border-gray-800/60 bg-[#1A1A1A]">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">ログイン中</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-300 font-medium truncate">{user.accountId}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ml-2 shrink-0 ${
              currentRole === 'SystemAdmin' ? 'bg-red-900/40 text-red-400 border border-red-800/40' :
              currentRole === 'Admin'       ? 'bg-gold-900/40 text-gold-400 border border-gold-800/40' :
              currentRole === 'Manager'     ? 'bg-blue-900/40 text-blue-400 border border-blue-800/40' :
                                         'bg-gray-800 text-gray-500'
            }`}>
              {currentRole}
            </span>
          </div>
        </div>
      )}
      
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${
                isActive 
                  ? 'bg-gold-500/10 text-gold-400 font-medium' 
                  : 'text-gray-400 hover:bg-[#2A2A2A] hover:text-gray-200'
              }`}
            >
              <Icon size={18} className={`mr-3 shrink-0 ${isActive ? 'text-gold-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-1">
        <Link
          href="/change-password"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-[#2A2A2A] transition-colors"
        >
          <KeyRound size={13} />パスワード変更
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/10 transition-colors"
        >
          <LogOut size={13} />ログアウト
        </button>
        <p className="text-[10px] text-gray-700 px-3 pt-1">NightOps v0.1.0</p>
      </div>
    </aside>
  );
}
