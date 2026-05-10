import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';
import './AdminShell.css';

const AdminShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      {/* Mobile hamburger */}
      <button
        className="admin-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle admin menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <span className="admin-logo-icon">⚙️</span>
            <span className="admin-logo-text">Admin Panel</span>
          </div>
          <div className="admin-user-info">
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=4150F7&color=fff`}
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
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <span className="nav-icon">👥</span>
            <span>Người dùng</span>
          </NavLink>
          <NavLink to="/admin/posts" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <span className="nav-icon">📝</span>
            <span>Bài viết</span>
          </NavLink>
          <NavLink to="/admin/comments" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <span className="nav-icon">💬</span>
            <span>Bình luận</span>
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <span className="nav-icon">🚨</span>
            <span>Báo cáo</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-nav-item" style={{justifyContent: 'space-between', cursor: 'default'}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <span className="nav-icon">🌓</span>
                <span>Giao diện</span>
             </div>
             <ThemeToggle />
          </div>
          <NavLink to="/" className="admin-nav-item" onClick={closeSidebar}>
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

