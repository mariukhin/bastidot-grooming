import { create } from 'zustand';
import { ServiceProps } from '@/utils/function';
import { Groomer } from '@/components/booking-modal/types';

export type BookingIntent = {
  groomer?: Groomer;
  service?: ServiceProps;
  breedName?: string;
};

interface BookingState extends BookingIntent {
  isOpen: boolean;
  openBooking: (intent?: BookingIntent) => void;
  closeBooking: () => void;
}

const useBookingStore = create<BookingState>((set) => ({
  isOpen: false,
  groomer: undefined,
  service: undefined,
  breedName: undefined,
  openBooking: (intent) =>
    set({
      isOpen: true,
      groomer: intent?.groomer,
      service: intent?.service,
      breedName: intent?.breedName,
    }),
  closeBooking: () => set({ isOpen: false }),
}));

export default useBookingStore;
