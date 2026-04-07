import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { StatePanel } from '../common/StatePanel';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <StatePanel
            title="Đang tải"
            description="Đang xác thực thông tin và đồng bộ trạng thái."
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
