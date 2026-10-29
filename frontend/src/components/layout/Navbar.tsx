import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../ui/Button';
import {
  Layers,
  Users,
  Tablet,
  FileSpreadsheet,
  History,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, canManageUsers, canViewAudit } = useAuthStore();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navLinkStyle = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: active ? 700 : 500,
    color: active ? '#ffffff' : 'var(--text-secondary)',
    backgroundColor: active ? 'var(--primary)' : 'transparent',
    transition: 'var(--transition)',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingTop: '0.75rem',
          paddingBottom: '0.75rem',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              ListMaster
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              QUẢN LÝ MẪU THỬ LAN
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          <Link to="/" style={navLinkStyle(isActive('/'))}>
            <Layers size={17} />
            Dashboard
          </Link>

          <Link to="/master-samples" style={navLinkStyle(isActive('/master-samples'))}>
            <FileSpreadsheet size={17} />
            List Master Sample
          </Link>

          {canManageUsers() && (
            <Link to="/users" style={navLinkStyle(isActive('/users'))}>
              <Users size={17} />
              Quản lý tài khoản
            </Link>
          )}

          {canManageUsers() && (
            <Link to="/devices" style={navLinkStyle(isActive('/devices'))}>
              <Tablet size={17} />
              Thiết bị
            </Link>
          )}



          {canViewAudit() && (
            <Link to="/audit" style={navLinkStyle(isActive('/audit'))}>
              <History size={17} />
              Audit Log
            </Link>
          )}
        </nav>

        {/* User Info / Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user.display_name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                  {user.is_admin ? (
                    <span style={{ color: '#a855f7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <ShieldCheck size={12} /> Admin
                    </span>
                  ) : (
                    'Nhân viên'
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                style={{ padding: '0.4rem 0.65rem' }}
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </Button>
            </div>
          ) : (
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm" icon={<LogIn size={16} />}>
                Đăng nhập
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
