'use client';

import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';

import styles from './hero-block.module.scss';

type HeroBlockProps = {
  onOpenBooking: () => void;
};

const HeroBlock = ({ onOpenBooking }: HeroBlockProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const manualPauseRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasErrorRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      hasErrorRef.current = true;
      setHasError(true);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    const sources = video.querySelectorAll('source');
    sources.forEach((source) => source.addEventListener('error', handleError));

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (hasErrorRef.current) return;

        if (entry.isIntersecting) {
          if (!manualPauseRef.current && !reducedMotionQuery.matches) {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { threshold: 0 }
    );
    observer.observe(section);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      sources.forEach((source) => source.removeEventListener('error', handleError));
      observer.disconnect();
    };
  }, []);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      manualPauseRef.current = false;
      video.play().catch(() => {});
    } else {
      manualPauseRef.current = true;
      video.pause();
    }
  };

  return (
    <section className={styles.hero} ref={sectionRef}>
      <video
        className={styles.video}
        ref={videoRef}
        muted
        loop
        playsInline
        poster="/hero-poster.jpg"
      >
        <source media="(max-width: 900px)" src="/hero-mobile.mp4" type="video/mp4" />
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {!hasError && (
        <button
          type={'button'}
          className={styles.videoControl}
          onClick={handleToggle}
          aria-label={isPlaying ? 'Призупинити відео' : 'Відтворити відео'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false">
              <path
                d="M7 5.5v13a1 1 0 0 0 1.53.85l10.6-6.5a1 1 0 0 0 0-1.7l-10.6-6.5A1 1 0 0 0 7 5.5Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>
      )}

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
};

export default HeroBlock;
