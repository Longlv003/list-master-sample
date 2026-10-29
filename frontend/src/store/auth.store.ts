import { create } from 'zustand';
import { AuthUser } from '../types/auth.types';
import { authApi } from '../services/auth.service';
import { clearQueryCache } from '../services/queryCache';

let authCheckPromise: Promise<void> | null = null;

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  checkAuth: () => Promise<void>;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  canAdd: () => boolean;
  canUpdate: () => boolean;
  canDelete: () => boolean;
  canRestore: () => boolean;
  canManageUsers: () => boolean;
  canViewAudit: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  checkAuth: () => {
    if (authCheckPromise) return authCheckPromise;
    authCheckPromise = (async () => {
      try {
        set({ isLoading: true });
        const res = await authApi.getMe();
        set({ user: res.user, isInitialized: true, isLoading: false });
      } catch {
        set({ user: null, isInitialized: true, isLoading: false });
      }
    })().finally(() => { authCheckPromise = null; });
    return authCheckPromise;
  },

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login(credentials);
      clearQueryCache();
      set({ user: res.user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      clearQueryCache();
      set({ user: null });
    }
  },

  canAdd: () => {
    const user = get().user;
    return !!(user && (user.is_admin || user.permissions.add));
  },

  canUpdate: () => {
    const user = get().user;
    return !!(user && (user.is_admin || user.permissions.update));
  },

  canDelete: () => {
    const user = get().user;
    return !!(user && (user.is_admin || user.permissions.delete));
  },

  canRestore: () => {
    const user = get().user;
    return !!(user && (user.is_admin || user.permissions.restore));
  },

  canManageUsers: () => {
    const user = get().user;
    return !!(user && (user.is_admin || user.permissions.manage_users));
  },

  canViewAudit: () => {
    const user = get().user;
    return !!(user && (user.is_admin || user.permissions.view_audit_logs));
  },
}));
