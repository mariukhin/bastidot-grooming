'use client';

import { useMemo } from 'react';

import useBookingStore from '@/store/useBookingStore';
import BookingModal from './booking-modal';

const BookingModalHost = () => {
  const isOpen = useBookingStore((state) => state.isOpen);
  const closeBooking = useBookingStore((state) => state.closeBooking);

  const groomer = useBookingStore((state) => state.groomer);
  const groomerId = useBookingStore((state) => state.groomerId);
  const service = useBookingStore((state) => state.service);
  const serviceIds = useBookingStore((state) => state.serviceIds);
  const breedId = useBookingStore((state) => state.breedId);
  const breedName = useBookingStore((state) => state.breedName);
  const pet = useBookingStore((state) => state.pet);
  const startStep = useBookingStore((state) => state.startStep);
  const source = useBookingStore((state) => state.source);

  const intent = useMemo(
    () => ({ groomer, groomerId, service, serviceIds, breedId, breedName, pet, startStep, source }),
    [groomer, groomerId, service, serviceIds, breedId, breedName, pet, startStep, source]
  );

  return <BookingModal isOpen={isOpen} onClose={closeBooking} intent={intent} />;
};

export default BookingModalHost;
