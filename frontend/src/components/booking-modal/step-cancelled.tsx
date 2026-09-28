'use client';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { BUSINESS, BUSINESS_ADDRESS, BUSINESS_PHONE_DISPLAY } from '@/utils/site';

import styles from './booking-modal.module.scss';

type StepCancelledProps = {
  formattedDateTimeRange: string | null;
  onBookAgain: () => void;
};

const CancelledIllustration = () => (
  <svg viewBox="0 0 200 200" width="140" height="140" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="62" fill="var(--color-hint-of-red)" />
    <circle cx="100" cy="100" r="38" fill="var(--color-cold-turkey)" />
    <g stroke="white" strokeWidth="5.5" strokeLinecap="round">
      <line x1="88" y1="88" x2="112" y2="112" />
      <line x1="112" y1="88" x2="88" y2="112" />
    </g>
  </svg>
);

const StepCancelled = ({ formattedDateTimeRange, onBookAgain }: StepCancelledProps) => (
  <div className={styles.successContainer}>
    <div className={styles.successIllustration}>
      <CancelledIllustration />
    </div>

    <h2 className={styles.successTitle}>Запис скасовано</h2>
    <p className={styles.successSubtitle}>
      {formattedDateTimeRange
        ? `Візит ${formattedDateTimeRange.toLowerCase()} скасовано. Шкода, чекатимемо наступного разу`
        : 'Шкода, чекатимемо наступного разу'}
    </p>

    <Button text="Записатися знову" size="medium" onClick={onBookAgain} />

    <div className={styles.successContacts}>
      <p className={styles.successContactsTitle}>Передумали? Зателефонуйте</p>
      <div className={styles.successContactRow}>
        <Icon id={IconTypes.phone} width={16} height={16} color="var(--color-gray)" />
        <a className={styles.successContactLink} href={`tel:${BUSINESS.phone}`}>
          {BUSINESS_PHONE_DISPLAY}
        </a>
      </div>
      <div className={styles.successContactRow}>
        <Icon id={IconTypes.point} width={16} height={16} color="var(--color-gray)" />
        <p className={styles.successContactText}>{BUSINESS_ADDRESS}</p>
      </div>
    </div>
  </div>
);

export default StepCancelled;
