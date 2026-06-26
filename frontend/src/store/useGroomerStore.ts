import { create } from 'zustand';
import dayjs from 'dayjs';
import { getGroomerList } from '@/api/groomer';
import { getBusySlots } from '@/api/order';
import { findNearestAvailableSlot, normalizeGroomerList } from '@/components/booking-modal/utils';
import { Groomer } from '@/components/booking-modal/types';

const NEAREST_SLOT_DAYS_AHEAD = 14;

interface GroomerState {
  groomerList: Groomer[];
  fetchGroomers: () => void;
}

const useGroomerStore = create<GroomerState>((set) => ({
  groomerList: [],
  fetchGroomers: async () => {
    const data = await getGroomerList();
    const groomers = normalizeGroomerList(data);
    set({ groomerList: groomers });

    const now = dayjs();
    const from = now.format('YYYY-MM-DD');
    const to = now.add(NEAREST_SLOT_DAYS_AHEAD, 'day').format('YYYY-MM-DD');

    const groomersWithNearestDate = await Promise.all(
      groomers.map(async (groomer) => {
        const busySlots = await getBusySlots(groomer.id, from, to);
        const nearestDate = findNearestAvailableSlot(
          now,
          Array.isArray(busySlots) ? busySlots : [],
          NEAREST_SLOT_DAYS_AHEAD
        );
        return { ...groomer, nearestDate };
      })
    );

    set({ groomerList: groomersWithNearestDate });
  },
}));

export default useGroomerStore;
