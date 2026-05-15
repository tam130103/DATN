import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Article, ChatCircle, Eye, Warning } from '@phosphor-icons/react';
import { AdminStateView } from '../../components/admin/AdminStateView';
import { adminService, AdminReport } from '../../services/admin.service';
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

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getReports({ status: status || undefined, page, limit: 20 });
      setReports(data.reports);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (nextError) {
      setReports([]);
      setTotal(0);
      setTotalPages(1);
      setError(getApiMessage(nextError, 'Không thể tải danh sách báo cáo.'));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleReview = async (id: string, newStatus: 'resolved' | 'rejected') => {
    setActionError(null);
    try {
      await adminService.reviewReport(id, newStatus);
      await fetchReports();
    } catch (nextError) {
      setActionError(getApiMessage(nextError, 'Có lỗi xảy ra khi xử lý báo cáo.'));
    }
  };

  const handleViewContent = (report: AdminReport) => {
    setActionError(null);
    if (report.targetType === 'post') {
      navigate(`/posts/${report.targetId}`);
      return;
    }

    if (report.postId) {
      navigate(`/posts/${report.postId}?highlightComment=${report.targetId}`);
      return;
    }

    setActionError('Không tìm thấy bài viết chứa bình luận này.');
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title flex items-center gap-2">
          <Warning size={26} weight="bold" aria-hidden="true" />
          Quản lý báo cáo
        </h1>
        <p className="admin-page-subtitle">Tổng cộng {total.toLocaleString('vi-VN')} báo cáo</p>
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
            aria-label="Lọc trạng thái báo cáo"
          >
            <option value="">Tất cả</option>
            <option value="open">Đang mở</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>

        {loading ? (
          <AdminTableSkeleton />
        ) : error ? (
          <AdminStateView title="Không thể tải báo cáo" description={error} onRetry={() => void fetchReports()} />
        ) : reports.length === 0 ? (
          <div className="admin-empty">Không có báo cáo nào</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người báo cáo</th>
                <th>Loại</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-cell-name">{report.reporter.name || report.reporter.username || 'Unknown'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${report.targetType}`}>
                      {report.targetType === 'post' ? <Article size={14} aria-hidden="true" /> : <ChatCircle size={14} aria-hidden="true" />}
                      {report.targetType === 'post' ? 'Bài viết' : 'Bình luận'}
                    </span>
                  </td>
                  <td className="target-text" title={report.reason}>{report.reason}</td>
                  <td>
                    <span className={`status-badge ${report.status}`}>
                      {report.status === 'open' ? 'Đang mở' : report.status === 'resolved' ? 'Đã giải quyết' : 'Từ chối'}
                    </span>
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    <button
                      className="admin-action-btn view"
                      type="button"
                      onClick={() => handleViewContent(report)}
                      title={report.targetType === 'post' ? 'Xem bài viết bị báo cáo' : 'Xem bình luận bị báo cáo'}
                    >
                      <Eye size={14} aria-hidden="true" /> Xem
                    </button>
                    {report.status === 'open' && (
                      <>
                        <button className="admin-action-btn resolve" type="button" onClick={() => void handleReview(report.id, 'resolved')}>
                          Giải quyết
                        </button>
                        <button className="admin-action-btn reject" type="button" onClick={() => void handleReview(report.id, 'rejected')}>
                          Từ chối
                        </button>
                      </>
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
    </div>
  );
};

export default AdminReportsPage;
