'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { ErrorState, LoadingState } from '@/components/account-state';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import useToastStore from '@/store/useToastStore';
import {
  EXCEPTION_LABEL,
  addScheduleException,
  fetchAdminDay,
  fetchDaySchedule,
  fetchGroomerSchedule,
  removeScheduleException,
  saveWeeklySchedule,
  setGroomerOnlineBooking,
  type ExceptionInput,
  type GroomerScheduleDetail,
  type ScheduleException,
} from '@/api/staff';

import { applyDayChoice } from './actions';
import { DaySheet, RangeSheet, type DayChoice } from './sheets';
import WeekEditor from './week-editor';
import {
  formatDate,
  fromWeekRows,
  monthStats,
  ordersWord,
  resolveDay,
  rowError,
  shortTime,
  toDateString,
  toWeekRows,
  weekdayOf,
  WEEKDAY_SHORT,
  type DayInfo,
  type DayKind,
  type WeekRow,
} from './utils';
import styles from './admin-schedule.module.scss';

const KIND_LABEL: Record<DayKind, string> = {
  work: 'Робочий',
  custom: 'Інші години',
  vacation: 'Відпустка / лікарняний',
  off: 'Вихідний',
};

const monthTitle = (year: number, month: number) => {
  const title = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1)
  );
  return title.charAt(0).toUpperCase() + title.slice(1).replace(' р.', '');
};

/** Текст клітинки: «10 / 20», «відп», «лік»; вихідний — порожньо. */
const cellText = (day: DayInfo): string => {
  if (day.exception?.type === 'sick') return 'лік';
  if (day.kind === 'vacation') return 'відп';
  if (day.intervals.length === 0) return '';
  return `${shortTime(day.intervals[0]!.from)} / ${shortTime(day.intervals.at(-1)!.to)}`;
};

/**
 * Години стовпчиком («10» над «20»): у рядку «10 / 20» місяць на 31 день
 * не вміщається в ширину екрана разом із підсумками.
 */
const CellContent = ({ day }: { day: DayInfo }) => {
  if (day.kind === 'vacation' || day.intervals.length === 0) return <>{cellText(day)}</>;
  return (
    <span className={styles.hours} aria-hidden="true">
      <span>{shortTime(day.intervals[0]!.from)}</span>
      <span>{shortTime(day.intervals.at(-1)!.to)}</span>
    </span>
  );
};

const exceptionWhen = (e: ScheduleException): string => {
  const dates =
    e.dateFrom === e.dateTo
      ? formatDate(e.dateFrom)
      : `${formatDate(e.dateFrom)} – ${formatDate(e.dateTo)}`;
  return e.type === 'custom_hours' && e.from && e.to ? `${dates}, ${e.from}–${e.to}` : dates;
};

/**
 * Графік усіх грумерів для адміна на десктопі: таблиця місяця, під нею —
 * типовий тиждень і відсутності вибраного грумера.
 */
const AdminSchedule = () => {
  const showToast = useToastStore((state) => state.showToast);
  const { confirm, modal } = useConfirmModal();
  const today = useMemo(() => toDateString(new Date()), []);

  const [schedules, setSchedules] = useState<GroomerScheduleDetail[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [rows, setRows] = useState<WeekRow[]>([]);
  const [online, setOnline] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const [daySheet, setDaySheet] = useState<{ groomerId: string; day: DayInfo } | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);

  // Усі грумери й їхні графіки разом: таблиця показує всіх одночасно.
  useEffect(() => {
    let stale = false;

    void (async () => {
      const list = await fetchDaySchedule(today);
      if (stale) return;
      if (!list.ok) {
        setMessage(list.message);
        setState('error');
        return;
      }

      const results = await Promise.all(
        list.data.groomers.map((g) => fetchGroomerSchedule(g.groomerId))
      );
      if (stale) return;

      const failed = results.find((r) => !r.ok);
      if (failed && !failed.ok) {
        setMessage(failed.message);
        setState('error');
        return;
      }

      const loaded = results.flatMap((r) => (r.ok ? [r.data] : []));
      setSchedules(loaded);
      setSelectedId((current) =>
        loaded.some((s) => s.groomerId === current) ? current : (loaded[0]?.groomerId ?? '')
      );
      setState('ready');
    })();

    return () => {
      stale = true;
    };
  }, [today, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const selected = schedules.find((s) => s.groomerId === selectedId) ?? null;

  // Редактор тижня показує те, що буде діяти: новий шаблон, якщо його вже збережено.
  useEffect(() => {
    if (!selected) return;
    setRows(toWeekRows(selected.pendingWeekly?.weekly ?? selected.weekly));
    setOnline(selected.onlineBooking);
    setDirty(false);
  }, [selected]);

  const dates = useMemo(() => {
    const count = new Date(cursor.year, cursor.month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) =>
      toDateString(new Date(cursor.year, cursor.month, i + 1))
    );
  }, [cursor]);

  const table = useMemo(
    () =>
      schedules.map((s) => {
        const days = dates.map((d) => resolveDay(s.weekly, s.exceptions, d, s.pendingWeekly));
        return { schedule: s, days, stats: monthStats(days) };
      }),
    [schedules, dates]
  );

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const report = (affected: number, prefix = 'Збережено') =>
    showToast(
      affected === 0
        ? prefix
        : `${prefix}. ${ordersWord(affected)} поза графіком — перенесіть їх у «Подіях».`
    );

  const openDay = (groomerId: string, day: DayInfo) => {
    setSelectedId(groomerId);
    setDaySheet({ groomerId, day });
    setOrdersCount(null);
    void fetchAdminDay(day.date, groomerId).then((result) =>
      setOrdersCount(
        result.ok ? result.data.orders.filter((o) => o.status === 'pending').length : 0
      )
    );
  };

  const saveDay = async (choice: DayChoice, hours: { from: string; to: string }) => {
    if (!daySheet) return;
    setBusy(true);
    const result = await applyDayChoice(daySheet.groomerId, daySheet.day, choice, hours);
    setBusy(false);
    setDaySheet(null);
    if (!result.ok) showToast(result.message, 'error');
    else report(result.affected);
    reload();
  };

  const removeException = async (groomerId: string, exception: ScheduleException) => {
    const ok = await confirm({
      title: 'Прибрати виняток?',
      text: `${EXCEPTION_LABEL[exception.type]} ${exceptionWhen(exception)} — день знову буде за типовим графіком.`,
      confirmButtonText: 'Прибрати',
      cancelButtonText: 'Залишити',
    });
    if (!ok) return;

    setBusy(true);
    const result = await removeScheduleException(groomerId, exception.id);
    setBusy(false);
    setDaySheet(null);
    if (!result.ok) showToast(result.message, 'error');
    else report(result.data.affectedOrders, 'Виняток прибрано');
    reload();
  };

  const saveRange = async (input: ExceptionInput) => {
    if (!selected) return;
    setBusy(true);
    const result = await addScheduleException(selected.groomerId, input);
    setBusy(false);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    setRangeOpen(false);
    report(result.data.affectedOrders);
    reload();
  };

  const weekValid = rows.every((r) => !rowError(r)) && rows.some((r) => r.enabled);

  const saveSchedule = async () => {
    if (!selected) return;
    setBusy(true);

    let toast = '';
    if (online !== selected.onlineBooking) {
      const result = await setGroomerOnlineBooking(selected.groomerId, online);
      if (!result.ok) {
        setBusy(false);
        showToast(result.message, 'error');
        return;
      }
      toast = online ? 'Онлайн-запис увімкнено' : 'Онлайн-запис вимкнено';
    }

    const weekly = fromWeekRows(rows);
    const current = fromWeekRows(toWeekRows(selected.pendingWeekly?.weekly ?? selected.weekly));
    if (JSON.stringify(weekly) !== JSON.stringify(current)) {
      const result = await saveWeeklySchedule(selected.groomerId, weekly);
      if (!result.ok) {
        setBusy(false);
        showToast(result.message, 'error');
        return;
      }
      const affected = result.data.affectedOrders;
      toast = `Графік діє з ${formatDate(result.data.effectiveFrom)}${
        affected > 0 ? `. ${ordersWord(affected)} поза графіком — перенесіть їх у «Подіях»` : ''
      }`;
    }

    setBusy(false);
    showToast(toast || 'Змін немає');
    reload();
  };

  if (state === 'loading') return <LoadingState label="Завантажуємо графік" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;
  if (schedules.length === 0) return <p className={styles.empty}>У салоні ще немає грумерів.</p>;

  const absences = (selected?.exceptions ?? []).filter((e) => e.dateTo >= today);

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <h2 className={styles.title}>Графік роботи</h2>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => shiftMonth(-1)}
            aria-label="Попередній місяць"
          >
            <Icon id={IconTypes.chevronLeft} width={18} height={18} />
          </button>
          <span className={styles.monthTitle}>{monthTitle(cursor.year, cursor.month)}</span>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => shiftMonth(1)}
            aria-label="Наступний місяць"
          >
            <Icon id={IconTypes.chevroneRight} width={18} height={18} />
          </button>
        </div>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={classNames(styles.nameCol, styles.headCell)} scope="col">
                Грумер
              </th>
              {dates.map((date) => {
                const weekday = weekdayOf(date);
                return (
                  <th
                    key={date}
                    scope="col"
                    className={classNames(
                      styles.dayHead,
                      (weekday === 0 || weekday === 6) && styles.weekend,
                      date === today && styles.todayHead
                    )}
                  >
                    <span className={styles.dayNumber}>{Number(date.slice(8))}</span>
                    <span className={styles.dayName}>{WEEKDAY_SHORT[(weekday + 6) % 7]}</span>
                  </th>
                );
              })}
              <th className={classNames(styles.totalCol, styles.headCell)} scope="col">
                Днів
              </th>
              <th className={classNames(styles.totalCol, styles.headCell)} scope="col">
                Годин
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map(({ schedule, days, stats }) => {
              const isSelected = schedule.groomerId === selectedId;
              return (
                <tr
                  key={schedule.groomerId}
                  className={classNames(isSelected && styles.rowSelected)}
                >
                  <th scope="row" className={styles.nameCol}>
                    <button
                      type="button"
                      className={styles.nameButton}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(schedule.groomerId)}
                    >
                      {schedule.name}
                      {!schedule.onlineBooking && (
                        <span className={styles.offlineBadge} title="Не приймає онлайн-записи">
                          офлайн
                        </span>
                      )}
                    </button>
                  </th>
                  {days.map((day) => {
                    const weekday = weekdayOf(day.date);
                    const text = cellText(day);
                    return (
                      <td
                        key={day.date}
                        className={classNames(
                          styles.cell,
                          (weekday === 0 || weekday === 6) && styles.weekend,
                          day.date === today && styles.todayCell
                        )}
                      >
                        <button
                          type="button"
                          className={classNames(styles.cellButton, styles[`kind_${day.kind}`])}
                          aria-label={`${schedule.name}, ${Number(day.date.slice(8))}: ${
                            text ? `${KIND_LABEL[day.kind]} ${text}` : 'вихідний'
                          }`}
                          onClick={() => openDay(schedule.groomerId, day)}
                        >
                          <CellContent day={day} />
                        </button>
                      </td>
                    );
                  })}
                  <td className={styles.total}>{stats.workDays}</td>
                  <td className={styles.total}>{String(stats.hours).replace('.', ',')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className={styles.legend}>
        {(Object.keys(KIND_LABEL) as DayKind[]).map((kind) => (
          <li key={kind} className={styles.legendItem}>
            <span className={classNames(styles.legendSwatch, styles[`kind_${kind}`])} />
            {KIND_LABEL[kind]}
          </li>
        ))}
        <li className={styles.legendItem}>
          <span className={classNames(styles.legendSwatch, styles.weekendSwatch)} />
          Субота й неділя
        </li>
      </ul>

      {selected && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Типовий тиждень · {selected.name}</h3>
            </div>

            <WeekEditor
              rows={rows}
              allowBreaks
              onChange={(next) => {
                setRows(next);
                setDirty(true);
              }}
            />

            <label className={styles.onlineToggle}>
              <span className={styles.switch}>
                <input
                  type="checkbox"
                  checked={online}
                  onChange={(e) => {
                    setOnline(e.target.checked);
                    setDirty(true);
                  }}
                />
                <span className={styles.switchTrack} aria-hidden="true" />
              </span>
              <span>
                <span className={styles.onlineLabel}>Доступна в онлайн-записі</span>
                <span className={styles.onlineHint}>
                  Вимкнено — на сайті до цього грумера записатись не можна.
                </span>
              </span>
            </label>

            {!rows.some((r) => r.enabled) && (
              <p className={styles.error}>Залиште хоча б один робочий день.</p>
            )}

            <div className={styles.saveRow}>
              <Button
                type="button"
                text={busy ? 'Зберігаємо…' : 'Зберегти графік'}
                disabled={busy || !dirty || !weekValid}
                onClick={() => void saveSchedule()}
              />
              <p className={styles.hint}>
                {selected.pendingWeekly
                  ? `Новий тиждень уже збережено, діє з ${formatDate(selected.pendingWeekly.effectiveFrom)}. `
                  : ''}
                Діє з наступного тижня, записи не зсуваються.
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>Відсутності та винятки</h3>
            </div>

            {absences.length === 0 ? (
              <p className={styles.hint}>
                Попереду винятків немає — грумер працює за типовим тижнем.
              </p>
            ) : (
              <ul className={styles.absences}>
                {absences.map((e) => (
                  <li key={e.id} className={styles.absence}>
                    <div className={styles.absenceMain}>
                      <span className={classNames(styles.typePill, styles[`type_${e.type}`])}>
                        {EXCEPTION_LABEL[e.type]}
                      </span>
                      <span className={styles.absenceWhen}>{exceptionWhen(e)}</span>
                      {e.note && <span className={styles.absenceNote}>{e.note}</span>}
                      <span className={styles.absenceMeta}>
                        {e.changedByName ? `Змінив(ла): ${e.changedByName}` : 'Змінено'}
                        {e.changedAt &&
                          `, ${new Intl.DateTimeFormat('uk-UA', {
                            day: 'numeric',
                            month: 'short',
                          }).format(new Date(e.changedAt))}`}
                      </span>
                      {(e.affectedOrders ?? 0) > 0 && (
                        <span className={styles.warning} role="note">
                          Зачіпає {ordersWord(e.affectedOrders!)} — перенесіть їх
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className={styles.removeButton}
                      aria-label={`Прибрати: ${EXCEPTION_LABEL[e.type]} ${exceptionWhen(e)}`}
                      disabled={busy}
                      onClick={() => void removeException(selected.groomerId, e)}
                    >
                      <Icon id={IconTypes.trash} width={16} height={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              type="button"
              variant="secondary"
              text="+ Відпустка, лікарняний або інші години"
              onClick={() => setRangeOpen(true)}
            />
          </div>
        </div>
      )}

      {daySheet && (
        <DaySheet
          day={daySheet.day}
          ordersCount={ordersCount}
          isGroomer={false}
          busy={busy}
          onClose={() => setDaySheet(null)}
          onSave={(choice, hours) => void saveDay(choice, hours)}
          onRemoveRange={(e) => void removeException(daySheet.groomerId, e)}
        />
      )}

      {rangeOpen && selected && (
        <RangeSheet
          initialDate={today}
          isGroomer={false}
          busy={busy}
          withCustomHours
          onClose={() => setRangeOpen(false)}
          onSave={(input) => void saveRange(input)}
        />
      )}

      {modal}
    </section>
  );
};

export default AdminSchedule;
