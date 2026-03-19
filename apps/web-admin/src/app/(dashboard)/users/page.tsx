'use client';

import { useState } from 'react';
import { Search, Plus, UserCog, UserX, Shield, Loader2, KeyRound } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useToast } from '@/components/ui/Toast';

export default function UsersPage() {
  const { users, isLoading, createUser, updateStatus, resetPassword } = useUsers();
  const { success, error: showError } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState('Cast');
  const [newName, setNewName] = useState('');
  const [newUserType, setNewUserType] = useState('cast');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredUsers = users.filter((u) => {
    if (searchQuery && !u.displayName?.includes(searchQuery) && !u.loginId.includes(searchQuery)) return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newName) return;
    setIsSubmitting(true);
    try {
      const res = await createUser({
        role: newRole,
        displayName: newName,
        userType: newUserType,
      });
      setShowCreateModal(false);
      setNewName('');
      alert(`ユーザー「${res.displayName}」を作成しました。\nログインID: ${res.loginId}\n初期パスワード: ${res.initialPassword}\n\n※このパスワードは一度しか表示されません。対象者に伝えてください。`);
      success('ユーザーを作成しました');
    } catch (e: any) {
      showError(e?.response?.data?.message ?? '作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`${user.displayName}のアカウントを${nextStatus === 'active' ? '有効' : '無効(停止)'}にしますか？`)) return;
    try {
      await updateStatus(user.accountId, nextStatus);
      success('ステータスを更新しました');
    } catch {
      showError('更新に失敗しました');
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!confirm(`${user.displayName} のパスワードをリセットしますか？`)) return;
    try {
      const res = await resetPassword(user.accountId);
      alert(`パスワードをリセットしました。\n新しいパスワード: ${res.newPassword}\n\n対象者に伝えてください。`);
      success('パスワードを初期化しました');
    } catch {
      showError('初期化に失敗しました');
    }
  };

  return (
    <div className="p-6 md:p-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">ユーザー管理</h1>
          <p className="text-sm text-gray-400 mt-2">
            スタッフやキャストのアカウント発行、権限管理、ステータス変更を行います。
          </p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white font-medium rounded-lg hover:bg-gold-500 transition-colors shadow-sm"
        >
          <Plus size={18} />
          新規ユーザー追加
        </button>
      </div>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#222]">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ログインIDや名前で検索..." 
              className="w-full pl-10 pr-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gold-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none">
              <option value="">すべての権限</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
              <option value="Cast">Cast</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 bg-[#111] border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none">
              <option value="">すべての状態</option>
              <option value="active">有効</option>
              <option value="inactive">無効</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#2A2A2A] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium border-b border-gray-700">ログインID</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">表示名</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">権限</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700">状態</th>
                <th className="px-6 py-4 font-medium border-b border-gray-700 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    該当するユーザーが見つかりません
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.accountId} className="hover:bg-[#222] transition-colors">
                    <td className="px-6 py-4 font-mono text-gray-300">{user.loginId}</td>
                    <td className="px-6 py-4 font-medium text-gray-200">
                      {user.displayName}
                      <span className="ml-2 text-[10px] text-gray-500">({user.userType})</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                        ${user.role === 'Admin' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : ''}
                        ${user.role === 'Manager' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : ''}
                        ${user.role === 'Staff' ? 'bg-green-900/30 text-green-300 border-green-800' : ''}
                        ${user.role === 'Cast' ? 'bg-pink-900/30 text-pink-300 border-pink-800' : ''}
                      `}>
                        {user.role === 'Admin' && <Shield size={12} />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5
                        ${user.status === 'active' ? 'text-green-400' : 'text-gray-500'}
                      `}>
                        <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                        {user.status === 'active' ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3 text-gray-400">
                        <button onClick={() => handleResetPassword(user)} className="hover:text-blue-400 transition-colors" title="パスワードリセット">
                          <KeyRound size={18} />
                        </button>
                        <button onClick={() => handleToggleStatus(user)} className={`${user.status === 'active' ? 'hover:text-red-400' : 'hover:text-green-400'} transition-colors`} title="ステータス変更">
                          {user.status === 'active' ? <UserX size={18} /> : <UserCog size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新規登録モーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-gray-100 mb-6">新規ユーザー追加</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">表示名 (必須)</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
                  placeholder="例: 山田 花子"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">権限 (Role)</label>
                <select 
                  value={newRole}
                  onChange={e => {
                    setNewRole(e.target.value);
                    if (e.target.value === 'Cast') setNewUserType('cast');
                    else if (e.target.value === 'Staff' || e.target.value === 'Manager') setNewUserType('staff');
                    else setNewUserType('admin');
                  }}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="Admin">Admin (全体管理者)</option>
                  <option value="Manager">Manager (店長)</option>
                  <option value="Staff">Staff (スタッフ)</option>
                  <option value="Cast">Cast (キャスト)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">ユーザー種別 (内部用)</label>
                <select 
                  value={newUserType}
                  onChange={e => setNewUserType(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold-500"
                >
                  <option value="cast">キャスト</option>
                  <option value="staff">スタッフ</option>
                  <option value="admin">管理者</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-transparent border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-800 transition-colors"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newName || isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-gold-600 hover:bg-gold-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                作成する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
