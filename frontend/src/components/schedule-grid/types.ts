import type { ReactNode } from 'react';

export type GridStatus = 'pending' | 'came' | 'completed' | 'cancelled' | 'no_show';

export type TimeRange = { from: string; to: string };

export type GridColumn = {
  id: string;
  title: string;
  photoUrl?: string | null;
  /** Робочі інтервали дня. Порожньо — колонка повністю неробоча. */
  intervals: TimeRange[];
};

export type GridEvent = {
  id: string;
  columnId: string;
  /** ISO-час початку. Позиція й висота рахуються з нього й тривалості. */
  scheduledAt: string;
  durationMinutes: number;
  status: GridStatus;
  /** Вміст картки готує екран: у грумера й адміна він різний. */
  content: ReactNode;
};

export const STATUS_LABEL: Record<GridStatus, string> = {
  pending: 'Заплановано',
  came: 'Прийшли',
  completed: 'Виконано',
  cancelled: 'Скасовано',
  no_show: 'Не зʼявився',
};

export const DEFAULT_FROM = '09:00';
export const DEFAULT_TO = '21:00';
/** Крок сітки у хвилинах: лінії частіше за півгодини лише засмічують день. */
export const STEP_MINUTES = 30;
