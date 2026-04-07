import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AdminShell.css';

const AdminShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span className="admin-logo-icon">⚙️</span>
            <span className="admin-logo-text">Admin Panel</span>
          </div>
          <div className="admin-user-info">
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=6366f1&color=fff`}
              alt="avatar"
              className="admin-avatar"
            />
            <div>
              <div className="admin-user-name">{user?.name || user?.username}</div>
              <div className="admin-user-role">Administrator</div>
            </div>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">👥</span>
            <span>Người dùng</span>
          </NavLink>
          <NavLink to="/admin/posts" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📝</span>
            <span>Bài viết</span>
          </NavLink>
          <NavLink to="/admin/comments" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">💬</span>
            <span>Bình luận</span>
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">🚨</span>
            <span>Báo cáo</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/" className="admin-nav-item">
            <span className="nav-icon">🏠</span>
            <span>Về trang chủ</span>
          </NavLink>
          <button className="admin-nav-item admin-logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminShell;
