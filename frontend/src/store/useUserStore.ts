import { create } from 'zustand';

interface UserState {
  user: null;
  login: () => void;
}

const useUserStore = create<UserState>((set) => ({
  user: null,
  login: (userData) =>
    set({
      user: userData,
    }),
}));

export default useUserStore;
