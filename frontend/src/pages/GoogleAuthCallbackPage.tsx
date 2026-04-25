import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { StatePanel } from '../components/common/StatePanel';
import { useAuth } from '../contexts/AuthContext';

const GoogleAuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeRedirectLogin, logout } = useAuth();

  useEffect(() => {
    let isActive = true;

    const completeLogin = async () => {
      const params = new URLSearchParams(location.hash.replace(/^#/, ''));
      const accessToken = params.get('accessToken');
      const refreshToken = params.get('refreshToken');

      if (!accessToken || !refreshToken) {
        toast.error('Khong nhan duoc phien dang nhap Google.');
        navigate('/login', { replace: true });
        return;
      }

      try {
        await completeRedirectLogin(accessToken, refreshToken);
        if (isActive) {
          navigate('/feed', { replace: true });
        }
      } catch {
        logout();
        toast.error('Dang nhap Google that bai.');
        if (isActive) {
          navigate('/login', { replace: true });
        }
      }
    };

    void completeLogin();

    return () => {
      isActive = false;
    };
  }, [completeRedirectLogin, location.hash, logout, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <StatePanel
          title="Dang nhap Google"
          description="He thong dang hoan tat dang nhap va dong bo tai khoan cua ban."
        />
      </div>
    </div>
  );
};

export default GoogleAuthCallbackPage;
