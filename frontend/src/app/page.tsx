'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.scss';
import { Button } from '@/components/button';
import bastiPhoto from './basti.png';
import { ServicesBlock } from '@/components/services-block';
import { PublicationsBlock } from '@/components/publications-block';
import { TeamBlock } from '@/components/team-block';
import { IconTypes } from '@/components/icon';
import { CoursesBlock } from '@/components/courses-block';
import { ReviewsBlock } from '@/components/reviews-block';
import { AboutBlock } from '@/components/about-block';
import { handleScroll } from '@/utils/function';
import { ContactsBlock } from '@/components/contacts-block';
import { BookingModal } from '@/components/booking-modal';

const Dashboard = () => {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.descriptionBlock}>
          <p className={styles.title}>
            Привіт, Я - Басті. <tr />
            Мій салон відкритий до ваших послуг
          </p>
          <p className={styles.subtitle}>
            Ваші особливості, причини обрати вас або опис салону, цінностей і тд
          </p>
          <div className={styles.buttonBlock}>
            <Button type={'button'} text={'Записатися'} onClick={() => setBookingOpen(true)} />
            <Button
              type={'button'}
              text={'Перейти до курсу'}
              variant={'secondary'}
              onClick={() => handleScroll('academy')}
              icon={IconTypes.arrowDown}
            />
          </div>
        </div>
        <div className={styles.photoBlock}>
          <Image className={styles.photo} src={bastiPhoto} alt="basti photo" />
        </div>
      </div>
      <ServicesBlock />
      <PublicationsBlock />
      <TeamBlock onOpenBooking={() => setBookingOpen(true)} />
      <CoursesBlock />
      <ReviewsBlock />
      <AboutBlock onOpenBooking={() => setBookingOpen(true)} />
      <ContactsBlock />

      <BookingModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
};

export default Dashboard;
