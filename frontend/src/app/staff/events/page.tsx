'use client';

import { useEffect } from 'react';

import { ErrorState, LoadingState } from '@/components/account-state';
import useStaffStore from '@/store/useStaffStore';

import EventList from '../event-list';
import styles from '../staff.module.scss';

const StaffEvents = () => {
  const { events, loading, loadedAt, message, load } = useStaffStore();

  useEffect(() => {
    void load();
  }, [load]);

  if (loadedAt === 0 && loading) return <LoadingState label="Завантажуємо події" />;
  if (message) return <ErrorState message={message} onRetry={() => void load(true)} />;

  return (
    <section>
      {events.length === 0 ? (
        <p className={styles.stubText}>Нічого не потребує уваги.</p>
      ) : (
        <EventList events={events} />
      )}
    </section>
  );
};

export default StaffEvents;
