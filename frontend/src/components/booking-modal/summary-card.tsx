import { ReactNode } from 'react';
import { Icon, IconTypes } from '@/components/icon';
import { ServiceProps } from '@/utils/function';
import { Groomer } from './types';
import { getGroomerPrice } from './utils';

import styles from './booking-modal.module.scss';

type SummaryCardProps = {
  selectedServices: ServiceProps[];
  selectedGroomer: Groomer | null;
  formattedDateTime: string | null;
  isSummaryExpanded: boolean;
  onToggle: () => void;
  onEditGroomer?: () => void;
  onEditDatetime?: () => void;
  selectedExtraServices?: ServiceProps[];
  children?: ReactNode;
};

const SummaryCard = ({
  selectedServices,
  selectedGroomer,
  formattedDateTime,
  isSummaryExpanded,
  onToggle,
  onEditGroomer,
  onEditDatetime,
  selectedExtraServices = [],
  children,
}: SummaryCardProps) => {
  const extraTotal = selectedExtraServices.reduce((sum, s) => sum + s.defaultPrice, 0);
  const basePrice = selectedGroomer ? getGroomerPrice(selectedGroomer, selectedServices) : null;
  const totalPrice = basePrice !== null ? basePrice + extraTotal : null;

  const serviceNames = [selectedServices[0]?.type, ...selectedExtraServices.map((s) => s.type)]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader} onClick={onToggle} role="button" tabIndex={0}>
        <Icon
          id={isSummaryExpanded ? IconTypes.heart : IconTypes.hamburger}
          color="var(--color-woodsmoke)"
          width={18}
          height={18}
        />
        <p className={styles.summaryText}>{isSummaryExpanded ? serviceNames : 'Деталі'}</p>
        <Icon
          id={isSummaryExpanded ? IconTypes.chevronUp : IconTypes.chevronDown}
          color="var(--color-gray)"
          width={16}
          height={16}
          className={styles.summaryChevron}
        />
      </div>

      {isSummaryExpanded && (
        <>
          {selectedGroomer && (
            <div className={styles.summaryRow}>
              <Icon id={IconTypes.money} color="var(--color-gray)" width={19} height={13} />
              <p className={styles.summaryText}>
                Грумер {selectedGroomer.isVip ? 'VIP' : ''}: {selectedGroomer.name} – {totalPrice}{' '}
                грн
                {extraTotal > 0 && (
                  <span className={styles.extraPriceHint}> (+{extraTotal} грн)</span>
                )}
              </p>
              {onEditGroomer && (
                <button type="button" className={styles.editButton} onClick={onEditGroomer}>
                  <Icon id={IconTypes.edit} width={16} height={16} color="var(--color-gray)" />
                </button>
              )}
            </div>
          )}
          {formattedDateTime && (
            <div className={styles.summaryRow}>
              <Icon id={IconTypes.clock} color="var(--color-gray)" width={16} height={16} />
              <p className={styles.summaryText}>{formattedDateTime}</p>
              {onEditDatetime && (
                <button type="button" className={styles.editButton} onClick={onEditDatetime}>
                  <Icon id={IconTypes.edit} width={16} height={16} color="var(--color-gray)" />
                </button>
              )}
            </div>
          )}
        </>
      )}
      {children}
    </div>
  );
};

export default SummaryCard;
