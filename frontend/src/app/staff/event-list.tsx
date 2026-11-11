'use client';

import { useState } from 'react';
import classNames from 'classnames';

import {
  confirmAdminOrder,
  reassignAdminOrder,
  remindAdminOrder,
  type AdminEvent,
} from '@/api/staff';
import useStaffStore from '@/store/useStaffStore';

import styles from './staff.module.scss';

type EventListProps = {
  events: AdminEvent[];
  /** Клік по події: на розкладі відкриває запис у сітці. */
  onSelect?: (orderId: string) => void;
};

const REASON: Record<AdminEvent['type'], string> = {
  unassigned: 'не призначено',
  unconfirmed: 'підтвердити',
  cancelled: 'слот звільнився',
  reminder: 'нагадати',
};

const describe = (event: AdminEvent): string => {
  switch (event.type) {
    case 'unassigned':
      return event.suggestedGroomer
        ? `Запис без майстра. На цей час вільна ${event.suggestedGroomer.name}.`
        : 'Запис без майстра. Вільних на цей час немає.';
    case 'unconfirmed':
      return 'Новий запис, салон його ще не підтвердив.';
    case 'cancelled':
      return 'Клієнт скасував — слот вільний, можна комусь запропонувати.';
    default:
      return 'Візит завтра, нагадування ще не надсилали.';
  }
};

const pad = (n: number) => String(n).padStart(2, '0');

const whenLabel = (iso: string): string => {
  const at = new Date(iso);
  const today = new Date();
  const sameDay =
    at.getFullYear() === today.getFullYear() &&
    at.getMonth() === today.getMonth() &&
    at.getDate() === today.getDate();

  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  if (sameDay) return `сьогодні, ${time}`;

  return `${new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' }).format(at)}, ${time}`;
};

const actionLabel = (event: AdminEvent): string => {
  if (event.action === 'assign') {
    return event.suggestedGroomer ? `Призначити: ${event.suggestedGroomer.name}` : 'Немає вільних';
  }
  return event.action === 'confirm' ? 'Підтвердити' : 'Надіслати нагадування';
};

const EventList = ({ events, onSelect }: EventListProps) => {
  const load = useStaffStore((state) => state.load);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const run = async (event: AdminEvent) => {
    setBusyId(event.id);
    setError('');

    const result =
      event.action === 'assign'
        ? await reassignAdminOrder(event.orderId, event.suggestedGroomer?.id ?? '')
        : event.action === 'confirm'
          ? await confirmAdminOrder(event.orderId)
          : await remindAdminOrder(event.orderId);

    setBusyId('');

    if (!result.ok) {
      setError(result.message);
      return;
    }
    await load(true);
  };

  return (
    <>
      <ul className={styles.attentionList}>
        {events.map((event) => (
          <li key={event.id} className={styles.attentionItem}>
            <button
              type="button"
              className={styles.attentionLink}
              onClick={() => onSelect?.(event.orderId)}
            >
              <span className={styles.attentionHead}>
                <span className={classNames(styles.attentionPill, styles[`pill_${event.type}`])}>
                  {REASON[event.type]}
                </span>
                <span className={styles.attentionTime}>{whenLabel(event.scheduledAt)}</span>
              </span>

              <span className={styles.attentionName}>
                {[event.petName, event.client.name].filter(Boolean).join(' · ') || 'Без імені'}
              </span>
              <span className={styles.attentionText}>{describe(event)}</span>
            </button>

            {event.action && (
              <button
                type="button"
                className={styles.attentionAction}
                disabled={
                  busyId === event.id || (event.action === 'assign' && !event.suggestedGroomer)
                }
                onClick={() => void run(event)}
              >
                {actionLabel(event)}
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className={styles.attentionError} role="alert">
          {error}
        </p>
      )}
    </>
  );
};

export default EventList;
