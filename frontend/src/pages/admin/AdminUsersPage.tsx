import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, UserCircle, Users } from '@phosphor-icons/react';
import { AdminStateView } from '../../components/admin/AdminStateView';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PromptDialog } from '../../components/common/PromptDialog';
import { adminService, AdminUser } from '../../services/admin.service';
import { useAuth } from '../../contexts/AuthContext';
import { getApiMessage } from '../../utils/api-error';

const AdminTableSkeleton = React.memo(() => (
  <div className="p-5">
    {Array.from({ length: 7 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 border-b border-[var(--app-border)] py-3 last:border-b-0">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-3 w-2/3" />
        </div>
        <div className="skeleton h-8 w-24" />
      </div>
    ))}
  </div>
));

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const isAdmin = role === 'admin';
  const isSystem = role === 'system';
  const Icon = isAdmin ? ShieldCheck : UserCircle;
  const label = isSystem ? 'Hệ thống' : isAdmin ? 'Admin' : 'Thành viên';
  return (
    <span className={`status-badge ${isAdmin ? 'admin' : 'user'}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
};

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingBlockUser, setPendingBlockUser] = useState<AdminUser | null>(null);
  const [pendingUnblockUser, setPendingUnblockUser] = useState<AdminUser | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: AdminUser; role: 'user' | 'admin' } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getUsers({
        search: search || undefined,
        status: status || undefined,
        role: roleFilter || undefined,
        page,
        limit: 20,
      });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (nextError) {
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
      setError(getApiMessage(nextError, 'Không thể tải danh sách người dùng.'));
    } finally {
      setLoading(false);
    }
  }, [search, status, roleFilter, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const updateUserStatus = async (user: AdminUser, nextStatus: 'active' | 'blocked', reason?: string) => {
    setActionLoading(user.id);
    try {
      await adminService.updateUserStatus(user.id, nextStatus, reason);
      toast.success(nextStatus === 'blocked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
      await fetchUsers();
    } catch (nextError) {
      toast.error(getApiMessage(nextError, 'Có lỗi xảy ra khi cập nhật tài khoản.'));
    } finally {
      setActionLoading(null);
    }
  };

  const updateUserRole = async (user: AdminUser, nextRole: 'user' | 'admin') => {
    setActionLoading(`${user.id}-role`);
    try {
      await adminService.updateUserRole(user.id, nextRole);
      toast.success('Đã cập nhật vai trò.');
      await fetchUsers();
    } catch (nextError) {
      toast.error(getApiMessage(nextError, 'Có lỗi xảy ra khi cập nhật vai trò.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = (user: AdminUser, nextRole: 'user' | 'admin') => {
    if (user.id === currentUser?.id) {
      toast.error('Bạn không thể thay đổi vai trò của chính mình.');
      return;
    }
    if (user.role === 'system') {
      toast.error('Không thể thay đổi vai trò tài khoản hệ thống.');
      return;
    }
    if (user.role === nextRole) return;
    setPendingRoleChange({ user, role: nextRole });
  };

  const isSelf = (userId: string) => userId === currentUser?.id;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title flex items-center gap-2">
          <Users size={26} weight="bold" aria-hidden="true" />
          Quản lý người dùng
        </h1>
        <p className="admin-page-subtitle">Tổng cộng {total.toLocaleString('vi-VN')} người dùng</p>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <input
            className="admin-search-input"
            name="admin-user-search"
            placeholder="Tìm theo email, username, tên…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <select
            className="admin-filter-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Lọc trạng thái người dùng"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="blocked">Bị khóa</option>
          </select>
          <select
            className="admin-filter-select"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Lọc vai trò người dùng"
          >
            <option value="">Tất cả vai trò</option>
            <option value="user">Thành viên</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {loading ? (
          <AdminTableSkeleton />
        ) : error ? (
          <AdminStateView title="Không thể tải người dùng" description={error} onRetry={() => void fetchUsers()} />
        ) : users.length === 0 ? (
          <div className="admin-empty">Không tìm thấy người dùng nào</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Tham gia</th>
                <th>Phân quyền</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ opacity: actionLoading?.startsWith(user.id) ? 0.6 : 1, transition: 'opacity .2s' }}>
                  <td>
                    <div className="user-cell">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&size=32&background=4150F7&color=fff`}
                        alt={user.name || user.username || user.email}
                        className="user-cell-avatar"
                      />
                      <div>
                        <div className="user-cell-name">
                          {user.name || '-'}
                          {isSelf(user.id) ? <span className="ml-2 status-badge user">Bạn</span> : null}
                        </div>
                        <div className="user-cell-email">@{user.username || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td><RoleBadge role={user.role} /></td>
                  <td>
                    <span className={`status-badge ${user.status}`}>{user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}</span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {user.role === 'system' || isSelf(user.id) ? (
                      <span className="text-xs text-[var(--app-muted)]">-</span>
                    ) : (
                      <select
                        disabled={actionLoading === `${user.id}-role`}
                        value={user.role}
                        onChange={(event) => handleRoleChange(user, event.target.value as 'user' | 'admin')}
                        className="admin-filter-select"
                        aria-label={`Đổi vai trò ${user.email}`}
                      >
                        <option value="user">Thành viên</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td>
                    {isSelf(user.id) || user.role === 'system' ? (
                      <span className="text-xs text-[var(--app-muted)]">-</span>
                    ) : user.status === 'active' ? (
                      <button className="admin-action-btn block" type="button" disabled={actionLoading === user.id} onClick={() => setPendingBlockUser(user)}>
                        {actionLoading === user.id ? 'Đang xử lý…' : 'Khóa'}
                      </button>
                    ) : (
                      <button className="admin-action-btn unblock" type="button" disabled={actionLoading === user.id} onClick={() => setPendingUnblockUser(user)}>
                        {actionLoading === user.id ? 'Đang xử lý…' : 'Mở khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-page-btn" type="button" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Trước</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((nextPage) => (
              <button key={nextPage} className={`admin-page-btn ${nextPage === page ? 'active' : ''}`} type="button" onClick={() => setPage(nextPage)}>{nextPage}</button>
            ))}
            <button className="admin-page-btn" type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Sau</button>
          </div>
        )}
      </div>

      <PromptDialog
        open={Boolean(pendingBlockUser)}
        title="Khóa tài khoản"
        description="Nhập lý do khóa để người quản trị khác có thể theo dõi quyết định."
        label="Lý do khóa"
        placeholder="Ví dụ: Tài khoản spam hoặc vi phạm tiêu chuẩn cộng đồng…"
        confirmLabel="Khóa tài khoản"
        onCancel={() => setPendingBlockUser(null)}
        onConfirm={(reason) => {
          const user = pendingBlockUser;
          setPendingBlockUser(null);
          if (user) void updateUserStatus(user, 'blocked', reason);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingUnblockUser)}
        title="Mở khóa tài khoản"
        description={`Tài khoản ${pendingUnblockUser?.email || ''} sẽ hoạt động trở lại.`}
        confirmLabel="Mở khóa"
        onCancel={() => setPendingUnblockUser(null)}
        onConfirm={() => {
          const user = pendingUnblockUser;
          setPendingUnblockUser(null);
          if (user) void updateUserStatus(user, 'active');
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingRoleChange)}
        title="Thay đổi vai trò"
        description={`Đặt tài khoản ${pendingRoleChange?.user.email || ''} thành ${pendingRoleChange?.role === 'admin' ? 'Admin' : 'Thành viên'}?`}
        confirmLabel="Xác nhận"
        onCancel={() => setPendingRoleChange(null)}
        onConfirm={() => {
          const next = pendingRoleChange;
          setPendingRoleChange(null);
          if (next) void updateUserRole(next.user, next.role);
        }}
      />
    </div>
  );
};

export default AdminUsersPage;
