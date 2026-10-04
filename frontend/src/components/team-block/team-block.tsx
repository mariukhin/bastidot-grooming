'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/button';
import Image from 'next/image';
import { Icon, IconTypes } from '@/components/icon';
import styles from './team-block.module.scss';
import dayjs from 'dayjs';
import useGroomerStore from '@/store/useGroomerStore';
import useBookingStore from '@/store/useBookingStore';
import { GroomerDbProps } from '@/components/booking-modal/types';
import { normalizeGroomerList } from '@/components/booking-modal/utils';
import { useReveal } from '@/hooks/use-reveal';

type TeamBlockProps = {
  groomers: GroomerDbProps[];
};

const TeamBlock = ({ groomers }: TeamBlockProps) => {
  const initialGroomers = useMemo(() => normalizeGroomerList(groomers), [groomers]);
  const groomerList = useGroomerStore((state) => state.groomerList);
  const fetchGroomers = useGroomerStore((state) => state.fetchGroomers);
  const loadNearestSlots = useGroomerStore((state) => state.loadNearestSlots);
  const openBooking = useBookingStore((state) => state.openBooking);
  const revealRef = useReveal<HTMLDivElement>();
  const sectionRef = useRef<HTMLDivElement>(null);

  // Server-rendered list until the store enriches it with the nearest free slot.
  const teamList = groomerList.length > 0 ? groomerList : initialGroomers;

  useEffect(() => {
    fetchGroomers(initialGroomers);
  }, [fetchGroomers, initialGroomers]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadNearestSlots();
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, [loadNearestSlots, teamList.length]);

  return (
    <div className={styles.teamContainer} ref={sectionRef}>
      <div className={styles.teamWrapper}>
        <span className={styles.kicker}>Наша команда</span>
        <h2 className={styles.title}>Команда</h2>
        <p className={styles.subtitle}>Досвідчені майстри, яким можна довірити улюбленця</p>
        <div className={styles.teamRailWrapper}>
          <div className={styles.teamBlock}>
            {teamList.map((item, index) => (
              <div
                className={`${styles.teamItem} reveal`}
                key={item.id}
                ref={revealRef}
                data-d={(index % 4) + 1}
              >
                <div className={styles.teamItemWrapper}>
                  <Image
                    className={styles.teamMemberPhoto}
                    src={item.photoSrc}
                    alt=""
                    width={124}
                    height={124}
                  />
                  <h3 className={styles.teamMemberName}>{item.name}</h3>
                  <div className={styles.teamMemberTitleBlock}>
                    {item.isVip && <span className={styles.teamMemberVipTag}>VIP</span>}
                    <p className={styles.teamMemberPosition}>Грумер</p>
                  </div>
                  <div className={styles.slotChip}>
                    <Icon
                      id={IconTypes.calendarCheck}
                      color={'rgba(255, 255, 255, 0.72)'}
                      width={20}
                      height={20}
                    />
                    <div className={styles.slotChipText}>
                      <span className={styles.slotChipLabel}>Найближчий час:</span>
                      <span className={styles.slotChipValue}>
                        {item.nearestDate ? dayjs(item.nearestDate).format('DD MMMM HH:mm') : '—'}
                      </span>
                    </div>
                  </div>
                  <Button
                    className={styles.teamMemberButton}
                    type={'button'}
                    variant={'onvideo'}
                    text={'Записатися'}
                    onClick={() => openBooking({ groomer: item })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamBlock;
