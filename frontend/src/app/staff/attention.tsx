'use client';

import useStaffStore from '@/store/useStaffStore';

import EventList from './event-list';
import styles from './staff.module.scss';

/** Той самий список подій, що й на екрані «Події», але збоку від розкладу. */
const Attention = ({ onSelect }: { onSelect: (orderId: string) => void }) => {
  const events = useStaffStore((state) => state.events);

  if (events.length === 0) return null;

  return (
    <section className={styles.attention} aria-label="Потребують уваги">
      <h3 className={styles.attentionTitle}>
        Потребують уваги
        <span className={styles.attentionCount}>{events.length}</span>
      </h3>

      <EventList events={events} onSelect={onSelect} />
    </section>
  );
};

export default Attention;
