'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const openBooking = useBookingStore((state) => state.openBooking);
  const revealRef = useReveal<HTMLDivElement>();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  // Server-rendered list until the store enriches it with the nearest free slot.
  const teamList = groomerList.length > 0 ? groomerList : initialGroomers;

  useEffect(() => {
    fetchGroomers(initialGroomers);
  }, [fetchGroomers, initialGroomers]);

  const updateEdges = () => {
    const rail = railRef.current;
    if (!rail) return;

    setAtStart(rail.scrollLeft <= 0);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
  };

  useEffect(() => {
    updateEdges();

    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [teamList]);

  const scrollByCard = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;

    const card = rail.firstElementChild as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * amount, behavior: 'instant' });
    updateEdges();
  };

  return (
    <div className={styles.teamContainer}>
      <div className={styles.teamWrapper}>
        <span className={styles.kicker}>Наша команда</span>
        <h2 className={styles.title}>Команда</h2>
        <p className={styles.subtitle}>Досвідчені майстри, яким можна довірити улюбленця</p>
        <div className={styles.teamRailWrapper}>
          <div className={styles.teamBlock} ref={railRef}>
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
                    alt="team member preview photo"
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

          <div className={styles.railNav}>
            <button
              type={'button'}
              className={styles.railNavButton}
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-label={'Попередні майстри'}
            >
              <Icon id={IconTypes.chevronLeft} width={18} height={18} />
            </button>
            <button
              type={'button'}
              className={styles.railNavButton}
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-label={'Наступні майстри'}
            >
              <Icon id={IconTypes.chevroneRight} width={18} height={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamBlock;
