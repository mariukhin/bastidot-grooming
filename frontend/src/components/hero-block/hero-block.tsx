import classNames from 'classnames';

import { Button } from '@/components/button';

import styles from './hero-block.module.scss';

type HeroBlockProps = {
  onOpenBooking: () => void;
};

const HeroBlock = ({ onOpenBooking }: HeroBlockProps) => (
  <section className={styles.hero}>
    <video className={styles.video} autoPlay muted loop playsInline poster="/hero-poster.jpg">
      <source media="(max-width: 900px)" src="/hero-mobile.mp4" type="video/mp4" />
      <source src="/hero.mp4" type="video/mp4" />
    </video>

    <div className={styles.scrim} />

    <div className={classNames('shell', styles.inner)}>
      <div className={styles.top}>
        <h1 className={styles.title}>
          Привіт, Я - Басті.
          <br />
          Мій салон відкритий до ваших послуг
        </h1>
        <p className={styles.subtitle}>
          Ваші особливості, причини обрати вас або опис салону, цінностей і тд
        </p>
        <div className={styles.ctaRow}>
          <Button text={'Записатися онлайн'} size={'large'} onClick={onOpenBooking} />
          <Button
            text={'Обрати послугу'}
            size={'large'}
            variant={'onvideo'}
            onClick={onOpenBooking}
          />
        </div>
      </div>
    </div>
  </section>
);

export default HeroBlock;
