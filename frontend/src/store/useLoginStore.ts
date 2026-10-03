import { create } from 'zustand';

interface LoginState {
  isOpen: boolean;
  /** Куди повернути після успішного входу. null — лишитись на місці. */
  redirectTo: string | null;
  openLogin: (redirectTo?: string) => void;
  closeLogin: () => void;
}

/**
 * Модалка входу раніше жила локальним станом у шапці, тож відкрити її ззовні
 * було нічим. Guard на /account має це робити, тож стан переїхав у стор —
 * так само, як це зроблено для модалки запису.
 */
const useLoginStore = create<LoginState>((set) => ({
  isOpen: false,
  redirectTo: null,
  openLogin: (redirectTo) => set({ isOpen: true, redirectTo: redirectTo ?? null }),
  closeLogin: () => set({ isOpen: false, redirectTo: null }),
}));

export default useLoginStore;
