'use client';

import { useEffect, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { STATUS_LABEL } from '@/components/schedule-grid';
import {
  cancelAdminOrder,
  confirmAdminOrder,
  reassignAdminOrder,
  rescheduleAdminOrder,
  type DaySchedule,
  type StaffOrder,
} from '@/api/staff';

import styles from './order-details.module.scss';

type AdminOrderPanelProps = {
  order: StaffOrder;
  groomers: DaySchedule[];
  onClose: () => void;
  onUpdated: (order: StaffOrder) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

const timeRange = (iso: string, minutes: number): string => {
  const start = new Date(iso);
  const end = new Date(start.getTime() + minutes * 60_000);
  return `${pad(start.getHours())}:${pad(start.getMinutes())} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
};

/** datetime-local розуміє лише локальний час без зони. */
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const serviceList = (order: StaffOrder): { key: string; label: string }[] =>
  (order.services as (string | { id: string; name: string; price: number })[]).map((service) =>
    typeof service === 'string'
      ? { key: service, label: service }
      : { key: service.id, label: `${service.name} — ${service.price} грн` }
  );

const AdminOrderPanel = ({ order, groomers, onClose, onUpdated }: AdminOrderPanelProps) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [when, setWhen] = useState(() => toLocalInput(order.scheduledAt));
  // Скасування летить клієнту сповіщенням, тож кнопка просить підтвердження.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setWhen(toLocalInput(order.scheduledAt));
    setError('');
  }, [order.id, order.scheduledAt]);

  const run = async (
    action: () => Promise<{ ok: true; data: StaffOrder } | { ok: false; message: string }>
  ) => {
    setBusy(true);
    setError('');

    const result = await action();
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onUpdated(result.data);
  };

  const isCancelled = order.status === 'cancelled';

  return (
    <aside className={styles.panel} aria-label="Деталі запису">
      <header className={styles.head}>
        <button type="button" className={styles.back} onClick={onClose}>
          ‹ Розклад
        </button>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрити">
          ×
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.summary}>
          <p className={styles.time}>{timeRange(order.scheduledAt, order.durationMinutes)}</p>
          <span className={classNames(styles.status, styles[`status_${order.status}`])}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>

        <h2 className={styles.petName}>{order.client?.name || 'Без імені'}</h2>
        <p className={styles.petMeta}>
          {[order.pet?.name, order.pet?.breedName].filter(Boolean).join(' · ')}
        </p>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Телефон</dt>
            <dd>
              {order.client?.phone ? (
                <a className={styles.phone} href={`tel:${order.client.phone}`}>
                  {order.client.phone}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Вартість</dt>
            <dd>{typeof order.total === 'number' ? `${order.total} грн` : '—'}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Джерело</dt>
            <dd>{order.source || '—'}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Підтверджено</dt>
            <dd>{order.confirmedAt ? 'так' : 'ні'}</dd>
          </div>
        </dl>

        {serviceList(order).length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Послуги</h3>
            <ul className={styles.services}>
              {serviceList(order).map((service) => (
                <li key={service.key} className={styles.service}>
                  {service.label}
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.comment && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Коментар клієнта</h3>
            <p className={styles.text}>{order.comment}</p>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Грумер</h3>
          <select
            className={styles.select}
            value={order.groomer?.id ?? ''}
            disabled={busy || isCancelled}
            onChange={(event) => void run(() => reassignAdminOrder(order.id, event.target.value))}
            aria-label="Грумер"
          >
            {!order.groomer && <option value="">Оберіть грумера</option>}
            {groomers.map((groomer) => (
              <option key={groomer.groomerId} value={groomer.groomerId}>
                {groomer.name}
              </option>
            ))}
          </select>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Перенести</h3>
          <div className={styles.rescheduleRow}>
            <input
              type="datetime-local"
              className={styles.select}
              value={when}
              disabled={busy || isCancelled}
              onChange={(event) => setWhen(event.target.value)}
              aria-label="Новий час"
            />
            <Button
              type="button"
              text="Перенести"
              variant="secondary"
              size="medium"
              disabled={busy || isCancelled || when === toLocalInput(order.scheduledAt)}
              onClick={() =>
                void run(() => rescheduleAdminOrder(order.id, new Date(when).toISOString()))
              }
            />
          </div>
        </section>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {!isCancelled && (
          <div className={styles.actions}>
            {!order.confirmedAt && (
              <Button
                type="button"
                text="Підтвердити"
                size="medium"
                block
                disabled={busy}
                onClick={() => void run(() => confirmAdminOrder(order.id))}
              />
            )}
            <Button
              type="button"
              text={armed ? 'Так, скасувати запис' : 'Скасувати запис'}
              variant="secondary"
              size="medium"
              block
              disabled={busy}
              onClick={() => {
                if (!armed) {
                  setArmed(true);
                  return;
                }
                void run(() => cancelAdminOrder(order.id));
              }}
            />
            {armed && <p className={styles.hint}>Клієнт отримає сповіщення про скасування.</p>}
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminOrderPanel;
