'use client';

import { useState } from 'react';
import styles from './page.module.scss';
import { HeroBlock } from '@/components/hero-block';
import { ServicesBlock } from '@/components/services-block';
// import { PublicationsBlock } from '@/components/publications-block';
import { TeamBlock } from '@/components/team-block';
// import { CoursesBlock } from '@/components/courses-block';
import { ReviewsBlock } from '@/components/reviews-block';
import { AboutBlock } from '@/components/about-block';
import { ContactsBlock } from '@/components/contacts-block';
import { BookingModal } from '@/components/booking-modal';
import { Groomer } from '@/components/booking-modal/types';

const Dashboard = () => {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingInitialGroomer, setBookingInitialGroomer] = useState<Groomer | undefined>(
    undefined
  );

  const openBooking = (groomer?: Groomer) => {
    setBookingInitialGroomer(groomer);
    setBookingOpen(true);
  };

  return (
    <div className={styles.wrapper}>
      <HeroBlock onOpenBooking={() => openBooking()} />
      <ServicesBlock />
      {/*<PublicationsBlock />*/}
      <TeamBlock onOpenBooking={(groomer) => openBooking(groomer)} />
      {/*<CoursesBlock />*/}
      <ReviewsBlock />
      <AboutBlock onOpenBooking={() => openBooking()} />
      <ContactsBlock />

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        initialGroomer={bookingInitialGroomer}
      />
    </div>
  );
};

export default Dashboard;
