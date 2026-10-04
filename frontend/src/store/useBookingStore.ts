import { create } from 'zustand';
import { ServiceProps } from '@/utils/function';
import { Groomer } from '@/components/booking-modal/types';
import { track } from '@/utils/analytics';

export type BookingIntent = {
  groomer?: Groomer;
  service?: ServiceProps;
  breedName?: string;
  petName?: string;
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
  petName: undefined,
  openBooking: (intent) => {
    track('booking_open', {
      source: intent?.groomer ? 'groomer' : intent?.service ? 'service' : 'button',
    });
    set({
      isOpen: true,
      groomer: intent?.groomer,
      service: intent?.service,
      breedName: intent?.breedName,
      petName: intent?.petName,
    });
  },
  closeBooking: () => set({ isOpen: false }),
}));

export default useBookingStore;
