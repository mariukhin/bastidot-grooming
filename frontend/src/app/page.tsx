'use client';

import { useState } from 'react';
import styles from './page.module.scss';
import { HeroBlock } from '@/components/hero-block';
import { ServicesBlock } from '@/components/services-block';
import { PublicationsBlock } from '@/components/publications-block';
import { TeamBlock } from '@/components/team-block';
// import { CoursesBlock } from '@/components/courses-block';
import { ReviewsBlock } from '@/components/reviews-block';
import { AboutBlock } from '@/components/about-block';
import { ContactsBlock } from '@/components/contacts-block';
import { BookingModal } from '@/components/booking-modal';

const Dashboard = () => {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <HeroBlock onOpenBooking={() => setBookingOpen(true)} />
      <ServicesBlock />
      <PublicationsBlock />
      <TeamBlock onOpenBooking={() => setBookingOpen(true)} />
      {/*<CoursesBlock />*/}
      <ReviewsBlock />
      <AboutBlock onOpenBooking={() => setBookingOpen(true)} />
      <ContactsBlock />

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
};

export default Dashboard;
