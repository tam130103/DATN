import React, { useCallback, useEffect, useState } from 'react';
import { ChatCircle } from '@phosphor-icons/react';
import { AdminStateView } from '../../components/admin/AdminStateView';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PromptDialog } from '../../components/common/PromptDialog';
import { adminService, AdminComment } from '../../services/admin.service';
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

const AdminCommentsPage: React.FC = () => {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingHideComment, setPendingHideComment] = useState<AdminComment | null>(null);
  const [pendingDeleteComment, setPendingDeleteComment] = useState<AdminComment | null>(null);

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
      setError(getApiMessage(nextError, 'Không thể tải danh sách bình luận.'));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleModerate = async (id: string, newStatus: string, reason?: string) => {
    setActionError(null);
    try {
      await adminService.moderateComment(id, newStatus, reason);
      await fetchComments();
    } catch (nextError) {
      setActionError(getApiMessage(nextError, 'Có lỗi xảy ra khi xử lý bình luận.'));
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title flex items-center gap-2">
          <ChatCircle size={26} weight="bold" aria-hidden="true" />
          Quản lý bình luận
        </h1>
        <p className="admin-page-subtitle">Tổng cộng {total.toLocaleString('vi-VN')} bình luận</p>
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
            aria-label="Lọc trạng thái bình luận"
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
          <AdminStateView title="Không thể tải bình luận" description={error} onRetry={() => void fetchComments()} />
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
                        src={comment.user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user.name || '')}&size=32&background=4150F7&color=fff`}
                        alt={comment.user.name || comment.user.username || 'Người bình luận'}
                        className="user-cell-avatar"
                      />
                      <div className="user-cell-name">@{comment.user.username || comment.user.name || '-'}</div>
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
                      <button className="admin-action-btn hide" type="button" onClick={() => setPendingHideComment(comment)}>
                        Ẩn
                      </button>
                    ) : comment.status === 'hidden' ? (
                      <button className="admin-action-btn show" type="button" onClick={() => void handleModerate(comment.id, 'visible')}>
                        Hiện
                      </button>
                    ) : null}
                    {comment.status !== 'deleted' && (
                      <button className="admin-action-btn danger" type="button" onClick={() => setPendingDeleteComment(comment)}>
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
        open={Boolean(pendingHideComment)}
        title="Ẩn bình luận"
        description="Nhập lý do để lưu lại dấu vết kiểm duyệt."
        label="Lý do ẩn"
        placeholder="Ví dụ: Bình luận công kích cá nhân…"
        confirmLabel="Ẩn bình luận"
        onCancel={() => setPendingHideComment(null)}
        onConfirm={(reason) => {
          const comment = pendingHideComment;
          setPendingHideComment(null);
          if (comment) void handleModerate(comment.id, 'hidden', reason);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteComment)}
        title="Xóa vĩnh viễn bình luận"
        description="Bình luận sẽ chuyển sang trạng thái đã xóa và không còn hiển thị trong hệ thống."
        confirmLabel="Xóa bình luận"
        variant="danger"
        onCancel={() => setPendingDeleteComment(null)}
        onConfirm={() => {
          const comment = pendingDeleteComment;
          setPendingDeleteComment(null);
          if (comment) void handleModerate(comment.id, 'deleted');
        }}
      />
    </div>
  );
};

export default AdminCommentsPage;
