'use client';

import classNames from 'classnames';

import styles from './schedule-grid.module.scss';

type DayStripProps = {
  /** Обраний день, YYYY-MM-DD. */
  value: string;
  onChange: (date: string) => void;
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Понеділок тижня, у якому лежить дата. */
function weekStart(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const shift = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - shift);
  return date;
}

const monthLabel = (date: Date): string => {
  const formatted = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(
    date
  );
  // «Листопад 2026 р.» → «Листопад 2026»: у підписі стрипа «р.» зайве.
  const label = formatted.replace(/\s*р\.$/, '');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const DayStrip = ({ value, onChange }: DayStripProps) => {
  const start = weekStart(value);
  const today = toKey(new Date());

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { key: toKey(date), day: date.getDate(), label: WEEKDAYS[i]! };
  });

  const shiftWeek = (weeks: number) => {
    const date = weekStart(value);
    date.setDate(date.getDate() + weeks * 7);
    onChange(toKey(date));
  };

  return (
    <div className={styles.stripBox}>
      <p className={styles.stripMonth}>{monthLabel(start)}</p>

      <div className={styles.strip}>
        <button
          type="button"
          className={styles.stripArrow}
          onClick={() => shiftWeek(-1)}
          aria-label="Попередній тиждень"
        >
          ‹
        </button>

        <div className={styles.stripDays}>
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              className={classNames(styles.stripDay, {
                [styles.stripDayActive]: day.key === value,
                [styles.stripDayToday]: day.key === today && day.key !== value,
              })}
              onClick={() => onChange(day.key)}
              aria-current={day.key === value ? 'date' : undefined}
            >
              <span className={styles.stripWeekday}>{day.label}</span>
              <span className={styles.stripNumber}>{day.day}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.stripArrow}
          onClick={() => shiftWeek(1)}
          aria-label="Наступний тиждень"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default DayStrip;
