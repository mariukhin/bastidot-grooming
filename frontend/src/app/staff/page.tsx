'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';

import { ErrorState, LoadingState } from '@/components/account-state';
import {
  DayStrip,
  ScheduleGrid,
  type GridColumn,
  type GridEvent,
  type GridTone,
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
import useStaffStore from '@/store/useStaffStore';
import useBookingStore from '@/store/useBookingStore';
import { Icon, IconTypes } from '@/components/icon';

import AdminOrderPanel from './admin-order-panel';
import Attention from './attention';
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

/** Лійка й блокнот: таких іконок у спрайті немає, а вони потрібні лише тут. */
const FilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d="M2.5 4h13l-5 5.5V15l-3-1.5V9.5L2.5 4Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

const WaitlistIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="3.5" y="2.5" width="11" height="13" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path
      d="M6.5 6.5h5M6.5 9.5h5M6.5 12.5h3"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

/** Пілюля картки: «заплановано» розпадається на підтверджений і ні. */
const toneOf = (order: StaffOrder): GridTone => {
  if (order.status === 'cancelled' || order.status === 'no_show') return 'cancelled';
  if (order.status === 'completed') return 'done';
  if (order.status === 'came') return 'came';
  return order.confirmedAt ? 'confirmed' : 'new';
};

const toneLabel = (order: StaffOrder): string | undefined =>
  order.status === 'no_show' ? 'не зʼявився' : undefined;

const dayLabel = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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
  const [filterOpen, setFilterOpen] = useState(false);
  const adminEvents = useStaffStore((state) => state.events);
  const loadEvents = useStaffStore((state) => state.load);
  const openBooking = useBookingStore((state) => state.openBooking);
  const bookingOpen = useBookingStore((state) => state.isOpen);

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
        tone: toneOf(order),
        label: toneLabel(order),
        content: isAdmin ? (
          <>
            <strong className={styles.cardName}>
              {order.client?.name ?? ''}
              {order.pet && ` (${order.pet.name})`}
            </strong>
            <span className={styles.cardLine}>
              {serviceNames(order)}
              {typeof order.total === 'number' && ` · ${order.total} грн`}
            </span>
          </>
        ) : (
          <>
            <strong className={styles.cardName}>
              {order.pet?.name ?? order.ownerName}
              {order.pet?.breedName && ` · ${order.pet.breedName}`}
            </strong>
            <span className={styles.cardLine}>{serviceNames(order)}</span>
            {alarmingTraits(order.pet?.traits).map((trait) => (
              <span key={trait.key} className={styles.cardWarn}>
                {alarmText(trait)}
              </span>
            ))}
          </>
        ),
      })),
    [orders, isAdmin]
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  // Модалка запису живе поза сторінкою, тож про новий запис дізнаємось
  // по її закриттю — і просто перечитуємо день.
  const wasBookingOpen = useRef(false);
  useEffect(() => {
    if (bookingOpen) {
      wasBookingOpen.current = true;
      return;
    }
    if (!wasBookingOpen.current) return;

    wasBookingOpen.current = false;
    setAttempt((n) => n + 1);
  }, [bookingOpen]);

  const shiftDay = useCallback(
    (days: number) => {
      const [y, m, d] = date.split('-').map(Number);
      const next = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days);
      setDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`);
    },
    [date]
  );

  const pickSlot = useCallback(
    (groomerId: string, minutes: number) => {
      const [y, m, d] = date.split('-').map(Number);
      const at = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, Math.floor(minutes / 60), minutes % 60);

      openBooking({ admin: true, groomerId, startAt: at.toISOString(), source: 'button' });
    },
    [date, openBooking]
  );

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
        void loadEvents(true);
      }
    },
    [date, isAdmin, loadEvents]
  );

  const selected = selectedId ? orders.find((order) => order.id === selectedId) : undefined;
  // Бічна колонка існує, лише поки їй є що показати: порожня вона займала б
  // третину ширини ні за що.
  const hasSide = Boolean(selectedId) || (isAdmin && adminEvents.length > 0);

  if (!user) return null;
  if (state === 'loading') return <LoadingState label="Завантажуємо розклад" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;

  return (
    <section>
      <div className={styles.scheduleHead}>
        <h2 className={styles.scheduleTitle}>{scheduleTitle(user.role)}</h2>

        <div className={styles.dayTools}>
          <button
            type="button"
            className={styles.dayArrow}
            onClick={() => shiftDay(-1)}
            aria-label="Попередній день"
          >
            ‹
          </button>

          {/* Інпут лежить поверх кнопки: тап одразу відкриває рідний
              календар, без власного попапа. */}
          <label className={styles.dateButton}>
            {dayLabel(date)}
            <Icon id={IconTypes.chevronDown} width={14} height={14} />
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              onChange={(event) => setDate(event.target.value || todayKey())}
              aria-label="Дата"
            />
          </label>

          <button
            type="button"
            className={styles.dayArrow}
            onClick={() => shiftDay(1)}
            aria-label="Наступний день"
          >
            ›
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                className={classNames(styles.toolIcon, filterOpen && styles.toolIconActive)}
                aria-expanded={filterOpen}
                aria-label="Фільтр"
                onClick={() => setFilterOpen((open) => !open)}
              >
                <FilterIcon />
              </button>
              <button
                type="button"
                className={styles.toolIcon}
                disabled
                aria-label="Лист очікування"
                title="Буде в наступній версії"
              >
                <WaitlistIcon />
              </button>

              <button
                type="button"
                className={classNames(styles.tool, filterOpen && styles.toolActive)}
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((open) => !open)}
              >
                Фільтр{picked.length > 0 && ` · ${picked.length}`}
              </button>
              <button
                type="button"
                className={styles.tool}
                disabled
                title="Буде в наступній версії"
              >
                Лист очікування
              </button>
            </>
          )}
        </div>
      </div>

      {isAdmin && (
        <>
          <div className={styles.viewRow}>
            <ViewSwitch />
            <div className={classNames(styles.filterRow, filterOpen && styles.filterRowOpen)}>
              <GroomerChips groomers={schedule} selected={picked} onChange={setPicked} />
            </div>
          </div>
          <DayKpi stats={stats} />
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
              onPickSlot={isAdmin ? pickSlot : undefined}
              selectedId={selectedId}
              onSelect={(event) => setSelectedId((id) => (id === event.id ? null : event.id))}
            />
            {isAdmin && <StatusLegend />}
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

              {isAdmin && <Attention onSelect={setSelectedId} />}
            </div>
          )}
        </div>
      )}

      <div className={styles.dayStrip}>
        <DayStrip value={date} onChange={setDate} />
      </div>
    </section>
  );
};

export default StaffSchedule;
