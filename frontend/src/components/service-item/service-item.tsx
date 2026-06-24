'use client';

import { ServiceProps } from '@/utils/function';
import styles from './service-item.module.scss';
import { Icon, IconTypes } from '@/components/icon';

type ServiceItemProps = {
  item: ServiceProps;
  breedName: string;
  onBook?: () => void;
};

const ServiceItem = ({ item, breedName }: ServiceItemProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.firstRow}>
        <p className={styles.title}>
          {item.type} - {breedName}
        </p>
        <Icon id={IconTypes.info} color={'var(--color-gray)'} width={16} height={16} />
      </div>
      <div className={styles.secondRow}>
        <Icon id={IconTypes.money} color={'var(--color-gray)'} width={19} height={13} />
        <p className={styles.groomerText}>
          Грумер - {item.defaultPrice} грн. | VIP Грумер - {item.vipPrice} грн
        </p>
      </div>
      <div className={styles.thirdRow}>
        <Icon id={IconTypes.clock} color={'var(--color-gray)'} width={16} height={16} />
        <p className={styles.groomerText}>
          {item.durationHour ? `${item.durationHour} год` : ''}{' '}
          {item.durationMin ? `${item.durationMin} хв` : ''}
        </p>
      </div>
    </div>
  );
};

export default ServiceItem;
