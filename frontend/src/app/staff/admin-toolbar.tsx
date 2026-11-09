'use client';

import classNames from 'classnames';

import { STATUS_LABEL, type GridStatus } from '@/components/schedule-grid';
import type { AdminStats, DaySchedule } from '@/api/staff';

import styles from './staff.module.scss';

/** Тиждень і Список — наступні ітерації, поки що вимкнені. */
const VIEWS = [
  { id: 'day', label: 'День', enabled: true },
  { id: 'week', label: 'Тиждень', enabled: false },
  { id: 'list', label: 'Список', enabled: false },
];

export const ViewSwitch = () => (
  <div className={styles.views} role="group" aria-label="Вигляд розкладу">
    {VIEWS.map((view) => (
      <button
        key={view.id}
        type="button"
        className={classNames(styles.view, view.enabled && styles.viewActive)}
        disabled={!view.enabled}
        aria-pressed={view.enabled}
        title={view.enabled ? undefined : 'Буде в наступній версії'}
      >
        {view.label}
      </button>
    ))}
  </div>
);

const money = (value: number) => `${value.toLocaleString('uk-UA')} грн`;

export const DayKpi = ({ stats }: { stats: AdminStats | null }) => {
  const tiles = [
    { label: 'Записи', value: stats ? String(stats.total) : '—' },
    { label: 'Чекають підтвердження', value: stats ? String(stats.unconfirmed) : '—' },
    { label: 'Завантаженість', value: stats ? `${Math.round(stats.utilization * 100)}%` : '—' },
    { label: 'Очікувана виручка', value: stats ? money(stats.expectedRevenue) : '—' },
  ];

  return (
    <dl className={styles.kpi}>
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.kpiTile}>
          <dt className={styles.kpiLabel}>{tile.label}</dt>
          <dd className={styles.kpiValue}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
};

type GroomerChipsProps = {
  groomers: DaySchedule[];
  /** Порожньо — показуємо всіх. */
  selected: string[];
  onChange: (next: string[]) => void;
};

export const GroomerChips = ({ groomers, selected, onChange }: GroomerChipsProps) => {
  if (groomers.length < 2) return null;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className={styles.chips} role="group" aria-label="Грумери">
      <button
        type="button"
        className={classNames(styles.chip, selected.length === 0 && styles.chipActive)}
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
      >
        Усі
      </button>
      {groomers.map((groomer) => (
        <button
          key={groomer.groomerId}
          type="button"
          className={classNames(
            styles.chip,
            selected.includes(groomer.groomerId) && styles.chipActive
          )}
          aria-pressed={selected.includes(groomer.groomerId)}
          onClick={() => toggle(groomer.groomerId)}
        >
          {groomer.name}
        </button>
      ))}
    </div>
  );
};

const LEGEND: GridStatus[] = ['pending', 'came', 'completed', 'no_show', 'cancelled'];

export const StatusLegend = () => (
  <ul className={styles.legend}>
    {LEGEND.map((status) => (
      <li key={status} className={styles.legendItem}>
        <span className={classNames(styles.legendDot, styles[`legendDot_${status}`])} />
        {STATUS_LABEL[status]}
      </li>
    ))}
  </ul>
);
