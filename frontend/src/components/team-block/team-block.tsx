import { Button } from '@/components/button';
import Image from 'next/image';
import { Icon, IconTypes } from '@/components/icon';
import styles from './team-block.module.scss';
import dayjs from 'dayjs';
import useGroomerStore from '@/store/useGroomerStore';
import { useEffect } from 'react';
import { Groomer } from '@/components/booking-modal/types';

type TeamBlockProps = {
  onOpenBooking?: (groomer: Groomer) => void;
};

const TeamBlock = ({ onOpenBooking }: TeamBlockProps) => {
  const { groomerList, fetchGroomers } = useGroomerStore();

  useEffect(() => {
    fetchGroomers();
  }, [fetchGroomers]);

  return (
    <div className={styles.teamContainer}>
      <div className={styles.teamWrapper}>
        <span className={styles.kicker}>Наша команда</span>
        <p className={styles.title}>Команда</p>
        <p className={styles.subtitle}>Досвідчені майстри, яким можна довірити улюбленця</p>
        <div className={styles.teamBlock}>
          {groomerList.map((item) => (
            <div className={styles.teamItem} key={item.id}>
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
      </div>
    </div>
  );
};

export default TeamBlock;
