import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Article,
  ChartBar,
  ChatCircle,
  House,
  List,
  MoonStars,
  SignOut,
  Users,
  Warning,
  X,
} from '@phosphor-icons/react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';
import './AdminShell.css';

const AdminShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      <button
        type="button"
        className="admin-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
      >
        {sidebarOpen ? <X size={22} aria-hidden="true" /> : <List size={22} aria-hidden="true" />}
      </button>

      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        role="presentation"
      />

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <ChartBar size={22} weight="bold" className="admin-logo-icon" aria-hidden="true" />
            <span className="admin-logo-text">Admin Panel</span>
          </div>
          <div className="admin-user-info">
            <img
              src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Admin')}&background=4150F7&color=fff`}
              alt={user?.name || user?.username || 'Admin'}
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
            <ChartBar className="nav-icon" size={20} aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <Users className="nav-icon" size={20} aria-hidden="true" />
            <span>Người dùng</span>
          </NavLink>
          <NavLink to="/admin/posts" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <Article className="nav-icon" size={20} aria-hidden="true" />
            <span>Bài viết</span>
          </NavLink>
          <NavLink to="/admin/comments" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <ChatCircle className="nav-icon" size={20} aria-hidden="true" />
            <span>Bình luận</span>
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <Warning className="nav-icon" size={20} aria-hidden="true" />
            <span>Báo cáo</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-nav-item admin-theme-row">
            <div className="admin-theme-label">
              <MoonStars className="nav-icon" size={20} aria-hidden="true" />
              <span>Giao diện</span>
            </div>
            <ThemeToggle />
          </div>
          <NavLink to="/" className="admin-nav-item" onClick={closeSidebar}>
            <House className="nav-icon" size={20} aria-hidden="true" />
            <span>Về trang chủ</span>
          </NavLink>
          <button type="button" className="admin-nav-item admin-logout-btn" onClick={handleLogout}>
            <SignOut className="nav-icon" size={20} aria-hidden="true" />
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
