import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '../../services/api.client';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận chưa khớp'); return; }
    setSaving(true); setError('');
    try {
      await request('/api/v1/auth/change-password', {method: 'POST', body: JSON.stringify({currentPassword, newPassword})});
      await useAuthStore.getState().checkAuth(); navigate('/');
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đổi mật khẩu'); }
    finally { setSaving(false); }
  };
  return <div className="container" style={{maxWidth: 520}}><h1>Đổi mật khẩu</h1>
    <p>Đặt mật khẩu riêng trước khi dùng các chức năng quản trị.</p>
    <form onSubmit={submit} style={{display: 'grid', gap: 16, marginTop: 20}}>
      <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrent(event.target.value)} />
      <Input label="Mật khẩu mới (ít nhất 8 ký tự)" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNew(event.target.value)} />
      <Input label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" required value={confirmPassword} onChange={event => setConfirm(event.target.value)} />
      {error && <p role="alert">{error}</p>}<Button type="submit" isLoading={saving}>Lưu mật khẩu</Button>
    </form></div>;
};
