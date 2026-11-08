'use client';

import { useEffect, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { STATUS_LABEL } from '@/components/schedule-grid';
import {
  fetchGroomerOrder,
  saveGroomerNote,
  setGroomerStatus,
  type GroomerOrderDetail,
} from '@/api/staff';

import { alarmText, alarmingTraits, traitLevel } from './traits';
import styles from './order-details.module.scss';

type OrderDetailsProps = {
  orderId: string;
  onClose: () => void;
  onUpdated: (order: GroomerOrderDetail) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

const timeRange = (iso: string, minutes: number): string => {
  const start = new Date(iso);
  const end = new Date(start.getTime() + minutes * 60_000);
  return `${pad(start.getHours())}:${pad(start.getMinutes())} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
};

const dayLabel = (iso: string): string =>
  new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso)
  );

const ageLabel = (months: number | null): string | null => {
  if (months === null) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} міс.`;
  return rest === 0 ? `${years} р.` : `${years} р. ${rest} міс.`;
};

const OrderDetails = ({ orderId, onClose, onUpdated }: OrderDetailsProps) => {
  const [order, setOrder] = useState<GroomerOrderDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    let stale = false;
    setState('loading');
    setActionError('');

    void fetchGroomerOrder(orderId).then((result) => {
      if (stale) return;
      if (!result.ok) {
        setMessage(result.message);
        setState('error');
        return;
      }
      setOrder(result.data);
      setNote(result.data.groomerNote);
      setNoteSaved(false);
      setState('ready');
    });

    return () => {
      stale = true;
    };
  }, [orderId]);

  const apply = (next: GroomerOrderDetail) => {
    setOrder(next);
    setNote(next.groomerNote);
    onUpdated(next);
  };

  const changeStatus = async (status: 'came' | 'completed' | 'no_show') => {
    setBusy(true);
    setActionError('');

    const result = await setGroomerStatus(orderId, status);
    setBusy(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    apply(result.data);
  };

  const storeNote = async () => {
    setBusy(true);
    setActionError('');

    const result = await saveGroomerNote(orderId, note.trim());
    setBusy(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    apply(result.data);
    setNoteSaved(true);
  };

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

      {state === 'loading' && <p className={styles.muted}>Завантажуємо…</p>}

      {state === 'error' && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {state === 'ready' && order && (
        <div className={styles.body}>
          <div className={styles.summary}>
            <p className={styles.time}>{timeRange(order.scheduledAt, order.durationMinutes)}</p>
            <span className={classNames(styles.status, styles[`status_${order.status}`])}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          <h2 className={styles.petName}>{order.pet?.name ?? order.ownerName}</h2>
          <p className={styles.petMeta}>
            {[
              order.pet?.breedName,
              order.pet?.weight ? `${order.pet.weight} кг` : null,
              ageLabel(order.pet?.ageMonths ?? null),
              order.ownerName ? `Власник: ${order.ownerName}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {alarmingTraits(order.pet?.traits).map((trait) => (
            <p key={trait.key} className={styles.alarm}>
              {alarmText(trait)}
            </p>
          ))}

          {order.services.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Послуги</h3>
              <ul className={styles.services}>
                {order.services.map((service) => (
                  <li key={service} className={styles.service}>
                    {service}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(order.pet?.wishes || order.comment) && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Побажання</h3>
              {order.pet?.wishes && <p className={styles.text}>{order.pet.wishes}</p>}
              {order.comment && <p className={styles.text}>{order.comment}</p>}
            </section>
          )}

          {order.pet && order.pet.traits.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Як почувається на грумінгу</h3>
              {order.pet.traits.map((trait) => (
                <div key={trait.key} className={styles.trait}>
                  <div className={styles.traitHead}>
                    <span className={styles.traitLabel}>{trait.label}</span>
                    <span className={styles.traitValue}>{trait.value}/10</span>
                  </div>
                  <span className={styles.traitTrack}>
                    <span
                      className={classNames(
                        styles.traitFill,
                        styles[`traitFill_${traitLevel(trait.value)}`]
                      )}
                      style={{ width: `${trait.value * 10}%` }}
                    />
                  </span>
                  <div className={styles.traitScale}>
                    <span>{trait.minLabel}</span>
                    <span>{trait.maxLabel}</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {order.history.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Минулі візити</h3>
              <ul className={styles.history}>
                {order.history.map((visit) => (
                  <li key={visit.scheduledAt} className={styles.historyItem}>
                    <p className={styles.historyDate}>
                      {dayLabel(visit.scheduledAt)} · {STATUS_LABEL[visit.status]}
                    </p>
                    {visit.comment && <p className={styles.text}>{visit.comment}</p>}
                    {visit.groomerNote && <p className={styles.historyNote}>{visit.groomerNote}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Нотатка для наступного візиту</h3>
            <textarea
              className={styles.note}
              value={note}
              rows={4}
              maxLength={2000}
              placeholder="Що врахувати наступного разу"
              onChange={(event) => {
                setNote(event.target.value);
                setNoteSaved(false);
              }}
            />
            <div className={styles.noteFoot}>
              <Button
                type="button"
                text="Зберегти нотатку"
                variant="secondary"
                size="medium"
                disabled={busy || note.trim() === order.groomerNote}
                onClick={() => void storeNote()}
              />
              {noteSaved && <span className={styles.saved}>Збережено</span>}
            </div>
          </section>

          {actionError && (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          )}

          {(order.status === 'pending' || order.status === 'came') && (
            <div className={styles.actions}>
              {order.status === 'pending' && (
                <>
                  <Button
                    type="button"
                    text="Клієнт прийшов"
                    size="medium"
                    block
                    disabled={busy}
                    onClick={() => void changeStatus('came')}
                  />
                  <Button
                    type="button"
                    text="Не з'явився"
                    variant="secondary"
                    size="medium"
                    block
                    disabled={busy}
                    onClick={() => void changeStatus('no_show')}
                  />
                </>
              )}

              {order.status === 'came' && (
                <Button
                  type="button"
                  text="Завершити"
                  size="medium"
                  block
                  disabled={busy}
                  onClick={() => void changeStatus('completed')}
                />
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default OrderDetails;
