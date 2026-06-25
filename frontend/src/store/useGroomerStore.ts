import { create } from 'zustand';
import { getGroomerList } from '@/api/groomer';
import { normalizeGroomerList } from '@/components/booking-modal/utils';
import { Groomer } from '@/components/booking-modal/types';

interface GroomerState {
  groomerList: Groomer[];
  fetchGroomers: () => void;
}

const useGroomerStore = create<GroomerState>((set) => ({
  groomerList: [],
  fetchGroomers: async () => {
    const data = await getGroomerList();
    set({ groomerList: normalizeGroomerList(data) });
  },
}));

export default useGroomerStore;
