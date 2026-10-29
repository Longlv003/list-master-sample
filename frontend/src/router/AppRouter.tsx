import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MasterSampleListPage } from '../features/masterSample/MasterSampleListPage';
import { SampleListPage } from '../features/samples/SampleListPage';
import { LoginPage } from '../features/auth/LoginPage';
import { UserListPage } from '../features/users/UserListPage';
import { DeviceListPage } from '../features/devices/DeviceListPage';
import { AuditLogPage } from '../features/audit/AuditLogPage';
import { ProtectedRoute } from './ProtectedRoute';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage';

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Dashboard chính */}
          <Route path="/" element={<DashboardPage />} />

          {/* List Master Sample */}
          <Route path="/master-samples" element={<MasterSampleListPage />} />

          {/* Legacy Sample List */}
          <Route path="/legacy-samples" element={<SampleListPage />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

          {/* Protected routes */}
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredPermission="manage_users">
                <UserListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute requiredPermission="manage_users">
                <DeviceListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <ProtectedRoute requiredPermission="view_audit_logs">
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
