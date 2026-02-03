import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    google: any;
  }
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, isLoading } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Load Google Identity Services
  React.useEffect(() => {
    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleButton;
      document.body.appendChild(script);
    };

    const initializeGoogleButton = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
          callback: handleGoogleResponse,
          auto_select: false,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', text: 'signin_with', width: '100%' }
        );
      }
    };

    loadGoogleScript();
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(response.credential);
      toast.success('Login successful!');
      navigate('/feed');
    } catch (error: any) {
      toast.error('Google login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6">DATN Social</h1>

        <div className="space-y-4">
          <div id="google-signin-button" className="flex justify-center"></div>
          {isGoogleLoading && <p className="text-center text-gray-500">Signing in with Google...</p>}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Sign in with Google to continue
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
