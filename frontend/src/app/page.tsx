'use client';

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

const Dashboard = () => {
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
            <Button type={'submit'} text={'Записатися'} />
            <Button
              type={'submit'}
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
      <TeamBlock />
      <CoursesBlock />
      <ReviewsBlock />
      <AboutBlock />
    </div>
  );
};

export default Dashboard;
