import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    // Prevent duplicate toast if same message already exists in queue
    const currentToasts = get().toasts;
    const isDuplicate = currentToasts.some(
      (t) => t.message === toast.message && t.type === toast.type
    );
    if (isDuplicate) return;

    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, ...toast };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration ?? 3500;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));
