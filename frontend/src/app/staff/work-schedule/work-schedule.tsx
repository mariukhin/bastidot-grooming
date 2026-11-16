'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { ErrorState, LoadingState } from '@/components/account-state';
import useToastStore from '@/store/useToastStore';
import {
  addScheduleException,
  fetchAdminDay,
  fetchDaySchedule,
  fetchGroomerDay,
  fetchGroomerSchedule,
  removeScheduleException,
  saveWeeklySchedule,
  type ExceptionInput,
  type GroomerScheduleDetail,
  type ScheduleException,
} from '@/api/staff';

import { DaySheet, RangeSheet, type DayChoice } from './sheets';
import WeekEditor from './week-editor';
import { applyDayChoice } from './actions';
import {
  WEEKDAY_SHORT,
  fromWeekRows,
  monthGrid,
  monthStats,
  ordersWord,
  plural,
  resolveDay,
  toDateString,
  toWeekRows,
  rowError,
  formatDate,
  type DayInfo,
  type DayKind,
  type WeekRow,
} from './utils';
import styles from './work-schedule.module.scss';

type WorkScheduleProps = {
  /** Адмін обирає грумера чипами; грумер бачить і міняє лише свій графік. */
  role: 'admin' | 'groomer';
};

const KIND_LABEL: Record<DayKind, string> = {
  work: 'Робочий',
  custom: 'Інші години',
  vacation: 'Відпустка',
  off: 'Вихідний',
};

const monthTitle = (year: number, month: number) => {
  const title = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1)
  );
  return title.charAt(0).toUpperCase() + title.slice(1).replace(' р.', '');
};

const WorkSchedule = ({ role }: WorkScheduleProps) => {
  const isGroomer = role === 'groomer';
  const showToast = useToastStore((state) => state.showToast);
  const today = useMemo(() => toDateString(new Date()), []);

  const [groomers, setGroomers] = useState<{ id: string; name: string }[]>([]);
  const [groomerId, setGroomerId] = useState(isGroomer ? 'me' : '');
  const [schedule, setSchedule] = useState<GroomerScheduleDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [rows, setRows] = useState<WeekRow[]>([]);
  const [weekDirty, setWeekDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] = useState<DayInfo | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);

  // Адмін: список грумерів для чипів. Беремо з розкладу на сьогодні — там
  // усі, хто має прапорець грумера.
  useEffect(() => {
    if (isGroomer) return;
    let stale = false;
    void fetchDaySchedule(today).then((result) => {
      if (stale) return;
      if (!result.ok) {
        setMessage(result.message);
        setState('error');
        return;
      }
      const list = result.data.groomers.map((g) => ({ id: g.groomerId, name: g.name }));
      setGroomers(list);
      setGroomerId((current) => current || list[0]?.id || '');
      if (list.length === 0) setState('ready');
    });
    return () => {
      stale = true;
    };
  }, [isGroomer, today, attempt]);

  useEffect(() => {
    if (!groomerId) return;
    let stale = false;
    setState('loading');

    void fetchGroomerSchedule(groomerId).then((result) => {
      if (stale) return;
      if (!result.ok) {
        setMessage(result.message);
        setState('error');
        return;
      }
      setSchedule(result.data);
      setRows(toWeekRows(result.data.pendingWeekly?.weekly ?? result.data.weekly));
      setWeekDirty(false);
      setState('ready');
    });

    return () => {
      stale = true;
    };
  }, [groomerId, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const days = useMemo(() => {
    if (!schedule) return new Map<string, DayInfo>();
    return new Map(
      cells
        .filter((d): d is string => d !== null)
        .map((d) => [
          d,
          resolveDay(schedule.weekly, schedule.exceptions, d, schedule.pendingWeekly),
        ])
    );
  }, [cells, schedule]);
  const stats = useMemo(() => monthStats([...days.values()]), [days]);

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  const openDay = (day: DayInfo) => {
    setSelected(day);
    setOrdersCount(null);

    const id = schedule?.groomerId;
    const request = isGroomer ? fetchGroomerDay(day.date) : fetchAdminDay(day.date, id);
    void request.then((result) => {
      setOrdersCount(
        result.ok ? result.data.orders.filter((o) => o.status === 'pending').length : 0
      );
    });
  };

  const reportSaved = (affected: number) => {
    if (affected === 0) {
      showToast('Графік збережено');
    } else if (isGroomer) {
      showToast(`Збережено. Адміністратор перенесе ${ordersWord(affected)}.`);
    } else {
      showToast(`Збережено. ${ordersWord(affected)} поза графіком — перенесіть їх у «Подіях».`);
    }
  };

  const applyResult = (affected: number) => {
    reportSaved(affected);
    setSelected(null);
    setRangeOpen(false);
    reload();
  };

  const saveDay = async (choice: DayChoice, hours: { from: string; to: string }) => {
    if (!selected || !schedule) return;
    setBusy(true);
    const result = await applyDayChoice(groomerId, selected, choice, hours);
    setBusy(false);

    if (!result.ok) {
      showToast(result.message, 'error');
      reload();
      return;
    }
    applyResult(result.affected);
  };

  const removeRange = async (exception: ScheduleException) => {
    setBusy(true);
    const result = await removeScheduleException(groomerId, exception.id);
    setBusy(false);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    applyResult(result.data.affectedOrders);
  };

  const saveRange = async (input: ExceptionInput) => {
    setBusy(true);
    const result = await addScheduleException(groomerId, input);
    setBusy(false);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    applyResult(result.data.affectedOrders);
  };

  // Порожній шаблон бекенд читає як «щодня 09–20», тож тиждень без жодного
  // робочого дня зберегти не можна.
  const weekValid = rows.every((r) => !rowError(r)) && rows.some((r) => r.enabled);

  const saveWeek = async () => {
    setBusy(true);
    const result = await saveWeeklySchedule(groomerId, fromWeekRows(rows));
    setBusy(false);
    if (!result.ok) {
      showToast(result.message, 'error');
      return;
    }
    const when = formatDate(result.data.effectiveFrom);
    const affected = result.data.affectedOrders;
    showToast(
      affected === 0
        ? `Новий тиждень діє з ${when}`
        : `Новий тиждень діє з ${when}. ${ordersWord(affected)} поза графіком — ${
            isGroomer ? 'адміністратор їх перенесе' : 'перенесіть їх у «Подіях»'
          }.`
    );
    reload();
  };

  const upcoming = (schedule?.exceptions ?? []).filter(
    (e) => e.dateTo >= today && (e.type === 'vacation' || e.type === 'sick')
  );

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>{isGroomer ? 'Мій графік' : 'Графік роботи'}</h2>
          {isGroomer && (
            <p className={styles.subtitle}>Адміністратор отримає сповіщення про кожну зміну.</p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          text="+ Відпустка або лікарняний"
          disabled={state !== 'ready' || !schedule}
          onClick={() => setRangeOpen(true)}
        />
      </header>

      {!isGroomer && groomers.length > 0 && (
        <div className={styles.chips} role="tablist" aria-label="Грумер">
          {groomers.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === groomerId}
              className={classNames(styles.chip, g.id === groomerId && styles.chipActive)}
              onClick={() => setGroomerId(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {state === 'loading' && <LoadingState label="Завантажуємо графік" />}
      {state === 'error' && <ErrorState message={message} onRetry={reload} />}
      {state === 'ready' && !isGroomer && groomers.length === 0 && (
        <p className={styles.empty}>У салоні ще немає грумерів.</p>
      )}

      {state === 'ready' && schedule && (
        <div className={styles.layout}>
          <div className={styles.main}>
            {/* Цифри місяця — інструмент планування салону, грумеру вони не потрібні. */}
            {!isGroomer && (
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{stats.workDays}</span>
                  <span className={styles.statLabel}>
                    {plural(stats.workDays, 'робочий день', 'робочі дні', 'робочих днів')}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{String(stats.hours).replace('.', ',')}</span>
                  <span className={styles.statLabel}>
                    {plural(Math.floor(stats.hours), 'година', 'години', 'годин')} за місяць
                  </span>
                </div>
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.monthHead}>
                <button
                  type="button"
                  className={styles.monthNav}
                  onClick={() => shiftMonth(-1)}
                  aria-label="Попередній місяць"
                >
                  <Icon id={IconTypes.chevronLeft} width={18} height={18} />
                </button>
                <h3 className={styles.monthTitle}>{monthTitle(cursor.year, cursor.month)}</h3>
                <button
                  type="button"
                  className={styles.monthNav}
                  onClick={() => shiftMonth(1)}
                  aria-label="Наступний місяць"
                >
                  <Icon id={IconTypes.chevroneRight} width={18} height={18} />
                </button>
              </div>

              <div className={styles.calendar} role="grid" aria-label="Календар місяця">
                {WEEKDAY_SHORT.map((name) => (
                  <span key={name} className={styles.weekday} role="columnheader">
                    {name}
                  </span>
                ))}
                {cells.map((date, i) => {
                  if (!date) return <span key={`empty-${i}`} className={styles.cellEmpty} />;
                  const day = days.get(date)!;
                  const label = `${Number(date.slice(8))}, ${KIND_LABEL[day.kind]}${
                    day.kind === 'custom' && day.intervals[0]
                      ? ` ${day.intervals[0].from}–${day.intervals[0].to}`
                      : ''
                  }`;
                  return (
                    <button
                      key={date}
                      type="button"
                      role="gridcell"
                      className={classNames(
                        styles.cell,
                        styles[`cell_${day.kind}`],
                        date === today && styles.cellToday,
                        date < today && styles.cellPast
                      )}
                      aria-label={label}
                      aria-current={date === today ? 'date' : undefined}
                      onClick={() => openDay(day)}
                    >
                      <span className={styles.cellNumber}>{Number(date.slice(8))}</span>
                      {day.kind === 'custom' && day.intervals[0] && (
                        <span className={styles.cellHours}>
                          {day.intervals[0].from}–{day.intervals[0].to}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <ul className={styles.legend}>
                {(Object.keys(KIND_LABEL) as DayKind[]).map((kind) => (
                  <li key={kind} className={styles.legendItem}>
                    <span className={classNames(styles.legendDot, styles[`cell_${kind}`])} />
                    {KIND_LABEL[kind]}
                  </li>
                ))}
              </ul>
            </div>

            {upcoming.length > 0 && (
              <ul className={styles.absences}>
                {upcoming.map((e) => (
                  <li key={e.id} className={styles.absence}>
                    <span className={classNames(styles.legendDot, styles.cell_vacation)} />
                    <span>
                      {e.type === 'sick' ? 'Лікарняний' : 'Відпустка'}{' '}
                      {e.dateFrom === e.dateTo
                        ? e.dateFrom.split('-').reverse().join('.')
                        : `${e.dateFrom.split('-').reverse().join('.')} – ${e.dateTo
                            .split('-')
                            .reverse()
                            .join('.')}`}
                      {e.note && <span className={styles.absenceNote}> · {e.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Типовий тиждень</h3>
            <WeekEditor
              rows={rows}
              onChange={(next) => {
                setRows(next);
                setWeekDirty(true);
              }}
            />

            {!rows.some((r) => r.enabled) && (
              <p className={styles.sheetError}>Залиште хоча б один робочий день.</p>
            )}
            <p className={styles.sheetHint}>
              {schedule.pendingWeekly
                ? `Новий тиждень діє з ${formatDate(schedule.pendingWeekly.effectiveFrom)}. `
                : ''}
              Зміни діють з наступного понеділка, вже прийняті записи не зсуваються.
            </p>
            {weekDirty && (
              <div className={styles.weekActions}>
                <Button
                  type="button"
                  text={busy ? 'Зберігаємо…' : 'Зберегти тиждень'}
                  disabled={busy || !weekValid}
                  onClick={() => void saveWeek()}
                />
                <Button
                  type="button"
                  variant="link"
                  text="Скасувати"
                  disabled={busy}
                  onClick={() => {
                    setRows(toWeekRows(schedule.pendingWeekly?.weekly ?? schedule.weekly));
                    setWeekDirty(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {selected && (
        <DaySheet
          day={selected}
          ordersCount={ordersCount}
          isGroomer={isGroomer}
          busy={busy}
          onClose={() => setSelected(null)}
          onSave={(choice, hours) => void saveDay(choice, hours)}
          onRemoveRange={(e) => void removeRange(e)}
        />
      )}

      {rangeOpen && (
        <RangeSheet
          initialDate={today}
          isGroomer={isGroomer}
          busy={busy}
          onClose={() => setRangeOpen(false)}
          onSave={(input) => void saveRange(input)}
        />
      )}
    </section>
  );
};

export default WorkSchedule;
