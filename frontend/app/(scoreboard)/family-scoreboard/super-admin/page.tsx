'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  getAllFamilies,
  banFamily,
  unbanFamily,
  deleteFamilyPermanently,
} from '@/lib/api/family-scoreboard';
import type { FamilyAdminDto } from '@/types/family-scoreboard';

function SuperAdminContent() {
  const [families, setFamilies] = useState<FamilyAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FamilyAdminDto | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const loadFamilies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllFamilies();
      setFamilies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  const filteredFamilies = useMemo(() => {
    if (!search.trim()) return families;
    const q = search.toLowerCase();
    return families.filter(
      (f) =>
        f.familyId.toLowerCase().includes(q) ||
        (f.displayCode ?? '').toLowerCase().includes(q) ||
        (f.adminDisplayName ?? '').toLowerCase().includes(q) ||
        f.adminUid.toLowerCase().includes(q)
    );
  }, [families, search]);

  const handleBanToggle = async (family: FamilyAdminDto) => {
    if (!confirm(family.isBanned ? `確定解封「${family.familyId}」？` : `確定封禁「${family.familyId}」？`)) return;
    setActionLoading(family.familyId);
    try {
      if (family.isBanned) {
        await unbanFamily(family.familyId);
      } else {
        await banFamily(family.familyId);
      }
      await loadFamilies();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteConfirmInput !== deleteTarget.familyId) return;
    setActionLoading(deleteTarget.familyId);
    try {
      await deleteFamilyPermanently(deleteTarget.familyId);
      setDeleteTarget(null);
      setDeleteConfirmInput('');
      await loadFamilies();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            <span className="text-red-400">Super Admin</span> - 家庭管理
          </h1>
          <p className="text-gray-400 mt-1">
            管理所有家庭：列表、封禁、永久刪除
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="搜尋 familyId / 代碼 / 管理者名稱 / UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-96 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex gap-4 mb-6 text-sm">
            <div className="bg-gray-800 rounded-lg px-4 py-2">
              總計 <span className="font-bold text-blue-400">{families.length}</span> 個家庭
            </div>
            <div className="bg-gray-800 rounded-lg px-4 py-2">
              已封禁 <span className="font-bold text-red-400">{families.filter(f => f.isBanned).length}</span>
            </div>
            {search && (
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                篩選結果 <span className="font-bold text-yellow-400">{filteredFamilies.length}</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
            {error}
            <button onClick={loadFamilies} className="ml-4 underline hover:text-red-200">
              重試
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="pb-3 pr-4">Family ID</th>
                  <th className="pb-3 pr-4">管理者</th>
                  <th className="pb-3 pr-4">代碼</th>
                  <th className="pb-3 pr-4 text-center">玩家數</th>
                  <th className="pb-3 pr-4">建立時間</th>
                  <th className="pb-3 pr-4 text-center">狀態</th>
                  <th className="pb-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredFamilies.map((family) => (
                  <tr
                    key={family.familyId}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors ${
                      family.isBanned ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded font-mono">
                        {family.familyId}
                      </code>
                    </td>
                    <td className="py-3 pr-4">
                      <div>{family.adminDisplayName || '-'}</div>
                      <div className="text-xs text-gray-500 font-mono">{family.adminUid.slice(0, 12)}...</div>
                    </td>
                    <td className="py-3 pr-4">
                      {family.displayCode ? (
                        <code className="text-blue-400 font-mono">{family.displayCode}</code>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={family.playerCount > 0 ? 'text-green-400' : 'text-gray-500'}>
                        {family.playerCount}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {formatDate(family.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      {family.isBanned ? (
                        <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded-full">
                          已封禁
                        </span>
                      ) : (
                        <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full">
                          正常
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleBanToggle(family)}
                          disabled={actionLoading === family.familyId}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                            family.isBanned
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                              : 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/70'
                          }`}
                        >
                          {family.isBanned ? '解封' : '封禁'}
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(family);
                            setDeleteConfirmInput('');
                          }}
                          disabled={actionLoading === family.familyId}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors disabled:opacity-50"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredFamilies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500">
                      {search ? '無符合條件的家庭' : '尚無家庭資料'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-400 mb-2">永久刪除家庭</h3>
            <p className="text-gray-300 text-sm mb-1">
              即將永久刪除家庭及其所有資料（玩家、交易、任務、商城等），此操作無法復原。
            </p>
            <div className="my-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-xs text-gray-400">Family ID</div>
              <code className="text-red-400 font-mono text-sm">{deleteTarget.familyId}</code>
              {deleteTarget.adminDisplayName && (
                <>
                  <div className="text-xs text-gray-400 mt-2">管理者</div>
                  <div className="text-sm">{deleteTarget.adminDisplayName}</div>
                </>
              )}
              <div className="text-xs text-gray-400 mt-2">玩家數</div>
              <div className="text-sm">{deleteTarget.playerCount}</div>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              請輸入 <code className="text-red-400">{deleteTarget.familyId}</code> 以確認刪除：
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={deleteTarget.familyId}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmInput('');
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmInput !== deleteTarget.familyId || actionLoading === deleteTarget.familyId}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === deleteTarget.familyId ? '刪除中...' : '確認永久刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      <SuperAdminContent />
    </RoleGuard>
  );
}
