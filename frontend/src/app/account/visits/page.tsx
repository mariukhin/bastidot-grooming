'use client';

import { fetchAccountVisits, type AccountVisit, type VisitStatus } from '@/api/account';
import { BookingCta, EmptyState, ErrorState, LoadingState } from '@/components/account-state';
import { useAccountData } from '../use-account-data';

import styles from '../account.module.scss';

const STATUS_LABEL: Record<VisitStatus, string> = {
  pending: 'Заплановано',
  completed: 'Відбувся',
  cancelled: 'Скасовано',
  no_show: 'Не відбувся',
};

const formatWhen = (iso: string): string =>
  new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const VisitsTab = () => {
  const { state, data, message, reload } = useAccountData(fetchAccountVisits);

  if (state === 'loading') return <LoadingState label="Завантажуємо візити" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;

  if (data.length === 0) {
    return (
      <EmptyState
        title="Ще не було візитів"
        text="Тут зʼявиться історія: дата, послуги, грумер і сума за кожен візит."
        action={<BookingCta />}
      />
    );
  }

  return (
    <ul className={styles.cards}>
      {data.map((visit: AccountVisit) => (
        <li key={visit.id} className={styles.card}>
          <div className={styles.cardBody}>
            <p className={styles.cardTitle}>{formatWhen(visit.scheduledAt)}</p>
            {visit.serviceNames.length > 0 && (
              <p className={styles.cardSub}>{visit.serviceNames.join(', ')}</p>
            )}
            {visit.groomerName && <p className={styles.cardNote}>Грумер: {visit.groomerName}</p>}
          </div>
          <div className={styles.cardAside}>
            <span className={styles[`status_${visit.status}`]}>{STATUS_LABEL[visit.status]}</span>
            {visit.price !== null && <p className={styles.cardPrice}>{visit.price} грн</p>}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default VisitsTab;
