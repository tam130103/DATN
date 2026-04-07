import React, { useEffect, useState } from 'react';
import { adminService, AdminDashboardResponse } from '../../services/admin.service';

const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading">Đang tải dữ liệu...</div>;

  const s = data?.stats;

  const cards = [
    { icon: '👥', label: 'Tổng người dùng', value: s?.totalUsers ?? 0 },
    { icon: '✅', label: 'Đang hoạt động', value: s?.activeUsers ?? 0, color: '#4ade80' },
    { icon: '🚫', label: 'Đã bị khóa', value: s?.blockedUsers ?? 0, color: '#f87171' },
    { icon: '📝', label: 'Tổng bài viết', value: s?.totalPosts ?? 0 },
    { icon: '🙈', label: 'Bài đã ẩn', value: s?.hiddenPosts ?? 0, color: '#fb923c' },
    { icon: '💬', label: 'Tổng bình luận', value: s?.totalComments ?? 0 },
    { icon: '🙉', label: 'BL đã ẩn', value: s?.hiddenComments ?? 0, color: '#fb923c' },
    { icon: '🚨', label: 'Báo cáo mở', value: s?.openReports ?? 0, color: '#facc15' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-title">📊 Dashboard</h1>
        <p className="admin-page-subtitle">Tổng quan hệ thống DATN Social</p>
      </div>

      <div className="admin-stats-grid">
        {cards.map((card) => (
          <div key={card.label} className="admin-stat-card">
            <span className="admin-stat-icon">{card.icon}</span>
            <div className="admin-stat-value" style={card.color ? { color: card.color } : {}}>
              {card.value.toLocaleString()}
            </div>
            <div className="admin-stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      {data && data.recentReports.length > 0 && (
        <div className="admin-table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d2d3a' }}>
            <h3 className="admin-section-title">🚨 Báo cáo gần đây</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người báo cáo</th>
                <th>Loại</th>
                <th>Lý do</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="user-cell">
                      <span>{r.reporter.name || r.reporter.username || 'Unknown'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${r.targetType}`}>{r.targetType}</span>
                  </td>
                  <td className="target-text">{r.reason}</td>
                  <td>
                    <span className={`status-badge ${r.status}`}>{r.status}</span>
                  </td>
                  <td>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
