import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AdminDailyGrowth } from '../../services/admin.service';

interface AdminGrowthChartProps {
  data: AdminDailyGrowth[];
}

const AdminGrowthChart: React.FC<AdminGrowthChartProps> = ({ data }) => (
  <div className="admin-table-container" style={{ padding: '24px 20px', marginTop: '24px', overflow: 'hidden' }}>
    <h3 className="admin-section-title" style={{ marginBottom: '24px' }}>
      Tăng trưởng 7 ngày qua
    </h3>
    <div style={{ width: '100%', height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--app-muted)" tick={{ fill: 'var(--app-muted)' }} axisLine={false} tickLine={false} />
          <YAxis stroke="var(--app-muted)" tick={{ fill: 'var(--app-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              borderRadius: '8px',
              color: 'var(--app-text)',
            }}
            itemStyle={{ fontWeight: 'bold' }}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
          <Line type="monotone" name="Người dùng mới" dataKey="users" stroke="var(--app-primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          <Line type="monotone" name="Bài viết mới" dataKey="posts" stroke="var(--app-accent)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default AdminGrowthChart;
