import { Button } from '@/components/button';
import Image from 'next/image';
import { Icon, IconTypes } from '@/components/icon';
import styles from './team-block.module.scss';
import groomerPreview from './groomerPreview.png';
import dayjs from 'dayjs';

type TeamBlockProps = {
  onOpenBooking?: () => void;
};

const TeamBlock = ({ onOpenBooking }: TeamBlockProps) => {
  const team = [
    {
      id: 1,
      name: 'Ольга',
      isVip: false,
      nearestDate: new Date(),
      photoSrc: groomerPreview,
    },
    {
      id: 2,
      name: 'Юлія',
      isVip: false,
      nearestDate: new Date(),
      photoSrc: groomerPreview,
    },
  ];

  return (
    <div className={styles.teamContainer}>
      <div className={styles.teamWrapper}>
        <p className={styles.title}>Команда</p>
        <div className={styles.teamBlock}>
          {team.map((item) => (
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
                    {dayjs(item.nearestDate).format('DD MMMM HH:mm')}
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
