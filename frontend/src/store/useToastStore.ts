import { create } from 'zustand';

export type ToastTone = 'success' | 'error';

interface ToastState {
  message: string | null;
  tone: ToastTone;
  shownAt: number;
  showToast: (message: string, tone?: ToastTone) => void;
  hideToast: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'success',
  shownAt: 0,
  showToast: (message, tone = 'success') => set({ message, tone, shownAt: Date.now() }),
  hideToast: () => set({ message: null }),
}));

export default useToastStore;
