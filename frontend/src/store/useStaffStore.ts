import { create } from 'zustand';

import { fetchAdminEvents, type AdminEvent } from '@/api/staff';

/** Поки список свіжий, повторні запити з інших екранів пропускаємо. */
const FRESH_MS = 15_000;

interface StaffState {
  events: AdminEvent[];
  loading: boolean;
  loadedAt: number;
  message: string;
  load: (force?: boolean) => Promise<void>;
  reset: () => void;
}

const useStaffStore = create<StaffState>()((set, get) => ({
  events: [],
  loading: false,
  loadedAt: 0,
  message: '',

  load: async (force = false) => {
    const { loading, loadedAt } = get();
    if (loading) return;
    if (!force && Date.now() - loadedAt < FRESH_MS) return;

    set({ loading: true });
    const result = await fetchAdminEvents();

    set(
      result.ok
        ? { events: result.data.events, loading: false, loadedAt: Date.now(), message: '' }
        : { loading: false, loadedAt: Date.now(), message: result.message }
    );
  },

  reset: () => set({ events: [], loadedAt: 0, message: '' }),
}));

export default useStaffStore;
