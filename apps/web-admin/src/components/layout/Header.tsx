'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-[#1A1A1A] border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center">
        {/* Mobile menu trigger could go here */}
        <button className="md:hidden mr-4 text-gray-400 hover:text-white">
          <Menu size={24} />
        </button>
        <div className="hidden md:block">
          <span className="text-sm font-medium text-gray-300">
            本日の営業: {new Date().toLocaleDateString('ja-JP')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center border border-gray-700">
            <User size={16} className="text-gray-400" />
          </div>
          <div className="hidden sm:block">
            <p className="font-medium text-gray-200">{user?.displayName || '管理者'}</p>
            <p className="text-xs text-gold-500">{user?.role}</p>
          </div>
        </div>

        <button 
          onClick={() => logout()}
          className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2 text-sm"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">ログアウト</span>
        </button>
      </div>
    </header>
  );
}
