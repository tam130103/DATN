import React, { useCallback, useEffect, useState } from 'react';
import { Article } from '@phosphor-icons/react';
import { AdminStateView } from '../../components/admin/AdminStateView';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PromptDialog } from '../../components/common/PromptDialog';
import { adminService, AdminPost } from '../../services/admin.service';
import { getApiMessage } from '../../utils/api-error';

const AdminTableSkeleton = React.memo(() => (
  <div className="p-5">
    {Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="flex items-center gap-4 border-b border-[var(--app-border)] py-3 last:border-b-0">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="skeleton h-3 w-1/3" />
          <div className="skeleton h-3 w-2/3" />
        </div>
        <div className="skeleton h-8 w-20" />
      </div>
    ))}
  </div>
));

const AdminPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingHidePost, setPendingHidePost] = useState<AdminPost | null>(null);
  const [pendingDeletePost, setPendingDeletePost] = useState<AdminPost | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getPosts({ status: status || undefined, page, limit: 20 });
      setPosts(data.posts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (nextError) {
      setPosts([]);
      setTotal(0);
      setTotalPages(1);
      setError(getApiMessage(nextError, 'Không thể tải danh sách bài viết.'));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const handleModerate = async (id: string, newStatus: string, reason?: string) => {
    setActionError(null);
    try {
      await adminService.moderatePost(id, newStatus, reason);
      await fetchPosts();
    } catch (nextError) {
      setActionError(getApiMessage(nextError, 'Có lỗi xảy ra khi xử lý bài viết.'));
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title flex items-center gap-2">
          <Article size={26} weight="bold" aria-hidden="true" />
          Quản lý bài viết
        </h1>
        <p className="admin-page-subtitle">Tổng cộng {total.toLocaleString('vi-VN')} bài viết</p>
      </div>

      {actionError ? <p className="mb-3 text-sm text-[var(--app-danger)]">{actionError}</p> : null}

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <select
            className="admin-filter-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Lọc trạng thái bài viết"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="visible">Hiển thị</option>
            <option value="hidden">Đã ẩn</option>
            <option value="deleted">Đã xóa</option>
          </select>
        </div>

        {loading ? (
          <AdminTableSkeleton />
        ) : error ? (
          <AdminStateView title="Không thể tải bài viết" description={error} onRetry={() => void fetchPosts()} />
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
                        src={post.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.name || '')}&size=32&background=4150F7&color=fff`}
                        alt={post.user.name || post.user.username || 'Tác giả'}
                        className="user-cell-avatar"
                      />
                      <div className="user-cell-name">@{post.user.username || post.user.name || '-'}</div>
                    </div>
                  </td>
                  <td className="target-text" title={post.caption}>{post.caption || '(Không có caption)'}</td>
                  <td>
                    <span className={`status-badge ${post.status}`}>
                      {post.status === 'visible' ? 'Hiển thị' : post.status === 'hidden' ? 'Đã ẩn' : 'Đã xóa'}
                    </span>
                  </td>
                  <td className="target-text">{post.moderationReason || '-'}</td>
                  <td>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {post.status === 'visible' ? (
                      <button className="admin-action-btn hide" type="button" onClick={() => setPendingHidePost(post)}>
                        Ẩn
                      </button>
                    ) : post.status === 'hidden' ? (
                      <button className="admin-action-btn show" type="button" onClick={() => void handleModerate(post.id, 'visible')}>
                        Hiện
                      </button>
                    ) : null}
                    {post.status !== 'deleted' && (
                      <button className="admin-action-btn danger" type="button" onClick={() => setPendingDeletePost(post)}>
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
            <button className="admin-page-btn" type="button" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>Trước</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((nextPage) => (
              <button key={nextPage} className={`admin-page-btn ${nextPage === page ? 'active' : ''}`} type="button" onClick={() => setPage(nextPage)}>{nextPage}</button>
            ))}
            <button className="admin-page-btn" type="button" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>Sau</button>
          </div>
        )}
      </div>

      <PromptDialog
        open={Boolean(pendingHidePost)}
        title="Ẩn bài viết"
        description="Nhập lý do để lưu lại dấu vết kiểm duyệt."
        label="Lý do ẩn"
        placeholder="Ví dụ: Nội dung vi phạm tiêu chuẩn cộng đồng…"
        confirmLabel="Ẩn bài viết"
        onCancel={() => setPendingHidePost(null)}
        onConfirm={(reason) => {
          const post = pendingHidePost;
          setPendingHidePost(null);
          if (post) void handleModerate(post.id, 'hidden', reason);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDeletePost)}
        title="Xóa vĩnh viễn bài viết"
        description="Bài viết sẽ chuyển sang trạng thái đã xóa và không còn hiển thị trong hệ thống."
        confirmLabel="Xóa bài viết"
        variant="danger"
        onCancel={() => setPendingDeletePost(null)}
        onConfirm={() => {
          const post = pendingDeletePost;
          setPendingDeletePost(null);
          if (post) void handleModerate(post.id, 'deleted');
        }}
      />
    </div>
  );
};

export default AdminPostsPage;
