import { create } from 'zustand';

interface UserState {
  user: null;
  login: () => void;
  setAccessToken: (token: string) => void;
  accessToken: string;
}

const useUserStore = create<UserState>((set) => ({
  user: null,
  setAccessToken: (token: string) =>
    set({
      accessToken: token,
    }),
  login: (userData) =>
    set({
      user: userData,
    }),
}));

export default useUserStore;
