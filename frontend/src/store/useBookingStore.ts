import { create } from 'zustand';
import { ServiceProps } from '@/utils/function';
import { BookingStep, Groomer } from '@/components/booking-modal/types';
import { track } from '@/utils/analytics';

export type BookingSource = 'button' | 'service' | 'groomer' | 'pet' | 'repeat';

export type BookingIntent = {
  groomer?: Groomer;
  groomerId?: string;
  service?: ServiceProps;
  serviceIds?: string[];
  breedId?: string;
  breedName?: string;
  pet?: { id?: string; name: string };
  startStep?: BookingStep;
  source?: BookingSource;
};

interface BookingState extends BookingIntent {
  isOpen: boolean;
  openBooking: (intent?: BookingIntent) => void;
  closeBooking: () => void;
}

const EMPTY: BookingIntent = {
  groomer: undefined,
  groomerId: undefined,
  service: undefined,
  serviceIds: undefined,
  breedId: undefined,
  breedName: undefined,
  pet: undefined,
  startStep: undefined,
  source: undefined,
};

function resolveSource(intent?: BookingIntent): BookingSource {
  if (intent?.source) return intent.source;
  if (intent?.groomer) return 'groomer';
  if (intent?.service) return 'service';
  return 'button';
}

const useBookingStore = create<BookingState>((set) => ({
  isOpen: false,
  ...EMPTY,
  openBooking: (intent) => {
    track('booking_open', { source: resolveSource(intent) });
    set({ isOpen: true, ...EMPTY, ...intent });
  },
  closeBooking: () => set({ isOpen: false }),
}));

export default useBookingStore;
