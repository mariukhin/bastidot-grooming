import type { ReactNode } from 'react';

export type GridStatus = 'pending' | 'came' | 'completed' | 'cancelled' | 'no_show';

/** Як картка читається у сітці. Не те саме, що статус: «заплановано»
 *  розпадається на непідтверджений і підтверджений салоном. */
export type GridTone = 'new' | 'confirmed' | 'came' | 'done' | 'cancelled';

export const TONE_LABEL: Record<GridTone, string> = {
  new: 'новий',
  confirmed: 'підтверджено',
  came: 'прийшли',
  done: 'завершено',
  cancelled: 'скасовано',
};

export const LEGEND: { tone: GridTone; label: string }[] = [
  { tone: 'new', label: 'Новий (не підтверджений)' },
  { tone: 'confirmed', label: 'Підтверджений' },
  { tone: 'came', label: 'Прийшли' },
  { tone: 'done', label: 'Завершено' },
];

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
  tone: GridTone;
  /** Підпис пілюлі, коли стандартного мало: «не зʼявився». */
  label?: string;
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
