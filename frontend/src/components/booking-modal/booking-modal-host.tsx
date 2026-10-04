'use client';

import useBookingStore from '@/store/useBookingStore';
import BookingModal from './booking-modal';

const BookingModalHost = () => {
  const isOpen = useBookingStore((state) => state.isOpen);
  const groomer = useBookingStore((state) => state.groomer);
  const service = useBookingStore((state) => state.service);
  const breedName = useBookingStore((state) => state.breedName);
  const petName = useBookingStore((state) => state.petName);
  const closeBooking = useBookingStore((state) => state.closeBooking);

  return (
    <BookingModal
      isOpen={isOpen}
      onClose={closeBooking}
      initialGroomer={groomer}
      initialService={service}
      initialBreed={breedName}
      initialPetName={petName}
    />
  );
};

export default BookingModalHost;
