import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { StatePanel } from './components/common/StatePanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const GoogleAuthCallbackPage = React.lazy(() => import('./pages/GoogleAuthCallbackPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const FeedPage = React.lazy(() => import('./pages/FeedPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ExplorePage = React.lazy(() => import('./pages/ExplorePage'));
const HashtagPage = React.lazy(() => import('./pages/HashtagPage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const PostDetailPage = React.lazy(() => import('./pages/PostDetailPage'));
const AdminShell = React.lazy(() => import('./components/layout/AdminShell'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = React.lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminPostsPage = React.lazy(() => import('./pages/admin/AdminPostsPage'));
const AdminCommentsPage = React.lazy(() => import('./pages/admin/AdminCommentsPage'));
const AdminReportsPage = React.lazy(() => import('./pages/admin/AdminReportsPage'));

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/feed" replace />;
  return <>{children}</>;
};

const RouteLoader: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-md">
      <StatePanel
        title="Dang tai"
        description="Dang chuan bi trang va dong bo du lieu."
      />
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
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
      </Suspense>
    </AuthProvider>
  );
}

export default App;
