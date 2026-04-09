import React, { useEffect, useState } from 'react';
import { adminService, AdminDashboardResponse } from '../../services/admin.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

      {data && data.dailyGrowth && data.dailyGrowth.length > 0 && (
        <div className="admin-table-container" style={{ padding: '24px 20px', marginTop: '24px', overflow: 'hidden' }}>
          <h3 className="admin-section-title" style={{ marginBottom: '24px' }}>📈 Tăng trưởng 7 ngày qua</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#2d2d3a', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name="Người dùng mới" dataKey="users" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Bài viết mới" dataKey="posts" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
