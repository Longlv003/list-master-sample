import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ToastContainer } from '../ui/ToastContainer';
import { useAuthStore } from '../../store/auth.store';
import { useSocket } from '../../hooks/useSocket';
import { Link } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const { checkAuth, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Connect Socket.IO
  useSocket();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      {user?.must_change_password && <div className="container"><Link to="/change-password">Vui lòng đổi mật khẩu để sử dụng các chức năng quản trị</Link></div>}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
};
