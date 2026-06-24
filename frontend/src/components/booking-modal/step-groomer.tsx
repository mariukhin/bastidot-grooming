import Image from 'next/image';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { ServiceProps } from '@/utils/function';
import { Groomer } from './types';
import { getGroomerPrice } from './utils';

import styles from './booking-modal.module.scss';

type StepGroomerProps = {
  groomers: Groomer[];
  selectedGroomer: Groomer | null;
  selectedServices: ServiceProps[];
  onSelectGroomer: (groomer: Groomer) => void;
  onNext: () => void;
};

const StepGroomer = ({
  groomers,
  selectedGroomer,
  selectedServices,
  onSelectGroomer,
  onNext,
}: StepGroomerProps) => (
  <div className={styles.stepContainer}>
    <h2 className={styles.title}>Оберіть майстра</h2>

    <div className={classNames(styles.section, styles.sectionGrow)}>
      <p className={styles.sectionLabel}>Майстер</p>
      <ul className={styles.groomerList}>
        {groomers.map((groomer) => {
          const isSelected = selectedGroomer?.id === groomer.id;
          const price = getGroomerPrice(groomer, selectedServices);
          return (
            <li
              key={groomer.id}
              className={classNames(styles.groomerItem, {
                [styles.groomerItemSelected]: isSelected,
              })}
              onClick={() => onSelectGroomer(groomer)}
            >
              <span className={classNames(styles.radio, { [styles.radioSelected]: isSelected })} />
              <Image
                className={styles.groomerPhoto}
                src={groomer.photoSrc}
                width={60}
                height={60}
                alt={groomer.name}
              />
              <div className={styles.groomerInfo}>
                <p className={styles.groomerName}>{groomer.name}</p>
                <div className={styles.groomerBadges}>
                  {groomer.isVip && <span className={styles.vipBadge}>VIP</span>}
                  <span className={styles.groomerRole}>Грумер</span>
                </div>
                <div className={styles.groomerTime}>
                  <Icon id={IconTypes.clock} color="var(--color-gray)" width={14} height={14} />
                  <p className={styles.groomerTimeMeta}>Наступний час: {groomer.nextTime}</p>
                </div>
              </div>
              {price !== null && <p className={styles.groomerPrice}>{price} грн</p>}
            </li>
          );
        })}
      </ul>
    </div>

    <div className={styles.groomerFooter}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryHeader}>
          <Icon id={IconTypes.heart} color="var(--color-gray)" width={18} height={18} />
          <p className={styles.summaryText}>{selectedServices[0]?.type}</p>
        </div>
        <Button
          text="Обрати дату та час"
          size="large"
          disabled={!selectedGroomer}
          onClick={onNext}
        />
      </div>
    </div>
  </div>
);

export default StepGroomer;
