import React, { useEffect, useState, useCallback } from 'react';
import { AdminStateView } from '../../components/admin/AdminStateView';
import { adminService, AdminUser } from '../../services/admin.service';
import { useAuth } from '../../contexts/AuthContext';
import { getApiMessage } from '../../utils/api-error';

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, message, confirmLabel, confirmClass = 'btn-danger', onConfirm, onCancel
}) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '32px 36px',
        maxWidth: 420, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#555', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid #ddd',
              background: '#f5f5f5', cursor: 'pointer', fontWeight: 600,
            }}
          >Hủy</button>
          <button
            onClick={onConfirm}
            className={confirmClass}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: confirmClass === 'btn-danger' ? '#ef4444' : '#4150F7',
              color: '#fff', cursor: 'pointer', fontWeight: 600,
            }}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

const roleMeta: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: '⭐ Admin', bg: '#fef3c7', color: '#92400e' },
  user:  { label: '👤 Thành viên', bg: '#ede9fe', color: '#5b21b6' },
  system:{ label: '🤖 Hệ thống', bg: '#f0fdf4', color: '#166534' },
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const meta = roleMeta[role] ?? { label: role, bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      background: meta.bg, color: meta.color,
    }}>{meta.label}</span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmClass?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      setError(getApiMessage(nextError, 'Khong the tai danh sach nguoi dung.'));
    } finally {
      setLoading(false);
    }
  }, [search, status, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleStatusUpdate = (user: AdminUser, newStatus: 'active' | 'blocked') => {
    if (newStatus === 'blocked') {
      const reason = window.prompt('Lý do khóa tài khoản:');
      if (reason === null) return; // cancelled
      setConfirmModal({
        open: true,
        title: 'Xác nhận khóa tài khoản',
        message: `Bạn có chắc muốn khóa tài khoản @${user.username || user.email}?`,
        confirmLabel: 'Khóa tài khoản',
        confirmClass: 'btn-danger',
        onConfirm: async () => {
          setConfirmModal(m => ({ ...m, open: false }));
          setActionLoading(user.id);
          try {
            await adminService.updateUserStatus(user.id, 'blocked', reason);
            showToast(`Đã khóa tài khoản @${user.username || user.email}`);
            fetchUsers();
          } catch {
            showToast('Có lỗi xảy ra', 'error');
          } finally {
            setActionLoading(null);
          }
        },
      });
    } else {
      setConfirmModal({
        open: true,
        title: 'Mở khóa tài khoản',
        message: `Bạn có chắc muốn mở khóa tài khoản @${user.username || user.email}?`,
        confirmLabel: 'Mở khóa',
        confirmClass: 'btn-primary',
        onConfirm: async () => {
          setConfirmModal(m => ({ ...m, open: false }));
          setActionLoading(user.id);
          try {
            await adminService.updateUserStatus(user.id, 'active');
            showToast(`Đã mở khóa tài khoản @${user.username || user.email}`);
            fetchUsers();
          } catch {
            showToast('Có lỗi xảy ra', 'error');
          } finally {
            setActionLoading(null);
          }
        },
      });
    }
  };

  const handleRoleChange = (user: AdminUser, newRole: 'user' | 'admin') => {
    if (user.id === currentUser?.id) {
      showToast('Bạn không thể thay đổi vai trò của chính mình', 'error');
      return;
    }
    if (user.role === 'system') {
      showToast('Không thể thay đổi vai trò tài khoản hệ thống', 'error');
      return;
    }

    const roleLabel = newRole === 'admin' ? '⭐ Admin' : '👤 Thành viên';
    setConfirmModal({
      open: true,
      title: `Thay đổi vai trò`,
      message: `Bạn có chắc muốn đặt tài khoản @${user.username || user.email} thành ${roleLabel}?`,
      confirmLabel: 'Xác nhận',
      confirmClass: 'btn-primary',
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        setActionLoading(user.id + '-role');
        try {
          await adminService.updateUserRole(user.id, newRole);
          showToast(`Đã cập nhật vai trò thành ${roleLabel}`);
          fetchUsers();
        } catch (e: any) {
          const msg = e?.response?.data?.message || 'Có lỗi xảy ra';
          showToast(msg, 'error');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const isSelf = (userId: string) => userId === currentUser?.id;

  return (
    <div>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 2000,
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
          background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          animation: 'fadeIn .2s ease',
        }}>
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.msg}
        </div>
      )}

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmClass={confirmModal.confirmClass}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, open: false }))}
      />

      {/* ── Header ── */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">👥 Quản lý người dùng</h1>
        <p className="admin-page-subtitle">Tổng cộng {total} người dùng</p>
      </div>

      <div className="admin-table-container">
        {/* ── Toolbar ── */}
        <div className="admin-table-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <input
            className="admin-search-input"
            placeholder="Tìm theo email, username, tên..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="admin-filter-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="blocked">Bị khóa</option>
          </select>
          <select
            className="admin-filter-select"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="user">Thành viên</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="admin-loading">Đang tải...</div>
        ) : error ? (
          <AdminStateView
            title="Khong the tai nguoi dung"
            description={error}
            onRetry={() => void fetchUsers()}
          />
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
                  {/* Avatar + name */}
                  <td>
                    <div className="user-cell">
                      <img
                        src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.email)}&size=32&background=4150F7&color=fff`}
                        alt="avatar"
                        className="user-cell-avatar"
                      />
                      <div>
                        <div className="user-cell-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {user.name || '—'}
                          {isSelf(user.id) && (
                            <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>Bạn</span>
                          )}
                        </div>
                        <div className="user-cell-email">@{user.username || '—'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td style={{ fontSize: 13, color: '#555' }}>{user.email}</td>

                  {/* Role badge */}
                  <td><RoleBadge role={user.role} /></td>

                  {/* Status badge */}
                  <td>
                    <span className={`status-badge ${user.status}`}>
                      {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>

                  {/* Created at */}
                  <td style={{ fontSize: 13, color: '#888' }}>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>

                  {/* ── Role assignment ── */}
                  <td>
                    {user.role === 'system' || isSelf(user.id) ? (
                      <span style={{ fontSize: 12, color: '#bbb' }}>—</span>
                    ) : (
                      <select
                        disabled={actionLoading === user.id + '-role'}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user, e.target.value as 'user' | 'admin')}
                        style={{
                          padding: '5px 10px', borderRadius: 8,
                          border: '1px solid #e5e7eb', background: '#fafafa',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: user.role === 'admin' ? '#92400e' : '#5b21b6',
                        }}
                      >
                        <option value="user">👤 Thành viên</option>
                        <option value="admin">⭐ Admin</option>
                      </select>
                    )}
                  </td>

                  {/* ── Block / Unblock ── */}
                  <td>
                    {isSelf(user.id) || user.role === 'system' ? (
                      <span style={{ fontSize: 12, color: '#bbb' }}>—</span>
                    ) : user.status === 'active' ? (
                      <button
                        className="admin-action-btn block"
                        disabled={actionLoading === user.id}
                        onClick={() => handleStatusUpdate(user, 'blocked')}
                      >
                        {actionLoading === user.id ? '...' : 'Khóa'}
                      </button>
                    ) : (
                      <button
                        className="admin-action-btn unblock"
                        disabled={actionLoading === user.id}
                        onClick={() => handleStatusUpdate(user, 'active')}
                      >
                        {actionLoading === user.id ? '...' : 'Mở khóa'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`admin-page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Sau →</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
