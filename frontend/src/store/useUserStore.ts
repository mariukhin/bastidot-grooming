import { create } from 'zustand';

interface UserState {
  user: unknown;
  login: (userData: unknown) => void;
  setAccessToken: (token: string) => void;
  accessToken: string;
}

const useUserStore = create<UserState>((set) => ({
  user: null,
  accessToken: '',
  setAccessToken: (token) =>
    set({
      accessToken: token,
    }),
  login: (userData) =>
    set({
      user: userData,
    }),
}));

export default useUserStore;
