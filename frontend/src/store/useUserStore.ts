import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Role = 'client' | 'groomer' | 'admin';

export type SessionUser = {
  name: string;
  email: string;
  photoUrl: string;
  role: Role;
  phoneNumber?: string;
  phoneVerified?: boolean;
};

interface UserState {
  user: SessionUser | null;
  accessToken: string;
  refreshToken: string;
  isReady: boolean;
  login: (user: SessionUser) => void;
  setAccessToken: (token: string) => void;
  setSession: (user: SessionUser | null, accessToken: string, refreshToken: string) => void;
  setReady: () => void;
  mergeUser: (patch: Partial<SessionUser>) => void;
  logout: () => void;
}

// Сесія переживає перезавантаження: без цього вхід «тримався» рівно до F5.
// localStorage може кинути в приватному вікні або при заблокованих даних сайту,
// тож кожен доступ обгорнуто — застосунок має працювати й без сховища.
const safeStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* сесія просто не переживе перезавантаження */
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* нічого не вдієш */
    }
  },
}));

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: '',
      refreshToken: '',
      isReady: false,

      login: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setReady: () => set({ isReady: true }),
      mergeUser: (patch) =>
        set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
      logout: () => set({ user: null, accessToken: '', refreshToken: '' }),
    }),
    {
      name: 'bastidot-session',
      storage: safeStorage,
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
    }
  )
);

export default useUserStore;
