import React, { useEffect, useState, useCallback } from 'react';
import { AdminStateView } from '../../components/admin/AdminStateView';
import { adminService, AdminComment } from '../../services/admin.service';
import { getApiMessage } from '../../utils/api-error';

const AdminCommentsPage: React.FC = () => {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getComments({ status: status || undefined, page, limit: 20 });
      setComments(data.comments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (nextError) {
      setComments([]);
      setTotal(0);
      setTotalPages(1);
      setError(getApiMessage(nextError, 'Khong the tai danh sach binh luan.'));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleModerate = async (id: string, newStatus: string, reason?: string) => {
    try {
      await adminService.moderateComment(id, newStatus, reason);
      fetchComments();
    } catch {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">💬 Quản lý bình luận</h1>
        <p className="admin-page-subtitle">Tổng cộng {total} bình luận</p>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <select
            className="admin-filter-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="visible">Hiển thị</option>
            <option value="hidden">Đã ẩn</option>
            <option value="deleted">Đã xóa</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải...</div>
        ) : error ? (
          <AdminStateView
            title="Khong the tai binh luan"
            description={error}
            onRetry={() => void fetchComments()}
          />
        ) : comments.length === 0 ? (
          <div className="admin-empty">Không có bình luận nào</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người bình luận</th>
                <th>Nội dung</th>
                <th>Bài viết</th>
                <th>Trạng thái</th>
                <th>Ngày đăng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr key={comment.id}>
                  <td>
                    <div className="user-cell">
                      <img
                        src={comment.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name || '')}&size=32&background=6366f1&color=fff`}
                        alt="avatar"
                        className="user-cell-avatar"
                      />
                      <div className="user-cell-name">@{comment.user.username || comment.user.name || '—'}</div>
                    </div>
                  </td>
                  <td className="target-text" title={comment.content}>{comment.content}</td>
                  <td className="target-text" title={comment.post?.caption}>{comment.post?.caption || '(Không có caption)'}</td>
                  <td>
                    <span className={`status-badge ${comment.status}`}>
                      {comment.status === 'visible' ? 'Hiển thị' : comment.status === 'hidden' ? 'Đã ẩn' : 'Đã xóa'}
                    </span>
                  </td>
                  <td>{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {comment.status === 'visible' ? (
                      <button
                        className="admin-action-btn hide"
                        onClick={() => {
                          const reason = window.prompt('Lý do ẩn bình luận:');
                          if (reason !== null) handleModerate(comment.id, 'hidden', reason);
                        }}
                      >
                        Ẩn
                      </button>
                    ) : comment.status === 'hidden' ? (
                      <button className="admin-action-btn show" onClick={() => handleModerate(comment.id, 'visible')}>
                        Hiện
                      </button>
                    ) : null}
                    {comment.status !== 'deleted' && (
                      <button
                        className="admin-action-btn danger"
                        onClick={() => { if (window.confirm('Xóa vĩnh viễn bình luận này?')) handleModerate(comment.id, 'deleted'); }}
                      >
                        Xóa
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

export default AdminCommentsPage;
