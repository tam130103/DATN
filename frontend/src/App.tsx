import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import HashtagPage from './pages/HashtagPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';
import PostDetailPage from './pages/PostDetailPage';
import AdminShell from './components/layout/AdminShell';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPostsPage from './pages/admin/AdminPostsPage';
import AdminCommentsPage from './pages/admin/AdminCommentsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/feed" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <ExplorePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hashtag/:name"
          element={
            <ProtectedRoute>
              <HashtagPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/posts/:postId"
          element={
            <ProtectedRoute>
              <PostDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminShell />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="posts" element={<AdminPostsPage />} />
          <Route path="comments" element={<AdminCommentsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>

        <Route
          path="/:username"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
