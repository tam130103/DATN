import React, { useEffect, useState, useCallback } from 'react';
import { adminService, AdminPost } from '../../services/admin.service';

const AdminPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getPosts({ status: status || undefined, page, limit: 20 });
      setPosts(data.posts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleModerate = async (id: string, newStatus: string, reason?: string) => {
    try {
      await adminService.moderatePost(id, newStatus, reason);
      fetchPosts();
    } catch {
      alert('Có lỗi xảy ra');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">📝 Quản lý bài viết</h1>
        <p className="admin-page-subtitle">Tổng cộng {total} bài viết</p>
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
        ) : posts.length === 0 ? (
          <div className="admin-empty">Không có bài viết nào</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tác giả</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th>Lý do xử lý</th>
                <th>Ngày đăng</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div className="user-cell">
                      <img
                        src={post.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name || '')}&size=32&background=6366f1&color=fff`}
                        alt="avatar"
                        className="user-cell-avatar"
                      />
                      <div className="user-cell-name">@{post.user.username || post.user.name || '—'}</div>
                    </div>
                  </td>
                  <td className="target-text" title={post.caption}>{post.caption || '(Không có caption)'}</td>
                  <td>
                    <span className={`status-badge ${post.status}`}>
                      {post.status === 'visible' ? 'Hiển thị' : post.status === 'hidden' ? 'Đã ẩn' : 'Đã xóa'}
                    </span>
                  </td>
                  <td className="target-text">{post.moderationReason || '—'}</td>
                  <td>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {post.status === 'visible' ? (
                      <button
                        className="admin-action-btn hide"
                        onClick={() => {
                          const reason = window.prompt('Lý do ẩn bài viết:');
                          if (reason !== null) handleModerate(post.id, 'hidden', reason);
                        }}
                      >
                        Ẩn
                      </button>
                    ) : post.status === 'hidden' ? (
                      <button className="admin-action-btn show" onClick={() => handleModerate(post.id, 'visible')}>
                        Hiện
                      </button>
                    ) : null}
                    {post.status !== 'deleted' && (
                      <button
                        className="admin-action-btn danger"
                        onClick={() => { if (window.confirm('Xóa vĩnh viễn bài viết này?')) handleModerate(post.id, 'deleted'); }}
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

export default AdminPostsPage;
