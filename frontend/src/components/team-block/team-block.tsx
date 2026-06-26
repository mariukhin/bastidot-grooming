import { Button } from '@/components/button';
import Image from 'next/image';
import { Icon, IconTypes } from '@/components/icon';
import styles from './team-block.module.scss';
import dayjs from 'dayjs';
import useGroomerStore from '@/store/useGroomerStore';
import { useEffect } from 'react';

type TeamBlockProps = {
  onOpenBooking?: () => void;
};

const TeamBlock = ({ onOpenBooking }: TeamBlockProps) => {
  const { groomerList, fetchGroomers } = useGroomerStore();

  useEffect(() => {
    fetchGroomers();
  }, [fetchGroomers]);

  return (
    <div className={styles.teamContainer}>
      <div className={styles.teamWrapper}>
        <p className={styles.title}>Команда</p>
        <div className={styles.teamBlock}>
          {groomerList.map((item) => (
            <div className={styles.teamItem} key={item.id}>
              <div className={styles.teamItemWrapper}>
                <Image
                  className={styles.teamMemberPhoto}
                  src={item.photoSrc}
                  alt="team member preview photo"
                />
                <p className={styles.teamMemberName}>{item.name}</p>
                <div className={styles.teamMemberTitleBlock}>
                  {item.isVip && <span className={styles.teamMemberVipTag}>VIP</span>}
                  <p className={styles.teamMemberPosition}>Грумер</p>
                </div>
                <div className={styles.teamMemberDateBlock}>
                  <Icon
                    id={IconTypes.calendarCheck}
                    color={'var(--color-gray)'}
                    width={20}
                    height={20}
                  />
                  <p className={styles.teamMemberDateText}>Найближчий час:</p>
                  <p className={styles.teamMemberDate}>
                    {item.nearestDate ? dayjs(item.nearestDate).format('DD MMMM HH:mm') : '—'}
                  </p>
                </div>
                <Button
                  className={styles.teamMemberButton}
                  type={'button'}
                  text={'Записатися'}
                  onClick={onOpenBooking}
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
