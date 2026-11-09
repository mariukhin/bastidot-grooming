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
  fetchAdminStats,
  fetchDaySchedule,
  fetchGroomerDay,
  type AdminStats,
  type DaySchedule,
  type GroomerOrderDetail,
  type StaffOrder,
} from '@/api/staff';
import useUserStore from '@/store/useUserStore';

import AdminOrderPanel from './admin-order-panel';
import Attention, { needsAttention } from './attention';
import { DayKpi, GroomerChips, StatusLegend, ViewSwitch } from './admin-toolbar';
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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
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
      isAdmin ? fetchAdminStats(date) : Promise.resolve(null),
    ]).then(([day, sched, dayStats]) => {
      if (stale) return;
      if (!day.ok) {
        setMessage(day.message);
        setState('error');
        return;
      }
      setOrders(day.data.orders);
      setSchedule(sched.ok ? sched.data.groomers : []);
      setStats(dayStats && dayStats.ok ? dayStats.data : null);
      setState('ready');
    });

    return () => {
      stale = true;
    };
  }, [date, isAdmin, user, attempt]);

  // Чипи звужують видимі колонки; порожній вибір означає «всі грумери».
  const visibleGroomers = useMemo(
    () => (picked.length === 0 ? schedule : schedule.filter((g) => picked.includes(g.groomerId))),
    [schedule, picked]
  );

  const columns: GridColumn[] = useMemo(() => {
    if (isAdmin) {
      return visibleGroomers.map((g) => ({
        id: g.groomerId,
        title: g.name,
        intervals: g.intervals,
      }));
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
  }, [isAdmin, visibleGroomers, schedule, user?.name, user?.photoUrl]);

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
            {!order.confirmedAt && order.status !== 'cancelled' && (
              <span className={styles.cardWarn}>Не підтверджено</span>
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

  // Дії панелі міняють один запис — список правимо на місці, а KPI
  // перепитуємо, бо виручка й завантаженість залежать від усього дня.
  const applyOrder = useCallback(
    (updated: StaffOrder | GroomerOrderDetail) => {
      setOrders((list) =>
        list.map((order) =>
          order.id === updated.id ? ({ ...order, ...updated } as StaffOrder) : order
        )
      );

      if (isAdmin) {
        void fetchAdminStats(date).then((result) => {
          if (result.ok) setStats(result.data);
        });
      }
    },
    [date, isAdmin]
  );

  const selected = selectedId ? orders.find((order) => order.id === selectedId) : undefined;
  // Бічна колонка існує, лише поки їй є що показати: порожня вона займала б
  // третину ширини ні за що.
  const hasSide = Boolean(selectedId) || (isAdmin && needsAttention(orders).length > 0);

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

      {isAdmin && (
        <>
          <ViewSwitch />
          <DayKpi stats={stats} />
          <GroomerChips groomers={schedule} selected={picked} onChange={setPicked} />
          <StatusLegend />
        </>
      )}

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

          {hasSide && (
            <div className={styles.daySide}>
              {!isAdmin && selectedId && (
                <OrderDetails
                  orderId={selectedId}
                  onClose={() => setSelectedId(null)}
                  onUpdated={applyOrder}
                />
              )}

              {isAdmin && selected && (
                <AdminOrderPanel
                  order={selected}
                  groomers={schedule}
                  onClose={() => setSelectedId(null)}
                  onUpdated={applyOrder}
                />
              )}

              {isAdmin && (
                <Attention orders={orders} onSelect={setSelectedId} onUpdated={applyOrder} />
              )}
            </div>
          )}
        </div>
      )}

      <DayStrip value={date} onChange={setDate} />
    </section>
  );
};

export default StaffSchedule;
