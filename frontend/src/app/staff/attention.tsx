'use client';

import { useState } from 'react';

import { confirmAdminOrder, type StaffOrder } from '@/api/staff';

import styles from './staff.module.scss';

type AttentionProps = {
  orders: StaffOrder[];
  onSelect: (id: string) => void;
  onUpdated: (order: StaffOrder) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
const time = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Поки що тут лише непідтверджені записи дня: решта подій — зі SCRUM-62. */
export const needsAttention = (orders: StaffOrder[]): StaffOrder[] =>
  orders.filter((order) => order.status !== 'cancelled' && !order.confirmedAt);

const Attention = ({ orders, onSelect, onUpdated }: AttentionProps) => {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const items = needsAttention(orders);

  // Порожній блок нічого не повідомляє — ховаємо його разом із заголовком.
  if (items.length === 0) return null;

  const confirm = async (id: string) => {
    setBusyId(id);
    setError('');

    const result = await confirmAdminOrder(id);
    setBusyId('');

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onUpdated(result.data);
  };

  return (
    <section className={styles.attention} aria-label="Потребують уваги">
      <h3 className={styles.attentionTitle}>
        Потребують уваги
        <span className={styles.attentionCount}>{items.length}</span>
      </h3>

      <ul className={styles.attentionList}>
        {items.map((order) => (
          <li key={order.id} className={styles.attentionItem}>
            <button
              type="button"
              className={styles.attentionLink}
              onClick={() => onSelect(order.id)}
            >
              <span className={styles.attentionTime}>{time(order.scheduledAt)}</span>
              <span className={styles.attentionName}>
                {order.client?.name || 'Без імені'}
                {order.pet && ` (${order.pet.name})`}
              </span>
              <span className={styles.attentionReason}>Не підтверджено</span>
            </button>
            <button
              type="button"
              className={styles.attentionAction}
              disabled={busyId === order.id}
              onClick={() => void confirm(order.id)}
            >
              Підтвердити
            </button>
          </li>
        ))}
      </ul>

      {error && (
        <p className={styles.attentionError} role="alert">
          {error}
        </p>
      )}
    </section>
  );
};

export default Attention;
