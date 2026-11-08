'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErrorState, LoadingState } from '@/components/account-state';
import {
  DayStrip,
  ScheduleGrid,
  type GridColumn,
  type GridEvent,
} from '@/components/schedule-grid';
import {
  fetchAdminDay,
  fetchDaySchedule,
  fetchGroomerDay,
  type DaySchedule,
  type GroomerOrderDetail,
  type StaffOrder,
} from '@/api/staff';
import useUserStore from '@/store/useUserStore';

import { scheduleTitle } from './nav';
import OrderDetails from './order-details';
import { alarmText, alarmingTraits } from './traits';
import styles from './staff.module.scss';

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const serviceNames = (order: StaffOrder): string =>
  (order.services as (string | { name: string })[])
    .map((s) => (typeof s === 'string' ? s : s.name))
    .join(', ');

const StaffSchedule = () => {
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  const [date, setDate] = useState(todayKey);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;

    let stale = false;
    setState('loading');
    setSelectedId(null);

    void Promise.all([
      isAdmin ? fetchAdminDay(date) : fetchGroomerDay(date),
      fetchDaySchedule(date),
    ]).then(([day, sched]) => {
      if (stale) return;
      if (!day.ok) {
        setMessage(day.message);
        setState('error');
        return;
      }
      setOrders(day.data.orders);
      setSchedule(sched.ok ? sched.data.groomers : []);
      setState('ready');
    });

    return () => {
      stale = true;
    };
  }, [date, isAdmin, user, attempt]);

  const columns: GridColumn[] = useMemo(() => {
    if (isAdmin) {
      return schedule.map((g) => ({ id: g.groomerId, title: g.name, intervals: g.intervals }));
    }

    const mine = schedule.find((g) => g.name === user?.name);
    return [
      {
        id: 'me',
        title: user?.name ?? 'Мій день',
        photoUrl: user?.photoUrl || null,
        intervals: mine?.intervals ?? [],
      },
    ];
  }, [isAdmin, schedule, user?.name, user?.photoUrl]);

  const events: GridEvent[] = useMemo(
    () =>
      orders.map((order) => ({
        id: order.id,
        columnId: isAdmin ? (order.groomer?.id ?? '') : 'me',
        scheduledAt: order.scheduledAt,
        durationMinutes: order.durationMinutes,
        status: order.status,
        content: isAdmin ? (
          <>
            <strong>
              {order.client?.name ?? ''}
              {order.pet && ` (${order.pet.name})`}
            </strong>
            <span className={styles.cardLine}>{serviceNames(order)}</span>
            {typeof order.total === 'number' && (
              <span className={styles.cardLine}>{order.total} грн</span>
            )}
          </>
        ) : (
          <>
            <strong>{order.pet?.name ?? order.ownerName}</strong>
            {order.pet?.breedName && <span className={styles.cardLine}>{order.pet.breedName}</span>}
            {alarmingTraits(order.pet?.traits).map((trait) => (
              <span key={trait.key} className={styles.cardWarn}>
                {alarmText(trait)}
              </span>
            ))}
            {order.pet?.wishes && <span className={styles.cardLine}>{order.pet.wishes}</span>}
          </>
        ),
      })),
    [orders, isAdmin]
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  // Статус і нотатку міняє панель деталей — список оновлюємо на місці,
  // щоб не перезавантажувати весь день заради однієї картки.
  const applyUpdate = useCallback((updated: GroomerOrderDetail) => {
    setOrders((list) =>
      list.map((order) =>
        order.id === updated.id
          ? { ...order, status: updated.status, groomerNote: updated.groomerNote }
          : order
      )
    );
  }, []);

  if (!user) return null;
  if (state === 'loading') return <LoadingState label="Завантажуємо розклад" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;

  return (
    <section>
      <div className={styles.scheduleHead}>
        <h2 className={styles.scheduleTitle}>{scheduleTitle(user.role)}</h2>
        <input
          type="date"
          className={styles.datePicker}
          value={date}
          onChange={(event) => setDate(event.target.value || todayKey())}
          aria-label="Дата"
        />
      </div>

      {columns.length === 0 ? (
        <p className={styles.stubText}>На цей день грумерів у розкладі немає.</p>
      ) : (
        <div className={styles.dayLayout}>
          <div className={styles.dayGrid}>
            <ScheduleGrid
              date={date}
              columns={columns}
              events={events}
              showColumnHeads={isAdmin}
              selectedId={selectedId}
              onSelect={(event) => setSelectedId((id) => (id === event.id ? null : event.id))}
            />
          </div>

          {!isAdmin && selectedId && (
            <OrderDetails
              orderId={selectedId}
              onClose={() => setSelectedId(null)}
              onUpdated={applyUpdate}
            />
          )}
        </div>
      )}

      <DayStrip value={date} onChange={setDate} />
    </section>
  );
};

export default StaffSchedule;
