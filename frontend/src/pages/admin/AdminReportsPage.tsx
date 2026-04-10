import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, AdminReport } from '../../services/admin.service';

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getReports({ status: status || undefined, page, limit: 20 });
      setReports(data.reports);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleReview = async (id: string, newStatus: 'resolved' | 'rejected') => {
    try {
      await adminService.reviewReport(id, newStatus);
      fetchReports();
    } catch {
      alert('Có lỗi xảy ra');
    }
  };

  const handleViewContent = (report: AdminReport) => {
    if (report.targetType === 'post') {
      navigate(`/posts/${report.targetId}`);
    } else {
      const postId = report.postId;
      if (postId) {
        // Navigate to the post and highlight the reported comment
        navigate(`/posts/${postId}?highlightComment=${report.targetId}`);
      } else {
        alert('Không tìm thấy bài viết chứa bình luận này.');
      }
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">🚨 Quản lý báo cáo</h1>
        <p className="admin-page-subtitle">Tổng cộng {total} báo cáo</p>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <select
            className="admin-filter-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả</option>
            <option value="open">Đang mở</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải...</div>
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
                      <div className="user-cell-name">
                        {report.reporter.name || report.reporter.username || 'Unknown'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${report.targetType}`}>{report.targetType === 'post' ? '📝 Bài viết' : '💬 BL'}</span>
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
                      onClick={() => handleViewContent(report)}
                      title={report.targetType === 'post' ? 'Xem bài viết bị báo cáo' : 'Xem bình luận bị báo cáo'}
                    >
                      👁 Xem
                    </button>
                    {report.status === 'open' && (
                      <>
                        <button className="admin-action-btn resolve" onClick={() => handleReview(report.id, 'resolved')}>
                          Giải quyết
                        </button>
                        <button className="admin-action-btn reject" onClick={() => handleReview(report.id, 'rejected')}>
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

export default AdminReportsPage;
