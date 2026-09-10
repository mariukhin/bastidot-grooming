'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import Image from 'next/image';
import { Icon, IconTypes } from '@/components/icon';
import styles from './team-block.module.scss';
import dayjs from 'dayjs';
import useGroomerStore from '@/store/useGroomerStore';
import { Groomer } from '@/components/booking-modal/types';
import { useReveal } from '@/hooks/use-reveal';

type TeamBlockProps = {
  onOpenBooking?: (groomer: Groomer) => void;
};

const TeamBlock = ({ onOpenBooking }: TeamBlockProps) => {
  const { groomerList, fetchGroomers } = useGroomerStore();
  const revealRef = useReveal<HTMLDivElement>();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGroomers();
  }, [fetchGroomers]);

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
  }, [groomerList]);

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
        <p className={styles.title}>Команда</p>
        <p className={styles.subtitle}>Досвідчені майстри, яким можна довірити улюбленця</p>
        <div className={styles.teamRailWrapper}>
          <div className={styles.teamBlock} ref={railRef}>
            {groomerList.map((item, index) => (
              <div
                className={styles.teamItem}
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
                  <p className={styles.teamMemberName}>{item.name}</p>
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
                    onClick={() => onOpenBooking?.(item)}
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
