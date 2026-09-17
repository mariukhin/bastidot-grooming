import { create } from 'zustand';
import dayjs from 'dayjs';
import { getGroomerList } from '@/api/groomer';
import { getBusySlots } from '@/api/order';
import { findNearestAvailableSlot, normalizeGroomerList } from '@/components/booking-modal/utils';
import { Groomer } from '@/components/booking-modal/types';

const NEAREST_SLOT_DAYS_AHEAD = 14;

interface GroomerState {
  groomerList: Groomer[];
  slotsRequested: boolean;
  fetchGroomers: (seed?: Groomer[]) => Promise<void>;
  loadNearestSlots: () => Promise<void>;
}

const useGroomerStore = create<GroomerState>((set, get) => ({
  groomerList: [],
  slotsRequested: false,

  fetchGroomers: async (seed) => {
    const groomers = seed ?? normalizeGroomerList(await getGroomerList());
    set({ groomerList: groomers });
  },

  loadNearestSlots: async () => {
    const { groomerList, slotsRequested } = get();
    if (slotsRequested || groomerList.length === 0) {
      return;
    }
    set({ slotsRequested: true });

    const now = dayjs();
    const from = now.format('YYYY-MM-DD');
    const to = now.add(NEAREST_SLOT_DAYS_AHEAD, 'day').format('YYYY-MM-DD');

    const withNearestDate = await Promise.all(
      groomerList.map(async (groomer) => {
        const busySlots = await getBusySlots(groomer.id, from, to);
        const nearestDate = findNearestAvailableSlot(
          now,
          Array.isArray(busySlots) ? busySlots : [],
          NEAREST_SLOT_DAYS_AHEAD
        );
        return { ...groomer, nearestDate };
      })
    );

    set({ groomerList: withNearestDate });
  },
}));

export default useGroomerStore;
